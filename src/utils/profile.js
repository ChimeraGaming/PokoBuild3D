import { escapeHtml } from './dom.js'

export var MANAGEABLE_SPECIAL_TAG_OPTIONS = ['Owner', 'Site Admin', 'Community Expert']
export var AUTOMATIC_SPECIAL_TAG_OPTIONS = ['Early Bird']
export var SPECIAL_TAG_OPTIONS = MANAGEABLE_SPECIAL_TAG_OPTIONS.concat(AUTOMATIC_SPECIAL_TAG_OPTIONS)

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

export function normalizeManageableSpecialTags(tags) {
  var allowed = new Set(MANAGEABLE_SPECIAL_TAG_OPTIONS)

  return normalizeSpecialTags(tags).filter(function (tag) {
    return allowed.has(tag)
  })
}

export function getAutomaticSpecialTags(tags) {
  var automatic = new Set(AUTOMATIC_SPECIAL_TAG_OPTIONS)

  return normalizeSpecialTags(tags).filter(function (tag) {
    return automatic.has(tag)
  })
}

export function mergeSpecialTags(manageableTags, automaticTags) {
  return normalizeSpecialTags(
    normalizeManageableSpecialTags(manageableTags).concat(getAutomaticSpecialTags(automaticTags))
  )
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

export function renderSpecialTagChips(tags) {
  var items = normalizeSpecialTags(tags)

  if (!items.length) {
    return '<p class="muted">No special tags yet.</p>'
  }

  return (
    '<div class="tag-row">' +
    items
      .map(function (tag) {
        return '<span class="tag-pill">' + escapeHtml(tag) + '</span>'
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
    '<div class="social-list">' +
    items
      .map(function (entry) {
        return (
          '<a class="social-chip" href="' +
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
