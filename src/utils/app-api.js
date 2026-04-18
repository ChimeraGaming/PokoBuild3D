import { createEditorPayload } from '../editor/piece-library.js'
import { getSupabaseConfig } from '../supabase/client.js'
import { splitTags } from './build-model.js'
import { slugify, uniqueId } from './format.js'
import { createLocalApi } from './local-api.js'
import { readStorage, writeStorage } from './storage.js'
import { createSupabaseApi } from './supabase-api.js'
import { gridFromTemplateSize, normalizeTemplateSize } from './template-size.js'

var CHAT_FALLBACK_KEY = 'pokobuilds3d:fallback-chat-messages'
var CHAT_PROGRESS_KEY = 'pokobuilds3d:chat-progress-counts'
var CHAT_LOG_LIMIT = 100

function isMissingChatTableError(error) {
  var message = String(error?.message || '')
  var details = String(error?.details || '')
  var hint = String(error?.hint || '')

  return (
    error?.code === 'PGRST205' ||
    (/chat_messages/i.test(message) && /schema cache/i.test(message)) ||
    /chat_messages/i.test(details) ||
    /chat_messages/i.test(hint)
  )
}

function normalizeChatAuthor(profile) {
  if (!profile) {
    return null
  }

  return {
    id: profile.id || '',
    username: profile.username || '',
    displayName: profile.displayName || profile.username || '',
    avatarUrl: profile.avatarUrl || ''
  }
}

function readFallbackChatMessages() {
  return (readStorage(CHAT_FALLBACK_KEY, []) || [])
    .filter(function (message) {
      return message && message.id && message.text
    })
    .sort(function (left, right) {
      return new Date(left.createdAt) - new Date(right.createdAt)
    })
    .slice(-CHAT_LOG_LIMIT)
}

function writeFallbackChatMessages(messages) {
  writeStorage(CHAT_FALLBACK_KEY, messages)
}

function readChatProgressCounts() {
  var saved = readStorage(CHAT_PROGRESS_KEY, {})

  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) {
    return {}
  }

  return Object.keys(saved).reduce(function (counts, profileId) {
    if (!profileId) {
      return counts
    }

    counts[profileId] = Math.max(0, Number(saved[profileId] || 0))
    return counts
  }, {})
}

function writeChatProgressCounts(counts) {
  writeStorage(CHAT_PROGRESS_KEY, counts)
}

function countFallbackMessagesForProfile(profileId) {
  if (!profileId) {
    return 0
  }

  return readFallbackChatMessages().filter(function (message) {
    return message.userId === profileId
  }).length
}

function getTrackedChatCount(profileId) {
  var counts = readChatProgressCounts()

  return Math.max(Number(counts[profileId] || 0), countFallbackMessagesForProfile(profileId))
}

function syncTrackedChatCount(profile) {
  var counts
  var nextCount

  if (!profile?.id) {
    return profile
  }

  counts = readChatProgressCounts()
  nextCount = Math.max(
    Number(profile.chatCount || 0),
    Number(counts[profile.id] || 0),
    countFallbackMessagesForProfile(profile.id)
  )

  if (nextCount > Number(counts[profile.id] || 0)) {
    counts[profile.id] = nextCount
    writeChatProgressCounts(counts)
  }

  return {
    ...profile,
    chatCount: nextCount
  }
}

function applyTrackedChatCount(profile) {
  return profile?.id ? syncTrackedChatCount(profile) : profile
}

function applyTrackedChatCountToSession(session) {
  if (!session?.profile) {
    return session
  }

  return {
    ...session,
    profile: applyTrackedChatCount(session.profile)
  }
}

function recordSuccessfulMessage(profileId) {
  var counts

  if (!profileId) {
    return
  }

  counts = readChatProgressCounts()
  counts[profileId] = Math.max(getTrackedChatCount(profileId), Number(counts[profileId] || 0)) + 1
  writeChatProgressCounts(counts)
}

export function createAppApi() {
  var config = getSupabaseConfig()
  var api = config.configured ? createSupabaseApi() : createLocalApi()
  var chatFallbackActive = false

  return {
    ...api,
    async uploadGalleryFiles(files, sessionProfile) {
      var urls = []
      var fileList = Array.from(files || [])
      var index

      for (index = 0; index < fileList.length; index += 1) {
        urls.push(await api.uploadAsset(fileList[index], 'image', sessionProfile.id))
      }

      return urls
    },
    async uploadModelFile(file, sessionProfile) {
      if (!file) {
        return ''
      }

      return api.uploadAsset(file, 'model', sessionProfile.id)
    },
    async uploadAvatar(file, sessionProfile) {
      if (!file) {
        return ''
      }

      return api.uploadAsset(file, 'avatar', sessionProfile.id)
    },
    async getSession() {
      return applyTrackedChatCountToSession(await api.getSession())
    },
    async getProfileById(profileId) {
      return applyTrackedChatCount(await api.getProfileById(profileId))
    },
    async getProfileByUsername(username) {
      return applyTrackedChatCount(await api.getProfileByUsername(username))
    },
    async listChatMessages() {
      if (!config.configured || api.backendMode !== 'supabase') {
        return api.listChatMessages()
      }

      if (chatFallbackActive) {
        return readFallbackChatMessages()
      }

      try {
        return await api.listChatMessages()
      } catch (error) {
        if (isMissingChatTableError(error)) {
          chatFallbackActive = true
          return readFallbackChatMessages()
        }

        throw error
      }
    },
    async sendChatMessage(text, sessionProfile) {
      var message

      if (!config.configured || api.backendMode !== 'supabase') {
        message = await api.sendChatMessage(text, sessionProfile)
        recordSuccessfulMessage(sessionProfile?.id)
        return message
      }

      if (chatFallbackActive) {
        var fallbackText = String(text || '').trim()

        if (!sessionProfile) {
          throw new Error('Sign in to join the live chat.')
        }

        if (!fallbackText) {
          throw new Error('Write a message before sending it.')
        }

        var nextMessage = {
          id: uniqueId('chat'),
          userId: sessionProfile.id,
          text: fallbackText,
          createdAt: new Date().toISOString(),
          author: normalizeChatAuthor(sessionProfile)
        }
        var messages = readFallbackChatMessages()

        messages.push(nextMessage)
        writeFallbackChatMessages(messages.slice(-CHAT_LOG_LIMIT))
        recordSuccessfulMessage(sessionProfile.id)
        return nextMessage
      }

      try {
        message = await api.sendChatMessage(text, sessionProfile)
        recordSuccessfulMessage(sessionProfile?.id)
        return message
      } catch (error) {
        if (isMissingChatTableError(error)) {
          chatFallbackActive = true
          return this.sendChatMessage(text, sessionProfile)
        }

        throw error
      }
    },
    async sendDirectMessage(recipientId, text, sessionProfile) {
      var message = await api.sendDirectMessage(recipientId, text, sessionProfile)
      recordSuccessfulMessage(sessionProfile?.id)
      return message
    },
    subscribeToChatMessages(callback) {
      if (!config.configured || api.backendMode !== 'supabase') {
        return typeof api.subscribeToChatMessages === 'function'
          ? api.subscribeToChatMessages(callback)
          : function () {}
      }

      if (chatFallbackActive) {
        function handleStorage(event) {
          if (event.key === CHAT_FALLBACK_KEY) {
            callback()
          }
        }

        window.addEventListener('storage', handleStorage)

        return function cleanup() {
          window.removeEventListener('storage', handleStorage)
        }
      }

      try {
        return api.subscribeToChatMessages(callback)
      } catch (error) {
        if (isMissingChatTableError(error)) {
          chatFallbackActive = true
          return this.subscribeToChatMessages(callback)
        }

        throw error
      }
    },
    createDraftFromTemplate(values) {
      var assetKind = values.assetKind

      if (!assetKind) {
        if (values.modelType === 'picture') {
          assetKind = 'picture'
        } else if (values.modelType === 'real3d') {
          assetKind = 'real3d'
        } else if (values.modelType === 'tips') {
          assetKind = 'tips'
        } else {
          assetKind = 'model'
        }
      }

      var modelSource =
        values.modelSource ||
        (values.modelType === 'viewer' ? 'upload' : assetKind === 'model' ? 'editor' : assetKind)
      var templateSize = normalizeTemplateSize(values.templateSize, values.editorDataJson?.grid)
      var templateGrid = gridFromTemplateSize(templateSize)

      return {
        id: values.id || '',
        slug: values.slug || slugify(values.title),
        title: values.title || '',
        description: values.description || '',
        biome: values.biome || '',
        category: values.category || values.biome || '',
        difficulty: values.difficulty || 'easy',
        tags: splitTags(values.tags || []),
        thumbnailUrl: values.thumbnailUrl || '',
        imageGallery: values.imageGallery || [],
        materials: values.materials || [],
        steps: values.steps || [],
        modelType: values.modelType || 'editor',
        modelUrl: values.modelUrl || '',
        resourceLinks: values.resourceLinks || [],
        editorDataJson:
          values.editorDataJson ||
          createEditorPayload(values.id || uniqueId('build'), {
            pieces: [],
            grid: templateGrid,
            layerMeta: {},
            notes: values.description || ''
          }),
        layerData: values.layerData || [],
        originalBuildId: values.originalBuildId || '',
        isPublished: Boolean(values.isPublished),
        assetKind: assetKind,
        modelSource: modelSource,
        originType: values.originType || 'my',
        creatorKnown: Boolean(values.creatorKnown),
        originalCreator: values.originalCreator || '',
        location: values.location || values.biome || '',
        extraTags: values.extraTags || '',
        templateSize: templateSize
      }
    }
  }
}
