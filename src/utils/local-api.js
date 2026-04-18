import { demoBuilds } from '../data/demo-builds.js'
import { demoProfiles } from '../data/demo-profiles.js'
import { normalizeBuildRecord, createBuildFromDraft } from './build-model.js'
import { applyBuildFilters } from './filter-builds.js'
import { normalizeUsername, slugify, uniqueId } from './format.js'
import {
  canAssignSpecialTags,
  canRemoveBuild,
  normalizeSocials,
  normalizeSpecialTags
} from './profile.js'
import { fileToDataUrl, readStorage, removeStorage, writeStorage } from './storage.js'

export var STORAGE_KEYS = {
  users: 'pokobuilds3d:users',
  session: 'pokobuilds3d:session',
  profiles: 'pokobuilds3d:profiles',
  builds: 'pokobuilds3d:builds',
  favorites: 'pokobuilds3d:favorites',
  progress: 'pokobuilds3d:progress',
  chatMessages: 'pokobuilds3d:chat-messages'
}

function clone(value) {
  return structuredClone(value)
}

function createGuestProgressKey() {
  return 'guest-local'
}

function seedChatMessages() {
  return [
    {
      id: 'chat-seed-1',
      userId: 'profile-elm',
      text: 'Welcome to the builder chat. Share where your latest build is going and what materials are slowing you down.',
      createdAt: '2026-04-15T18:20:00.000Z'
    },
    {
      id: 'chat-seed-2',
      userId: 'profile-wren',
      text: 'If you are posting an online creation, remember to credit the original owner in the tags before you publish.',
      createdAt: '2026-04-15T18:24:00.000Z'
    }
  ]
}

export function ensureLocalSeed() {
  if (!readStorage(STORAGE_KEYS.profiles, null)) {
    writeStorage(STORAGE_KEYS.profiles, clone(demoProfiles))
  }

  if (!readStorage(STORAGE_KEYS.builds, null)) {
    writeStorage(STORAGE_KEYS.builds, clone(demoBuilds))
  }

  if (!readStorage(STORAGE_KEYS.users, null)) {
    writeStorage(
      STORAGE_KEYS.users,
      demoProfiles.map(function (profile, index) {
        return {
          id: 'user-seed-' + index,
          profileId: profile.id,
          email: profile.email,
          password: 'pokopia-demo',
          createdAt: profile.createdAt
        }
      })
    )
  }

  if (!readStorage(STORAGE_KEYS.favorites, null)) {
    writeStorage(STORAGE_KEYS.favorites, [])
  }

  if (!readStorage(STORAGE_KEYS.progress, null)) {
    writeStorage(STORAGE_KEYS.progress, [])
  }

  if (!readStorage(STORAGE_KEYS.chatMessages, null)) {
    writeStorage(STORAGE_KEYS.chatMessages, seedChatMessages())
  }
}

function readLocalCollection(key) {
  ensureLocalSeed()
  return clone(readStorage(key, []))
}

function writeLocalCollection(key, value) {
  return writeStorage(key, value)
}

function localSession() {
  return readStorage(STORAGE_KEYS.session, null)
}

function applyOwnerBootstrap(tags, username) {
  var normalizedUsername = String(username || '').trim().toLowerCase()
  var nextTags = Array.isArray(tags) ? tags.slice() : []

  if (normalizedUsername === '@chimeragaming' || normalizedUsername === 'chimeragaming') {
    nextTags.push('Owner')
  }

  return normalizeSpecialTags(nextTags)
}

function findProfileByUsername(profiles, username) {
  var requestedUsername = normalizeUsername(username)
  var exactMatch = profiles.find(function (candidate) {
    return candidate.username === requestedUsername
  })

  if (exactMatch || !requestedUsername.startsWith('@')) {
    return exactMatch || null
  }

  return (
    profiles.find(function (candidate) {
      return candidate.username === requestedUsername.slice(1)
    }) || null
  )
}

function decorateBuild(build, profiles, favorites) {
  var author = profiles.find(function (profile) {
    return profile.id === build.userId
  })
  var favoriteCount = favorites.filter(function (favorite) {
    return favorite.buildId === build.id
  }).length
  var normalized = normalizeBuildRecord(build)
  normalized.author = author || null
  normalized.favoriteCount = favoriteCount || normalized.favoriteCount || 0
  return normalized
}

function decorateProfile(profile, builds, favorites) {
  return {
    id: profile.id,
    username: profile.username,
    displayName: profile.displayName,
    bio: profile.bio,
    avatarUrl: profile.avatarUrl,
    socials: normalizeSocials(profile.socials),
    specialTags: applyOwnerBootstrap(profile.specialTags, profile.username),
    createdAt: profile.createdAt,
    buildCount: builds.filter(function (build) {
      return build.userId === profile.id && build.isPublished
    }).length,
    favoritesCount: favorites.filter(function (favorite) {
      return favorite.userId === profile.id
    }).length
  }
}

function normalizeProgress(record) {
  return {
    id: record.id,
    userId: record.userId || '',
    guestKey: record.guestKey || '',
    buildId: record.buildId,
    percentComplete: Number(record.percentComplete || 0),
    gatheredJson: record.gatheredJson || {},
    lastLayerViewed: Number(record.lastLayerViewed || 0),
    updatedAt: record.updatedAt || new Date().toISOString()
  }
}

function decorateChatMessage(message, profiles) {
  var author = profiles.find(function (profile) {
    return profile.id === message.userId
  })

  return {
    id: message.id,
    userId: message.userId,
    text: message.text,
    createdAt: message.createdAt,
    author: author
      ? {
          id: author.id,
          username: author.username,
          displayName: author.displayName,
          avatarUrl: author.avatarUrl
        }
      : null
  }
}

export function createLocalApi() {
  ensureLocalSeed()

  return {
    backendMode: 'local',
    supabaseEnabled: false,
    async getSession() {
      var session = localSession()

      if (!session) {
        return null
      }

      var profiles = readLocalCollection(STORAGE_KEYS.profiles)
      var profile = profiles.find(function (candidate) {
        return candidate.id === session.profileId
      })

      return profile
        ? {
            user: {
              id: session.userId,
              email: session.email
            },
            profile: decorateProfile(
              profile,
              readLocalCollection(STORAGE_KEYS.builds),
              readLocalCollection(STORAGE_KEYS.favorites)
            )
          }
        : null
    },
    async signUp(values) {
      var users = readLocalCollection(STORAGE_KEYS.users)
      var profiles = readLocalCollection(STORAGE_KEYS.profiles)
      var username = normalizeUsername(values.username, values.displayName)

      if (!username) {
        throw new Error('Username is required.')
      }

      if (
        users.find(function (user) {
          return user.email.toLowerCase() === values.email.toLowerCase()
        })
      ) {
        throw new Error('An account with that email already exists.')
      }

      if (
        profiles.find(function (profile) {
          return profile.username.toLowerCase() === username.toLowerCase()
        })
      ) {
        throw new Error('That username is already taken.')
      }

      var profile = {
        id: uniqueId('profile'),
        email: values.email,
        username: username,
        displayName: values.displayName,
        bio: '',
        avatarUrl: '',
        socials: [],
        specialTags: applyOwnerBootstrap([], username),
        createdAt: new Date().toISOString()
      }
      var user = {
        id: uniqueId('user'),
        profileId: profile.id,
        email: values.email,
        password: values.password,
        createdAt: profile.createdAt
      }

      users.push(user)
      profiles.push(profile)
      writeLocalCollection(STORAGE_KEYS.users, users)
      writeLocalCollection(STORAGE_KEYS.profiles, profiles)
      writeStorage(STORAGE_KEYS.session, {
        userId: user.id,
        profileId: profile.id,
        email: user.email
      })

      return {
        ...(await this.getSession()),
        pendingConfirmation: false
      }
    },
    async signIn(values) {
      var users = readLocalCollection(STORAGE_KEYS.users)
      var user = users.find(function (candidate) {
        return (
          candidate.email.toLowerCase() === values.email.toLowerCase() &&
          candidate.password === values.password
        )
      })

      if (!user) {
        throw new Error('Incorrect email or password.')
      }

      writeStorage(STORAGE_KEYS.session, {
        userId: user.id,
        profileId: user.profileId,
        email: user.email
      })

      return this.getSession()
    },
    async signOut() {
      removeStorage(STORAGE_KEYS.session)
      return true
    },
    async listBuilds(options) {
      var profiles = readLocalCollection(STORAGE_KEYS.profiles)
      var favorites = readLocalCollection(STORAGE_KEYS.favorites)
      var builds = readLocalCollection(STORAGE_KEYS.builds)
        .map(function (build) {
          return decorateBuild(build, profiles, favorites)
        })
        .filter(function (build) {
          if (options?.includeDrafts) {
            return true
          }

          return build.isPublished
        })

      return applyBuildFilters(builds, options || {})
    },
    async getBuildBySlug(slug) {
      var builds = await this.listBuilds({ includeDrafts: true })
      return (
        builds.find(function (build) {
          return build.slug === slug
        }) || null
      )
    },
    async getBuildById(buildId) {
      var builds = await this.listBuilds({ includeDrafts: true })
      return (
        builds.find(function (build) {
          return build.id === buildId
        }) || null
      )
    },
    async saveBuild(input, sessionProfile) {
      var builds = readLocalCollection(STORAGE_KEYS.builds)
      var nextBuild = createBuildFromDraft(input, sessionProfile.id)
      var existingIndex = builds.findIndex(function (build) {
        return build.id === nextBuild.id
      })

      if (existingIndex >= 0) {
        builds[existingIndex] = nextBuild
      } else {
        builds.push(nextBuild)
      }

      writeLocalCollection(STORAGE_KEYS.builds, builds)
      return normalizeBuildRecord(nextBuild)
    },
    async listBuildsByUser(profileId) {
      var builds = await this.listBuilds({ includeDrafts: true })
      return builds.filter(function (build) {
        return build.userId === profileId
      })
    },
    async getProfileByUsername(username) {
      var profiles = readLocalCollection(STORAGE_KEYS.profiles)
      var builds = readLocalCollection(STORAGE_KEYS.builds)
      var favorites = readLocalCollection(STORAGE_KEYS.favorites)
      var profile = findProfileByUsername(profiles, username)

      return profile ? decorateProfile(profile, builds, favorites) : null
    },
    async getProfileById(profileId) {
      var profiles = readLocalCollection(STORAGE_KEYS.profiles)
      var builds = readLocalCollection(STORAGE_KEYS.builds)
      var favorites = readLocalCollection(STORAGE_KEYS.favorites)
      var profile = profiles.find(function (candidate) {
        return candidate.id === profileId
      })

      return profile ? decorateProfile(profile, builds, favorites) : null
    },
    async updateProfile(profileId, values) {
      var profiles = readLocalCollection(STORAGE_KEYS.profiles)
      var username = normalizeUsername(values.username)
      var profileIndex = profiles.findIndex(function (profile) {
        return profile.id === profileId
      })

      if (profileIndex === -1) {
        throw new Error('Profile not found.')
      }

      if (!username) {
        throw new Error('Username is required.')
      }

      if (
        profiles.find(function (profile) {
          return (
            profile.username.toLowerCase() === username.toLowerCase() &&
            profile.id !== profileId
          )
        })
      ) {
        throw new Error('That username is already taken.')
      }

      profiles[profileIndex] = {
        ...profiles[profileIndex],
        username: username,
        displayName: values.displayName,
        bio: values.bio,
        avatarUrl: values.avatarUrl || profiles[profileIndex].avatarUrl,
        socials: normalizeSocials(values.socials),
        specialTags: applyOwnerBootstrap(profiles[profileIndex].specialTags, username)
      }

      writeLocalCollection(STORAGE_KEYS.profiles, profiles)
      return this.getProfileById(profileId)
    },
    async setProfileSpecialTags(profileId, specialTags, actingProfile) {
      var profiles = readLocalCollection(STORAGE_KEYS.profiles)
      var profileIndex = profiles.findIndex(function (profile) {
        return profile.id === profileId
      })

      if (profileIndex === -1) {
        throw new Error('Profile not found.')
      }

      if (!canAssignSpecialTags(actingProfile)) {
        throw new Error('Only the owner can change special tags.')
      }

      profiles[profileIndex] = {
        ...profiles[profileIndex],
        specialTags: normalizeSpecialTags(specialTags)
      }

      writeLocalCollection(STORAGE_KEYS.profiles, profiles)
      return this.getProfileById(profileId)
    },
    async toggleFavorite(buildId, profileId) {
      var favorites = readLocalCollection(STORAGE_KEYS.favorites)
      var favoriteIndex = favorites.findIndex(function (favorite) {
        return favorite.buildId === buildId && favorite.userId === profileId
      })

      if (favoriteIndex >= 0) {
        favorites.splice(favoriteIndex, 1)
        writeLocalCollection(STORAGE_KEYS.favorites, favorites)
        return false
      }

      favorites.push({
        id: uniqueId('favorite'),
        userId: profileId,
        buildId: buildId,
        createdAt: new Date().toISOString()
      })
      writeLocalCollection(STORAGE_KEYS.favorites, favorites)
      return true
    },
    async isFavorited(buildId, profileId) {
      var favorites = readLocalCollection(STORAGE_KEYS.favorites)
      return favorites.some(function (favorite) {
        return favorite.buildId === buildId && favorite.userId === profileId
      })
    },
    async listFavoriteBuilds(profileId) {
      var favorites = readLocalCollection(STORAGE_KEYS.favorites).filter(function (favorite) {
        return favorite.userId === profileId
      })
      var builds = await this.listBuilds({ includeDrafts: true })
      return builds.filter(function (build) {
        return favorites.some(function (favorite) {
          return favorite.buildId === build.id
        })
      })
    },
    async getProgress(buildId, profileId) {
      var progress = readLocalCollection(STORAGE_KEYS.progress)
      var progressRecord = progress.find(function (entry) {
        if (profileId) {
          return entry.buildId === buildId && entry.userId === profileId
        }

        return entry.buildId === buildId && entry.guestKey === createGuestProgressKey()
      })

      return progressRecord ? normalizeProgress(progressRecord) : null
    },
    async saveProgress(buildId, profileId, values) {
      var progress = readLocalCollection(STORAGE_KEYS.progress)
      var recordIndex = progress.findIndex(function (entry) {
        if (profileId) {
          return entry.buildId === buildId && entry.userId === profileId
        }

        return entry.buildId === buildId && entry.guestKey === createGuestProgressKey()
      })
      var nextRecord = normalizeProgress({
        id: recordIndex >= 0 ? progress[recordIndex].id : uniqueId('progress'),
        userId: profileId || '',
        guestKey: profileId ? '' : createGuestProgressKey(),
        buildId: buildId,
        percentComplete: values.percentComplete,
        gatheredJson: values.gatheredJson,
        lastLayerViewed: values.lastLayerViewed,
        updatedAt: new Date().toISOString()
      })

      if (recordIndex >= 0) {
        progress[recordIndex] = nextRecord
      } else {
        progress.push(nextRecord)
      }

      writeLocalCollection(STORAGE_KEYS.progress, progress)
      return nextRecord
    },
    async deleteBuild(buildId, sessionProfile) {
      var builds = readLocalCollection(STORAGE_KEYS.builds)
      var buildIndex = builds.findIndex(function (build) {
        return build.id === buildId
      })

      if (buildIndex === -1) {
        throw new Error('That post could not be found.')
      }

      if (!canRemoveBuild(sessionProfile, builds[buildIndex])) {
        throw new Error('You do not have permission to remove that post.')
      }

      builds.splice(buildIndex, 1)
      writeLocalCollection(STORAGE_KEYS.builds, builds)

      writeLocalCollection(
        STORAGE_KEYS.favorites,
        readLocalCollection(STORAGE_KEYS.favorites).filter(function (favorite) {
          return favorite.buildId !== buildId
        })
      )
      writeLocalCollection(
        STORAGE_KEYS.progress,
        readLocalCollection(STORAGE_KEYS.progress).filter(function (entry) {
          return entry.buildId !== buildId
        })
      )

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
    async uploadAsset(file) {
      return fileToDataUrl(file)
    },
    async listChatMessages() {
      var profiles = readLocalCollection(STORAGE_KEYS.profiles)
      var messages = readLocalCollection(STORAGE_KEYS.chatMessages)

      return messages
        .sort(function (left, right) {
          return new Date(left.createdAt) - new Date(right.createdAt)
        })
        .slice(-40)
        .map(function (message) {
          return decorateChatMessage(message, profiles)
        })
    },
    async sendChatMessage(text, sessionProfile) {
      var messageText = String(text || '').trim()

      if (!sessionProfile) {
        throw new Error('Sign in to join the live chat.')
      }

      if (!messageText) {
        throw new Error('Write a message before sending it.')
      }

      var messages = readLocalCollection(STORAGE_KEYS.chatMessages)
      var nextMessage = {
        id: uniqueId('chat'),
        userId: sessionProfile.id,
        text: messageText,
        createdAt: new Date().toISOString()
      }

      messages.push(nextMessage)
      writeLocalCollection(STORAGE_KEYS.chatMessages, messages)

      return decorateChatMessage(nextMessage, readLocalCollection(STORAGE_KEYS.profiles))
    },
    subscribeToChatMessages(callback) {
      function handleStorage(event) {
        if (event.key === STORAGE_KEYS.chatMessages) {
          callback()
        }
      }

      window.addEventListener('storage', handleStorage)

      return function cleanup() {
        window.removeEventListener('storage', handleStorage)
      }
    }
  }
}
