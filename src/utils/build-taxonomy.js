var LOCATION_LABELS = {
  withered: 'Withered Wasteland (Fuchsia City)',
  bleak: 'Bleak Beach (Vermilion City)',
  rocky: 'Rocky Ridges (Pewter City)',
  sparkling: 'Sparkling Skylands (Celadon City and Saffron City)'
}

export var LOCATION_SUGGESTIONS = Object.values(LOCATION_LABELS)

var LOCATION_ALIASES = {
  'withered wasteland': LOCATION_LABELS.withered,
  'withered wasteland (fuchsia city)': LOCATION_LABELS.withered,
  'fuchsia city': LOCATION_LABELS.withered,
  'bleak beach': LOCATION_LABELS.bleak,
  'bleak beach (vermilion city)': LOCATION_LABELS.bleak,
  'bleak beach (vermillion city)': LOCATION_LABELS.bleak,
  'vermilion city': LOCATION_LABELS.bleak,
  'vermillion city': LOCATION_LABELS.bleak,
  'rocky ridges': LOCATION_LABELS.rocky,
  'rocky ridges (pewter city)': LOCATION_LABELS.rocky,
  'pewter city': LOCATION_LABELS.rocky,
  'sparkling skylands': LOCATION_LABELS.sparkling,
  'sparkling skylands (celadon city and saffron city)': LOCATION_LABELS.sparkling,
  'sparkling skylands (celadon city / saffron city)': LOCATION_LABELS.sparkling,
  'celadon city and saffron city': LOCATION_LABELS.sparkling,
  'celadon city / saffron city': LOCATION_LABELS.sparkling
}

export var ASSET_KIND_LABELS = {
  model: '3D Model',
  picture: 'Picture',
  real3d: 'Real 3D',
  tips: 'Tips & Tricks'
}

export function normalizeLocation(value) {
  var normalized = String(value || '')
    .trim()
    .replace(/\s+/g, ' ')

  if (!normalized) {
    return ''
  }

  return LOCATION_ALIASES[normalized.toLowerCase()] || normalized
}

export function splitTagInput(value) {
  if (Array.isArray(value)) {
    return value
      .map(function (tag) {
        return String(tag || '').trim()
      })
      .filter(Boolean)
  }

  return String(value || '')
    .split(',')
    .map(function (tag) {
      return tag.trim()
    })
    .filter(Boolean)
}

export function uniqueTags(tags) {
  var seen = new Set()

  return splitTagInput(tags).filter(function (tag) {
    var key = tag.toLowerCase()

    if (seen.has(key)) {
      return false
    }

    seen.add(key)
    return true
  })
}

export function composeOriginTag(originType, username, creatorKnown, originalCreator) {
  if (originType === 'online') {
    var creatorName = creatorKnown ? String(originalCreator || '').trim() : ''
    return creatorName ? 'Online Creation - ' + creatorName : 'Online Creation'
  }

  var ownerName = String(username || '').trim()
  return ownerName ? 'My Creation - ' + ownerName : 'My Creation'
}

export function composeBuildTags(values, username) {
  var location = normalizeLocation(values.location)
  var originTag = composeOriginTag(
    values.originType,
    username,
    values.creatorKnown,
    values.originalCreator
  )

  return uniqueTags([originTag, location].concat(splitTagInput(values.extraTags)))
}

export function resolveBuildAssetKind(build) {
  if (build?.assetKind) {
    return build.assetKind
  }

  if (build?.modelType === 'picture') {
    return 'picture'
  }

  if (build?.modelType === 'real3d') {
    return 'real3d'
  }

  if (build?.modelType === 'tips') {
    return 'tips'
  }

  return 'model'
}

export function getAssetKindLabel(kind) {
  return ASSET_KIND_LABELS[kind] || 'Post'
}

export function hasThreeDimensionalModel(build) {
  return (
    (build.modelType === 'editor' && Boolean(build.editorDataJson?.pieces?.length)) ||
    Boolean(build.modelUrl)
  )
}
