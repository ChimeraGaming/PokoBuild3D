import { getSupabaseClient, getSupabaseConfig } from '../supabase/client.js'
import {
  buildToSupabaseRows,
  createBuildFromDraft,
  supabaseRowsToBuild
} from './build-model.js'
import { applyBuildFilters } from './filter-builds.js'
import { normalizeUsername, slugify, uniqueId } from './format.js'
import {
  canAssignSpecialTags,
  normalizeFeaturedBadgeKey,
  normalizeSocials,
  normalizeSpecialTags
} from './profile.js'

function mapProfileRow(row, stats) {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    bio: row.bio,
    avatarUrl: row.avatar_url,
    socials: normalizeSocials(row.socials_json),
    specialTags: normalizeSpecialTags(row.special_tags_json),
    featuredBadgeKey: normalizeFeaturedBadgeKey(row.featured_badge_key),
    createdAt: row.created_at,
    buildCount: Number(stats?.buildCount || 0),
    chatCount: Number(stats?.chatCount || 0),
    favoritesCount: Number(stats?.favoritesCount || 0)
  }
}

function isMissingTableError(error, tableName) {
  return new RegExp(tableName, 'i').test(String(error?.message || ''))
}

async function fetchProfileStats(profileId) {
  var supabase = getSupabaseClient()
  var results = await Promise.all([
    supabase
      .from('builds')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profileId)
      .eq('is_published', true),
    supabase
      .from('favorites')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profileId),
    supabase
      .from('chat_messages')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profileId),
    supabase
      .from('direct_messages')
      .select('id', { count: 'exact', head: true })
      .eq('sender_id', profileId)
  ])

  if (results[0].error) {
    throw results[0].error
  }

  if (results[1].error) {
    throw results[1].error
  }

  if (results[2].error && !isMissingTableError(results[2].error, 'chat_messages')) {
    throw results[2].error
  }

  if (results[3].error && !isMissingTableError(results[3].error, 'direct_messages')) {
    throw results[3].error
  }

  return {
    buildCount: results[0].count || 0,
    favoritesCount: results[1].count || 0,
    chatCount:
      (results[2].error && isMissingTableError(results[2].error, 'chat_messages')
        ? 0
        : results[2].count || 0) +
      (results[3].error && isMissingTableError(results[3].error, 'direct_messages')
        ? 0
        : results[3].count || 0)
  }
}

async function fetchSupabaseAuthor(profileId) {
  var supabase = getSupabaseClient()
  var response = await supabase
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .maybeSingle()

  if (response.error) {
    throw response.error
  }

  if (!response.data) {
    return null
  }

  return mapProfileRow(response.data, await fetchProfileStats(response.data.id))
}

async function fetchBuildRelated(buildId) {
  var supabase = getSupabaseClient()
  var results = await Promise.all([
    supabase.from('build_images').select('*').eq('build_id', buildId).order('sort_order'),
    supabase.from('build_materials').select('*').eq('build_id', buildId).order('sort_order'),
    supabase.from('build_steps').select('*').eq('build_id', buildId).order('sort_order'),
    supabase.from('build_layers').select('*').eq('build_id', buildId).order('layer_index'),
    supabase.from('build_blocks').select('*').eq('build_id', buildId).order('y').order('z').order('x')
  ])

  results.forEach(function (result) {
    if (result.error) {
      throw result.error
    }
  })

  return {
    images: results[0].data || [],
    materials: results[1].data || [],
    steps: results[2].data || [],
    layers: results[3].data || [],
    blocks: results[4].data || []
  }
}

async function fetchProfileRowByUsername(supabase, username) {
  var requestedUsername = normalizeUsername(username)
  var response = await supabase
    .from('profiles')
    .select('*')
    .eq('username', requestedUsername)
    .maybeSingle()

  if (response.error) {
    throw response.error
  }

  if (response.data || !requestedUsername.startsWith('@')) {
    return response.data
  }

  response = await supabase
    .from('profiles')
    .select('*')
    .eq('username', requestedUsername.slice(1))
    .maybeSingle()

  if (response.error) {
    throw response.error
  }

  return response.data || null
}

function uploadPath(userId, file) {
  var baseName = file.name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-')
  var extension = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : ''
  return userId + '/' + Date.now() + '-' + baseName.replace(/^-+|-+$/g, '') + extension
}

function publicStorageUrl(bucket, path) {
  var supabase = getSupabaseClient()
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}

async function uploadToBucket(bucket, userId, file) {
  var supabase = getSupabaseClient()
  var path = uploadPath(userId, file)
  var result = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    cacheControl: '3600'
  })

  if (result.error) {
    throw result.error
  }

  return publicStorageUrl(bucket, result.data.path)
}

function normalizeProgress(record) {
  return {
    id: record.id,
    userId: record.userId || '',
    guestKey: '',
    buildId: record.buildId,
    percentComplete: Number(record.percentComplete || 0),
    gatheredJson: record.gatheredJson || {},
    lastLayerViewed: Number(record.lastLayerViewed || 0),
    updatedAt: record.updatedAt || new Date().toISOString()
  }
}

async function decorateChatMessages(rows) {
  var authorCache = {}

  return Promise.all(
    (rows || []).map(async function (row) {
      if (!authorCache[row.user_id]) {
        authorCache[row.user_id] = fetchSupabaseAuthor(row.user_id)
      }

      var author = await authorCache[row.user_id]

      return {
        id: row.id,
        userId: row.user_id,
        text: row.message_text,
        createdAt: row.created_at,
        author: author
      }
    })
  )
}

async function decorateDirectMessages(rows) {
  var authorCache = {}

  return Promise.all(
    (rows || []).map(async function (row) {
      if (!authorCache[row.sender_id]) {
        authorCache[row.sender_id] = fetchSupabaseAuthor(row.sender_id)
      }

      var author = await authorCache[row.sender_id]

      return {
        id: row.id,
        userId: row.sender_id,
        recipientId: row.recipient_id,
        text: row.message_text,
        createdAt: row.created_at,
        author: author
      }
    })
  )
}

function normalizeDirectMessageError(error) {
  var message = String(error?.message || '')

  if (/direct_messages/i.test(message)) {
    return new Error('Direct messages need the new chat SQL update first.')
  }

  return error
}

function findUnsupportedBuildColumn(error) {
  var message = String(error?.message || '')
  var supportedFallbackColumns = ['asset_kind', 'model_source', 'resource_links_json']

  return (
    supportedFallbackColumns.find(function (column) {
      return new RegExp(column, 'i').test(message)
    }) || ''
  )
}

async function upsertBuildRowWithFallback(supabase, buildRow) {
  var payload = { ...buildRow }
  var strippedColumns = new Set()

  while (true) {
    var response = await supabase.from('builds').upsert(payload)

    if (!response.error) {
      return response
    }

    var unsupportedColumn = findUnsupportedBuildColumn(response.error)

    if (!unsupportedColumn || strippedColumns.has(unsupportedColumn)) {
      throw response.error
    }

    strippedColumns.add(unsupportedColumn)
    delete payload[unsupportedColumn]
  }
}

export function createSupabaseApi() {
  return {
    backendMode: 'supabase',
    supabaseEnabled: true,
    async getSession() {
      var supabase = getSupabaseClient()
      var sessionResponse = await supabase.auth.getSession()

      if (sessionResponse.error) {
        throw sessionResponse.error
      }

      if (!sessionResponse.data.session) {
        return null
      }

      var user = sessionResponse.data.session.user
      var profile = await this.getProfileById(user.id)
      return {
        user: {
          id: user.id,
          email: user.email
        },
        profile: profile
      }
    },
    async signUp(values) {
      var supabase = getSupabaseClient()
      var username = normalizeUsername(values.username, values.displayName)

      if (!username) {
        throw new Error('Username is required.')
      }

      var existingProfile = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .maybeSingle()

      if (existingProfile.error && existingProfile.error.code !== 'PGRST116') {
        throw existingProfile.error
      }

      if (existingProfile.data) {
        throw new Error('That username is already taken.')
      }

      var response = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            username: username,
            display_name: values.displayName
          }
        }
      })

      if (response.error) {
        throw response.error
      }

      var session = await this.getSession()

      if (session) {
        return {
          ...session,
          pendingConfirmation: false
        }
      }

      return {
        user: response.data.user
          ? {
              id: response.data.user.id,
              email: response.data.user.email
            }
          : null,
        profile: null,
        pendingConfirmation: true
      }
    },
    async signIn(values) {
      var supabase = getSupabaseClient()
      var response = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password
      })

      if (response.error) {
        throw response.error
      }

      return this.getSession()
    },
    async signOut() {
      var supabase = getSupabaseClient()
      var response = await supabase.auth.signOut()

      if (response.error) {
        throw response.error
      }

      return true
    },
    async listBuilds(options) {
      var supabase = getSupabaseClient()
      var query = supabase.from('builds').select('*').order('created_at', { ascending: false })

      if (!options?.includeDrafts) {
        query = query.eq('is_published', true)
      }

      if (options?.profileId) {
        query = query.eq('user_id', options.profileId)
      }

      var response = await query

      if (response.error) {
        throw response.error
      }

      var rows = response.data || []
      var profiles = await Promise.all(
        rows.map(function (row) {
          return fetchSupabaseAuthor(row.user_id)
        })
      )
      var builds = await Promise.all(
        rows.map(async function (row, index) {
          var related = await fetchBuildRelated(row.id)
          return supabaseRowsToBuild(row, related, profiles[index])
        })
      )

      return applyBuildFilters(builds, options || {})
    },
    async getBuildBySlug(slug) {
      var supabase = getSupabaseClient()
      var response = await supabase
        .from('builds')
        .select('*')
        .eq('slug', slug)
        .maybeSingle()

      if (response.error) {
        throw response.error
      }

      if (!response.data) {
        return null
      }

      return supabaseRowsToBuild(
        response.data,
        await fetchBuildRelated(response.data.id),
        await fetchSupabaseAuthor(response.data.user_id)
      )
    },
    async getBuildById(buildId) {
      var supabase = getSupabaseClient()
      var response = await supabase
        .from('builds')
        .select('*')
        .eq('id', buildId)
        .maybeSingle()

      if (response.error) {
        throw response.error
      }

      if (!response.data) {
        return null
      }

      return supabaseRowsToBuild(
        response.data,
        await fetchBuildRelated(response.data.id),
        await fetchSupabaseAuthor(response.data.user_id)
      )
    },
    async saveBuild(input, sessionProfile) {
      var supabase = getSupabaseClient()
      var nextBuild = createBuildFromDraft(input, sessionProfile.id)
      var rows = buildToSupabaseRows(nextBuild)
      var upsert = await upsertBuildRowWithFallback(supabase, rows.build)

      if (upsert.error) {
        throw upsert.error
      }

      var deletes = await Promise.all([
        supabase.from('build_images').delete().eq('build_id', nextBuild.id),
        supabase.from('build_materials').delete().eq('build_id', nextBuild.id),
        supabase.from('build_steps').delete().eq('build_id', nextBuild.id),
        supabase.from('build_layers').delete().eq('build_id', nextBuild.id),
        supabase.from('build_blocks').delete().eq('build_id', nextBuild.id)
      ])

      deletes.forEach(function (result) {
        if (result.error) {
          throw result.error
        }
      })

      if (rows.images.length) {
        var imagesInsert = await supabase.from('build_images').insert(rows.images)
        if (imagesInsert.error) {
          throw imagesInsert.error
        }
      }

      if (rows.materials.length) {
        var materialsInsert = await supabase.from('build_materials').insert(rows.materials)
        if (materialsInsert.error) {
          throw materialsInsert.error
        }
      }

      if (rows.steps.length) {
        var stepsInsert = await supabase.from('build_steps').insert(rows.steps)
        if (stepsInsert.error) {
          throw stepsInsert.error
        }
      }

      if (rows.layers.length) {
        var layersInsert = await supabase.from('build_layers').insert(rows.layers)
        if (layersInsert.error) {
          throw layersInsert.error
        }
      }

      if (rows.blocks.length) {
        var blocksInsert = await supabase.from('build_blocks').insert(rows.blocks)
        if (blocksInsert.error) {
          throw blocksInsert.error
        }
      }

      if (nextBuild.originalBuildId) {
        var remixInsert = await supabase.from('build_remixes').upsert({
          id: 'remix:' + nextBuild.originalBuildId + ':' + nextBuild.id,
          original_build_id: nextBuild.originalBuildId,
          remixed_build_id: nextBuild.id,
          created_at: new Date().toISOString()
        })

        if (remixInsert.error) {
          throw remixInsert.error
        }
      }

      return this.getBuildById(nextBuild.id)
    },
    async listBuildsByUser(profileId) {
      return this.listBuilds({
        includeDrafts: true,
        profileId: profileId
      })
    },
    async getProfileByUsername(username) {
      var supabase = getSupabaseClient()
      var profileRow = await fetchProfileRowByUsername(supabase, username)
      return profileRow ? this.getProfileById(profileRow.id) : null
    },
    async getProfileById(profileId) {
      var supabase = getSupabaseClient()
      var response = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .maybeSingle()

      if (response.error) {
        throw response.error
      }

      if (!response.data) {
        return null
      }

      return mapProfileRow(response.data, await fetchProfileStats(profileId))
    },
    async listProfiles() {
      var supabase = getSupabaseClient()
      var response = await supabase
        .from('profiles')
        .select('*')
        .order('display_name', { ascending: true })

      if (response.error) {
        throw response.error
      }

      return (response.data || []).map(function (row) {
        return {
          id: row.id,
          username: row.username,
          displayName: row.display_name,
          bio: row.bio,
          avatarUrl: row.avatar_url,
          socials: normalizeSocials(row.socials_json),
          specialTags: normalizeSpecialTags(row.special_tags_json),
          featuredBadgeKey: normalizeFeaturedBadgeKey(row.featured_badge_key),
          createdAt: row.created_at
        }
      })
    },
    async updateProfile(profileId, values) {
      var supabase = getSupabaseClient()
      var username = normalizeUsername(values.username)
      var nextPayload

      if (!username) {
        throw new Error('Username is required.')
      }

      nextPayload = {
        id: profileId,
        username: username,
        display_name: values.displayName,
        bio: values.bio,
        avatar_url: values.avatarUrl,
        socials_json: normalizeSocials(values.socials)
      }

      if (values.featuredBadgeKey !== undefined) {
        nextPayload.featured_badge_key = normalizeFeaturedBadgeKey(values.featuredBadgeKey)
      }

      var response = await supabase.from('profiles').upsert(nextPayload)

      if (response.error) {
        throw response.error
      }

      return this.getProfileById(profileId)
    },
    async setProfileSpecialTags(profileId, specialTags, actingProfile) {
      var supabase = getSupabaseClient()

      if (!canAssignSpecialTags(actingProfile)) {
        throw new Error('Only the owner can change special tags.')
      }

      var response = await supabase.rpc('set_profile_special_tags', {
        target_profile_id: profileId,
        next_tags: normalizeSpecialTags(specialTags)
      })

      if (response.error) {
        throw response.error
      }

      return this.getProfileById(profileId)
    },
    async toggleFavorite(buildId, profileId) {
      var supabase = getSupabaseClient()
      var existing = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', profileId)
        .eq('build_id', buildId)
        .maybeSingle()

      if (existing.error && existing.error.code !== 'PGRST116') {
        throw existing.error
      }

      if (existing.data) {
        var deleted = await supabase.from('favorites').delete().eq('id', existing.data.id)
        if (deleted.error) {
          throw deleted.error
        }
        return false
      }

      var inserted = await supabase.from('favorites').insert({
        id: uniqueId('favorite'),
        user_id: profileId,
        build_id: buildId,
        created_at: new Date().toISOString()
      })

      if (inserted.error) {
        throw inserted.error
      }

      return true
    },
    async isFavorited(buildId, profileId) {
      var supabase = getSupabaseClient()
      var response = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', profileId)
        .eq('build_id', buildId)
        .maybeSingle()

      if (response.error && response.error.code !== 'PGRST116') {
        throw response.error
      }

      return Boolean(response.data)
    },
    async listFavoriteBuilds(profileId) {
      var supabase = getSupabaseClient()
      var favoriteRows = await supabase
        .from('favorites')
        .select('build_id')
        .eq('user_id', profileId)

      if (favoriteRows.error) {
        throw favoriteRows.error
      }

      var ids = (favoriteRows.data || []).map(function (row) {
        return row.build_id
      })

      if (!ids.length) {
        return []
      }

      var builds = await this.listBuilds({ includeDrafts: true })
      return builds.filter(function (build) {
        return ids.includes(build.id)
      })
    },
    async getProgress(buildId, profileId) {
      if (!profileId) {
        return null
      }

      var supabase = getSupabaseClient()
      var response = await supabase
        .from('build_progress')
        .select('*')
        .eq('user_id', profileId)
        .eq('build_id', buildId)
        .maybeSingle()

      if (response.error && response.error.code !== 'PGRST116') {
        throw response.error
      }

      return response.data
        ? normalizeProgress({
            id: response.data.id,
            userId: response.data.user_id,
            buildId: response.data.build_id,
            percentComplete: response.data.percent_complete,
            gatheredJson: response.data.gathered_json,
            lastLayerViewed: response.data.last_layer_viewed,
            updatedAt: response.data.updated_at
          })
        : null
    },
    async saveProgress(buildId, profileId, values) {
      var supabase = getSupabaseClient()
      var response = await supabase.from('build_progress').upsert({
        id: 'progress:' + profileId + ':' + buildId,
        user_id: profileId,
        build_id: buildId,
        percent_complete: values.percentComplete,
        gathered_json: values.gatheredJson,
        last_layer_viewed: values.lastLayerViewed,
        updated_at: new Date().toISOString()
      })

      if (response.error) {
        throw response.error
      }

      return this.getProgress(buildId, profileId)
    },
    async deleteBuild(buildId, sessionProfile) {
      var supabase = getSupabaseClient()

      if (!sessionProfile) {
        throw new Error('Sign in to remove a post.')
      }

      var query = supabase.from('builds').delete({ count: 'exact' }).eq('id', buildId)

      if (!canAssignSpecialTags(sessionProfile)) {
        query = query.eq('user_id', sessionProfile.id)
      }

      var response = await query

      if (response.error) {
        throw response.error
      }

      if (!response.count) {
        throw new Error('That post could not be found or could not be removed.')
      }

      return true
    },
    async remixBuild(build, sessionProfile) {
      return this.saveBuild(
        {
          ...build,
          id: uniqueId('build'),
          slug: slugify(build.title + ' remix'),
          title: build.title + ' Remix',
          originalBuildId: build.originalBuildId || build.id,
          isPublished: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        sessionProfile
      )
    },
    async uploadAsset(file, kind, userId) {
      var buckets = getSupabaseConfig()

      if (kind === 'avatar') {
        return uploadToBucket(buckets.avatarsBucket, userId, file)
      }

      if (kind === 'model') {
        return uploadToBucket(buckets.modelsBucket, userId, file)
      }

      return uploadToBucket(buckets.imagesBucket, userId, file)
    },
    async listChatMessages() {
      var supabase = getSupabaseClient()
      var response = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (response.error) {
        throw response.error
      }

      return decorateChatMessages((response.data || []).slice().reverse())
    },
    async sendChatMessage(text, sessionProfile) {
      var supabase = getSupabaseClient()
      var messageText = String(text || '').trim()

      if (!sessionProfile) {
        throw new Error('Sign in to join the live chat.')
      }

      if (!messageText) {
        throw new Error('Write a message before sending it.')
      }

      var response = await supabase
        .from('chat_messages')
        .insert({
          id: uniqueId('chat'),
          user_id: sessionProfile.id,
          message_text: messageText,
          created_at: new Date().toISOString()
        })
        .select('*')
        .single()

      if (response.error) {
        throw response.error
      }

      return (await decorateChatMessages([response.data]))[0]
    },
    async listDirectMessages(recipientId, sessionProfile) {
      var supabase = getSupabaseClient()

      if (!sessionProfile) {
        throw new Error('Sign in to use direct messages.')
      }

      if (!recipientId) {
        return []
      }

      var response = await supabase
        .from('direct_messages')
        .select('*')
        .or(
          'and(sender_id.eq.' +
            sessionProfile.id +
            ',recipient_id.eq.' +
            recipientId +
            '),and(sender_id.eq.' +
            recipientId +
            ',recipient_id.eq.' +
            sessionProfile.id +
            ')'
        )
        .order('created_at', { ascending: true })

      if (response.error) {
        throw normalizeDirectMessageError(response.error)
      }

      return decorateDirectMessages(response.data || [])
    },
    async listDirectConversations(sessionProfile) {
      var supabase = getSupabaseClient()
      var profileCache = {}

      if (!sessionProfile) {
        throw new Error('Sign in to use direct messages.')
      }

      var response = await supabase
        .from('direct_messages')
        .select('*')
        .or('sender_id.eq.' + sessionProfile.id + ',recipient_id.eq.' + sessionProfile.id)
        .order('created_at', { ascending: false })

      if (response.error) {
        throw normalizeDirectMessageError(response.error)
      }

      var latestByProfile = new Map()

      ;(response.data || []).forEach(function (message) {
        var partnerId =
          message.sender_id === sessionProfile.id ? message.recipient_id : message.sender_id

        if (!partnerId || latestByProfile.has(partnerId)) {
          return
        }

        latestByProfile.set(partnerId, message)
      })

      return Promise.all(
        Array.from(latestByProfile.entries()).map(async function (entry) {
          if (!profileCache[entry[0]]) {
            profileCache[entry[0]] = fetchSupabaseAuthor(entry[0])
          }

          var profile = await profileCache[entry[0]]

          if (!profile) {
            return null
          }

          return {
            profile: profile,
            lastMessage: String(entry[1].message_text || '').trim(),
            lastMessageAt: entry[1].created_at
          }
        })
      ).then(function (items) {
        return items.filter(Boolean)
      })
    },
    async sendDirectMessage(recipientId, text, sessionProfile) {
      var supabase = getSupabaseClient()
      var messageText = String(text || '').trim()

      if (!sessionProfile) {
        throw new Error('Sign in to use direct messages.')
      }

      if (!recipientId) {
        throw new Error('Choose a Ditto before sending a DM.')
      }

      if (recipientId === sessionProfile.id) {
        throw new Error('Choose another Ditto for a DM.')
      }

      if (!messageText) {
        throw new Error('Write a message before sending it.')
      }

      var response = await supabase
        .from('direct_messages')
        .insert({
          id: uniqueId('dm'),
          sender_id: sessionProfile.id,
          recipient_id: recipientId,
          message_text: messageText,
          created_at: new Date().toISOString()
        })
        .select('*')
        .single()

      if (response.error) {
        throw normalizeDirectMessageError(response.error)
      }

      return (await decorateDirectMessages([response.data]))[0]
    },
    subscribeToChatMessages(callback) {
      var supabase = getSupabaseClient()
      var channel = supabase
        .channel('public:chat_messages')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'chat_messages'
          },
          function () {
            callback()
          }
        )
        .subscribe()

      return function cleanup() {
        supabase.removeChannel(channel)
      }
    },
    subscribeToDirectMessages(profileId, callback) {
      var supabase = getSupabaseClient()
      var channel = supabase
        .channel('direct_messages:' + profileId)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'direct_messages'
          },
          function (payload) {
            var row = payload.new?.sender_id ? payload.new : payload.old || {}

            if (row.sender_id === profileId || row.recipient_id === profileId) {
              callback()
            }
          }
        )
        .subscribe()

      return function cleanup() {
        supabase.removeChannel(channel)
      }
    }
  }
}
