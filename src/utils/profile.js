import { escapeHtml } from './dom.js'

export var SPECIAL_TAG_OPTIONS = ['Owner', 'Site Admin', 'Community Expert', 'Early Bird']
export var ASSIGNABLE_SPECIAL_TAG_OPTIONS = ['Owner', 'Site Admin', 'Community Expert']

var ROMAN_LEVELS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']
var POST_MASTER_LEVELS = [10, 100, 1000, 10000]
var CHATTERBOX_LEVELS = [100, 1000, 10000, 100000, 1000000, 10000000, 100000000, 1000000000, 1000000000000, 1000000000000000]

var SPECIAL_BADGE_DEFINITIONS = {
  Owner: {
    key: 'owner',
    label: 'Owner',
    family: 'owner',
    tone: 'owner',
    description: 'Given to the site owner.'
  },
  'Site Admin': {
    key: 'site-admin',
    label: 'Site Admin',
    family: 'site-admin',
    tone: 'admin',
    description: 'Assigned by the owner to help manage the site.'
  },
  'Community Expert': {
    key: 'community-expert',
    label: 'Community Expert',
    family: 'community-expert',
    tone: 'expert',
    description: 'Assigned by the owner for trusted community help.'
  },
  'Early Bird': {
    key: 'early-bird',
    label: 'Early Bird',
    family: 'early-bird',
    tone: 'early-bird',
    description: 'Awarded to the first 100 verified accounts.'
  }
}

function createDefaultBadge(definition) {
  return {
    key: definition.key,
    label: definition.label,
    family: definition.family,
    tone: definition.tone,
    description: definition.description
  }
}

function coerceCount(value) {
  return Math.max(0, Number(value || 0))
}

function toRoman(level) {
  return ROMAN_LEVELS[level - 1] || String(level)
}

function formatMilestone(value) {
  if (value >= 1000000000000000) {
    return '1 QD'
  }

  if (value >= 1000000000000) {
    return '1 T'
  }

  if (value >= 1000000000) {
    return '1 B'
  }

  if (value >= 1000000) {
    return String(value / 1000000).replace(/\.0$/, '') + ' M'
  }

  if (value >= 1000) {
    return String(value / 1000).replace(/\.0$/, '') + ' K'
  }

  return String(value)
}

function getHighestUnlockedLevel(thresholds, count) {
  var level = 0

  thresholds.forEach(function (threshold, index) {
    if (count >= threshold) {
      level = index + 1
    }
  })

  return level
}

function createAchievementBadge(family, level, threshold) {
  if (!level || !threshold) {
    return null
  }

  if (family === 'post-master') {
    return {
      key: 'post-master-' + level,
      label: 'Post Master ' + toRoman(level),
      family: 'post-master',
      tone: 'post-master',
      description: 'Unlocked by publishing ' + formatMilestone(threshold) + ' builds.'
    }
  }

  return {
    key: 'chatterbox-' + level,
    label: 'Chatterbox ' + toRoman(level),
    family: 'chatterbox',
    tone: 'chatterbox',
    description: 'Unlocked by sending ' + formatMilestone(threshold) + ' chat messages.'
  }
}

function createMilestones(thresholds, unlockedLevel, count, noun) {
  return thresholds.map(function (threshold, index) {
    var level = index + 1

    return {
      level: level,
      label: toRoman(level),
      target: threshold,
      targetLabel: formatMilestone(threshold),
      isUnlocked: level <= unlockedLevel,
      helper: noun + ' ' + formatMilestone(threshold)
    }
  })
}

export function createDefaultAvatar(name) {
  var label = String(name || 'P').trim().charAt(0).toUpperCase() || 'P'
  var svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">' +
    '<defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1">' +
    '<stop offset="0%" stop-color="#456950"/>' +
    '<stop offset="100%" stop-color="#8da782"/>' +
    '</linearGradient></defs>' +
    '<rect width="120" height="120" rx="36" fill="url(#g)"/>' +
    '<circle cx="60" cy="60" r="34" fill="rgba(255,253,247,0.18)"/>' +
    '<text x="60" y="73" text-anchor="middle" fill="#fffdf7" font-size="44" font-family="Georgia, serif" font-weight="700">' +
    label +
    '</text>' +
    '</svg>'

  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg)
}

export function getProfileAvatar(profile) {
  return profile?.avatarUrl || createDefaultAvatar(profile?.displayName || profile?.username || 'P')
}

export function normalizeUrl(value) {
  var input = String(value || '').trim()

  if (!input) {
    return ''
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(input)) {
    return input
  }

  if (/^\/\//.test(input)) {
    return 'https:' + input
  }

  return 'https://' + input
}

export function normalizeSocials(socials) {
  return (Array.isArray(socials) ? socials : [])
    .map(function (entry, index) {
      return {
        id: entry.id || 'social-' + index,
        label: String(entry.label || '').trim(),
        url: normalizeUrl(entry.url)
      }
    })
    .filter(function (entry) {
      return entry.label && entry.url
    })
    .slice(0, 5)
}

export function normalizeSpecialTags(tags) {
  var allowed = new Set(SPECIAL_TAG_OPTIONS)
  var seen = new Set()

  return (Array.isArray(tags) ? tags : [])
    .map(function (tag) {
      return String(tag || '').trim()
    })
    .filter(function (tag) {
      if (!allowed.has(tag) || seen.has(tag)) {
        return false
      }

      seen.add(tag)
      return true
    })
}

export function normalizeFeaturedBadgeKey(value) {
  return String(value || '').trim().toLowerCase()
}

export function preserveProtectedSpecialTags(existingTags, nextTags) {
  var preserved = normalizeSpecialTags(existingTags).filter(function (tag) {
    return !ASSIGNABLE_SPECIAL_TAG_OPTIONS.includes(tag)
  })

  return normalizeSpecialTags([].concat(nextTags || [], preserved))
}

export function hasSpecialTag(profile, tag) {
  return normalizeSpecialTags(profile?.specialTags).includes(tag)
}

export function canAssignSpecialTags(profile) {
  return hasSpecialTag(profile, 'Owner')
}

export function canRemoveBuild(profile, build) {
  if (!profile || !build) {
    return false
  }

  return profile.id === build.userId || hasSpecialTag(profile, 'Owner')
}

export function getUnlockedBadges(profile) {
  var badges = normalizeSpecialTags(profile?.specialTags).map(function (tag) {
    return createDefaultBadge(SPECIAL_BADGE_DEFINITIONS[tag])
  })
  var postMasterLevel = getHighestUnlockedLevel(POST_MASTER_LEVELS, coerceCount(profile?.buildCount))
  var chatterboxLevel = getHighestUnlockedLevel(CHATTERBOX_LEVELS, coerceCount(profile?.chatCount))
  var postMasterBadge = createAchievementBadge(
    'post-master',
    postMasterLevel,
    POST_MASTER_LEVELS[postMasterLevel - 1]
  )
  var chatterboxBadge = createAchievementBadge(
    'chatterbox',
    chatterboxLevel,
    CHATTERBOX_LEVELS[chatterboxLevel - 1]
  )

  if (postMasterBadge) {
    badges.push(postMasterBadge)
  }

  if (chatterboxBadge) {
    badges.push(chatterboxBadge)
  }

  return badges
}

export function getFeaturedBadge(profile) {
  var badges = getUnlockedBadges(profile)
  var featuredKey = normalizeFeaturedBadgeKey(profile?.featuredBadgeKey)

  return (
    badges.find(function (badge) {
      return badge.key === featuredKey
    }) ||
    badges[0] ||
    null
  )
}

export function getBadgeCatalog(profile) {
  var unlockedBadges = getUnlockedBadges(profile)
  var unlockedMap = new Set(
    unlockedBadges.map(function (badge) {
      return badge.key
    })
  )
  var postMasterLevel = getHighestUnlockedLevel(POST_MASTER_LEVELS, coerceCount(profile?.buildCount))
  var chatterboxLevel = getHighestUnlockedLevel(CHATTERBOX_LEVELS, coerceCount(profile?.chatCount))

  return [
    {
      key: 'post-master',
      title: 'Post Master',
      description: 'Publish builds to level this badge up.',
      currentBadge:
        createAchievementBadge(
          'post-master',
          postMasterLevel,
          POST_MASTER_LEVELS[postMasterLevel - 1]
        ) || null,
      count: coerceCount(profile?.buildCount),
      countLabel: String(coerceCount(profile?.buildCount)) + ' published builds',
      milestones: createMilestones(POST_MASTER_LEVELS, postMasterLevel, profile?.buildCount, 'Publish')
    },
    {
      key: 'chatterbox',
      title: 'Chatterbox',
      description: 'Send messages in community chat or DMs to level this badge up.',
      currentBadge:
        createAchievementBadge(
          'chatterbox',
          chatterboxLevel,
          CHATTERBOX_LEVELS[chatterboxLevel - 1]
        ) || null,
      count: coerceCount(profile?.chatCount),
      countLabel: String(coerceCount(profile?.chatCount)) + ' total messages sent',
      milestones: createMilestones(CHATTERBOX_LEVELS, chatterboxLevel, profile?.chatCount, 'Send')
    },
    {
      key: 'owner',
      title: 'Owner',
      description: SPECIAL_BADGE_DEFINITIONS.Owner.description,
      currentBadge: unlockedMap.has('owner') ? createDefaultBadge(SPECIAL_BADGE_DEFINITIONS.Owner) : null,
      countLabel: unlockedMap.has('owner') ? 'Unlocked' : 'Locked',
      milestones: []
    },
    {
      key: 'early-bird',
      title: 'Early Bird',
      description: SPECIAL_BADGE_DEFINITIONS['Early Bird'].description,
      currentBadge: unlockedMap.has('early-bird')
        ? createDefaultBadge(SPECIAL_BADGE_DEFINITIONS['Early Bird'])
        : null,
      countLabel: unlockedMap.has('early-bird') ? 'Unlocked' : 'Locked',
      milestones: []
    },
    {
      key: 'site-admin',
      title: 'Site Admin',
      description: SPECIAL_BADGE_DEFINITIONS['Site Admin'].description,
      currentBadge: unlockedMap.has('site-admin')
        ? createDefaultBadge(SPECIAL_BADGE_DEFINITIONS['Site Admin'])
        : null,
      countLabel: unlockedMap.has('site-admin') ? 'Unlocked' : 'Locked',
      milestones: []
    },
    {
      key: 'community-expert',
      title: 'Community Expert',
      description: SPECIAL_BADGE_DEFINITIONS['Community Expert'].description,
      currentBadge: unlockedMap.has('community-expert')
        ? createDefaultBadge(SPECIAL_BADGE_DEFINITIONS['Community Expert'])
        : null,
      countLabel: unlockedMap.has('community-expert') ? 'Unlocked' : 'Locked',
      milestones: []
    }
  ]
}

export function renderBadgeChips(badges) {
  var items = Array.isArray(badges) ? badges.filter(Boolean) : []

  if (!items.length) {
    return ''
  }

  return (
    '<div class="tag-row badge-chip-row">' +
    items
      .map(function (badge) {
        return (
          '<span class="tag-pill tag-pill--badge badge-chip tag-pill--' +
          escapeHtml(badge.tone || 'default') +
          '">' +
          escapeHtml(badge.label) +
          '</span>'
        )
      })
      .join('') +
    '</div>'
  )
}

export function parseSocialsFromForm(formData) {
  var labels = formData.getAll('socialLabel')
  var urls = formData.getAll('socialUrl')

  return normalizeSocials(
    labels.map(function (label, index) {
      return {
        label: label,
        url: urls[index]
      }
    })
  )
}

export function renderSocialLinks(socials) {
  var items = normalizeSocials(socials)

  if (!items.length) {
    return '<p class="muted">No socials added yet.</p>'
  }

  return (
    '<div class="social-list social-list--profile">' +
    items
      .map(function (entry) {
        return (
          '<a class="social-chip social-chip--profile" href="' +
          escapeHtml(entry.url) +
          '" target="_blank" rel="noreferrer">' +
          escapeHtml(entry.label) +
          '</a>'
        )
      })
      .join('') +
    '</div>'
  )
}
