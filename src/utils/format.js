export function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function createUniqueSlug(value, existingSlugs) {
  var baseSlug = slugify(value) || uniqueId('slug')
  var takenSlugs = Array.isArray(existingSlugs) ? existingSlugs : []
  var slugPattern = new RegExp('^' + escapeRegExp(baseSlug) + '(?:-(\\d+))?$')
  var baseTaken = false
  var highestSuffix = 1

  takenSlugs.forEach(function (candidate) {
    var match = String(candidate || '').match(slugPattern)

    if (!match) {
      return
    }

    if (match[1]) {
      highestSuffix = Math.max(highestSuffix, Number(match[1]) + 1)
      return
    }

    baseTaken = true
  })

  if (!baseTaken && highestSuffix === 1) {
    return baseSlug
  }

  return baseSlug + '-' + highestSuffix
}

export function normalizeUsername(value, fallbackValue) {
  var username = String(value || '').trim()

  if (username) {
    return username
  }

  return String(fallbackValue || '').trim()
}

export function createProfilePath(username) {
  return '/u/' + encodeURIComponent(String(username || '').trim())
}

export function toTitleCase(value) {
  return String(value || '')
    .split(/[\s-]+/)
    .filter(Boolean)
    .map(function (part) {
      return part.charAt(0).toUpperCase() + part.slice(1)
    })
    .join(' ')
}

export function formatDate(value) {
  if (!value) {
    return 'Unknown date'
  }

  var date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Unknown date'
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date)
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

export function uniqueId(prefix) {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return prefix + '-' + window.crypto.randomUUID()
  }

  return prefix + '-' + Math.random().toString(36).slice(2, 11)
}

export function countUnique(items, selector) {
  var map = new Map()

  items.forEach(function (item) {
    var key = selector(item)
    map.set(key, (map.get(key) || 0) + 1)
  })

  return map
}
