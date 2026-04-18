export var TEMPLATE_SIZE_OPTIONS = ['5x5', '10x10', '15x15']

export function gridFromTemplateSize(templateSize) {
  var normalized = normalizeTemplateSize(templateSize)
  var size = Number(normalized.split('x')[0] || 10)

  return {
    width: size,
    height: size,
    depth: size
  }
}

export function normalizeTemplateSize(templateSize, grid) {
  var value = String(templateSize || '').trim().toLowerCase()

  if (TEMPLATE_SIZE_OPTIONS.includes(value)) {
    return value
  }

  var width = Number(grid?.width || 0)
  var depth = Number(grid?.depth || 0)
  var derived = width && depth && width === depth ? width + 'x' + depth : ''

  if (TEMPLATE_SIZE_OPTIONS.includes(derived)) {
    return derived
  }

  return '10x10'
}

export function getGridBounds(grid) {
  var width = Number(grid?.width || 10)
  var height = Number(grid?.height || width || 10)
  var depth = Number(grid?.depth || width || 10)
  var minX = -Math.floor(width / 2)
  var minZ = -Math.floor(depth / 2)

  return {
    minX: minX,
    maxX: minX + width - 1,
    minY: 0,
    maxY: height - 1,
    minZ: minZ,
    maxZ: minZ + depth - 1
  }
}

export function clampCoordToGrid(coord, grid) {
  var bounds = getGridBounds(grid)

  return {
    x: Math.min(bounds.maxX, Math.max(bounds.minX, Number(coord.x || 0))),
    y: Math.min(bounds.maxY, Math.max(bounds.minY, Number(coord.y || 0))),
    z: Math.min(bounds.maxZ, Math.max(bounds.minZ, Number(coord.z || 0)))
  }
}

export function isCoordInGrid(coord, grid) {
  var bounds = getGridBounds(grid)

  return (
    coord.x >= bounds.minX &&
    coord.x <= bounds.maxX &&
    coord.y >= bounds.minY &&
    coord.y <= bounds.maxY &&
    coord.z >= bounds.minZ &&
    coord.z <= bounds.maxZ
  )
}
