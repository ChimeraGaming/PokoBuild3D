import * as THREE from 'three'
import {
  getMaterialDefinition,
  getPieceDefinition,
  summarizeMaterials
} from '../editor/piece-library.js'

var ORE_ACCENT_COLOR = '#6fc98e'
var LIGHT_GLOW_COLOR = '#bfefff'

function tintColor(colorValue, hueOffset, saturationOffset, lightnessOffset) {
  var color = new THREE.Color(colorValue)
  color.offsetHSL(hueOffset || 0, saturationOffset || 0, lightnessOffset || 0)
  return color
}

function createPieceMaterial(materialDefinition, options, overrides) {
  var material = new THREE.MeshStandardMaterial({
    color: overrides?.color || materialDefinition.color,
    roughness: overrides?.roughness ?? 0.78,
    metalness: overrides?.metalness ?? 0.08,
    emissive: overrides?.emissive || 0x000000,
    emissiveIntensity: overrides?.emissiveIntensity ?? 0,
    transparent: Boolean(overrides?.transparent),
    opacity: overrides?.opacity ?? 1,
    wireframe: Boolean(options?.wireframe)
  })

  material.userData.baseTransparent = material.transparent
  material.userData.baseOpacity = material.opacity

  return material
}

function createModelPart(geometry, materialDefinition, options, transform, materialOverrides) {
  var mesh = new THREE.Mesh(
    geometry,
    createPieceMaterial(materialDefinition, options, materialOverrides)
  )
  mesh.castShadow = true
  mesh.receiveShadow = true

  if (transform) {
    mesh.position.set(transform.x ?? 0, transform.y ?? 0, transform.z ?? 0)
    mesh.rotation.set(transform.rx ?? 0, transform.ry ?? 0, transform.rz ?? 0)
  }

  return mesh
}

function addFramedPanel(group, pieceDefinition, materialDefinition, options, frontZ) {
  var size = pieceDefinition.size

  group.add(
    createModelPart(
      new THREE.BoxGeometry(size.x * 0.72, size.y * 0.56, size.z * 0.08),
      materialDefinition,
      options,
      { x: 0, y: size.y * 0.52, z: frontZ },
      { color: tintColor(materialDefinition.color, 0, 0, 0.04) }
    )
  )

  ;[
    { x: 0, y: size.y * 0.17, w: size.x * 0.86, h: size.y * 0.08 },
    { x: 0, y: size.y * 0.87, w: size.x * 0.86, h: size.y * 0.08 },
    { x: size.x * 0.38, y: size.y * 0.52, w: size.x * 0.08, h: size.y * 0.64 },
    { x: -size.x * 0.38, y: size.y * 0.52, w: size.x * 0.08, h: size.y * 0.64 }
  ].forEach(function (part) {
    group.add(
      createModelPart(
        new THREE.BoxGeometry(part.w, part.h, size.z * 0.12),
        materialDefinition,
        options,
        { x: part.x, y: part.y, z: frontZ },
        { color: tintColor(materialDefinition.color, 0, 0, -0.1) }
      )
    )
  })
}

function createCubeModel(pieceDefinition, materialDefinition, options) {
  var size = pieceDefinition.size
  var group = new THREE.Group()

  group.add(
    createModelPart(
      new THREE.BoxGeometry(size.x * 0.96, size.y * 0.9, size.z * 0.96),
      materialDefinition,
      options,
      { x: 0, y: size.y * 0.45, z: 0 }
    )
  )
  group.add(
    createModelPart(
      new THREE.BoxGeometry(size.x * 0.82, size.y * 0.08, size.z * 0.82),
      materialDefinition,
      options,
      { x: 0, y: size.y * 0.94, z: 0 }
    )
  )

  return group
}

function createPlankModel(pieceDefinition, materialDefinition, options) {
  var size = pieceDefinition.size
  var group = new THREE.Group()

  group.add(
    createModelPart(
      new THREE.BoxGeometry(size.x, size.y * 0.45, size.z),
      materialDefinition,
      options,
      { x: 0, y: size.y * 0.775, z: 0 }
    )
  )

  ;[-1, 1].forEach(function (direction) {
    group.add(
      createModelPart(
        new THREE.BoxGeometry(size.x * 0.16, size.y * 0.35, size.z * 0.84),
        materialDefinition,
        options,
        { x: direction * size.x * 0.28, y: size.y * 0.225, z: 0 }
      )
    )
  })

  return group
}

function createLadderModel(pieceDefinition, materialDefinition, options) {
  var size = pieceDefinition.size
  var group = new THREE.Group()

  ;[-1, 1].forEach(function (direction) {
    group.add(
      createModelPart(
        new THREE.BoxGeometry(size.x * 0.12, size.y, size.z * 0.48),
        materialDefinition,
        options,
        { x: direction * size.x * 0.38, y: size.y * 0.5, z: 0 }
      )
    )
  })

  ;[0.22, 0.5, 0.78].forEach(function (level) {
    group.add(
      createModelPart(
        new THREE.BoxGeometry(size.x * 0.62, size.y * 0.08, size.z * 0.34),
        materialDefinition,
        options,
        { x: 0, y: size.y * level, z: 0 }
      )
    )
  })

  return group
}

function createPostModel(pieceDefinition, materialDefinition, options) {
  var size = pieceDefinition.size
  var group = new THREE.Group()

  group.add(
    createModelPart(
      new THREE.BoxGeometry(size.x, size.y * 0.08, size.z),
      materialDefinition,
      options,
      { x: 0, y: size.y * 0.04, z: 0 }
    )
  )
  group.add(
    createModelPart(
      new THREE.BoxGeometry(size.x * 0.72, size.y * 0.78, size.z * 0.72),
      materialDefinition,
      options,
      { x: 0, y: size.y * 0.47, z: 0 }
    )
  )
  group.add(
    createModelPart(
      new THREE.BoxGeometry(size.x * 1.08, size.y * 0.12, size.z * 1.08),
      materialDefinition,
      options,
      { x: 0, y: size.y * 0.94, z: 0 }
    )
  )

  return group
}

function createFloorTileModel(pieceDefinition, materialDefinition, options) {
  var size = pieceDefinition.size
  var group = new THREE.Group()

  group.add(
    createModelPart(
      new THREE.BoxGeometry(size.x, size.y * 0.78, size.z),
      materialDefinition,
      options,
      { x: 0, y: size.y * 0.39, z: 0 }
    )
  )
  group.add(
    createModelPart(
      new THREE.BoxGeometry(size.x * 0.82, size.y * 0.2, size.z * 0.82),
      materialDefinition,
      options,
      { x: 0, y: size.y * 0.88, z: 0 }
    )
  )

  return group
}

function createStairModel(pieceDefinition, materialDefinition, options) {
  var size = pieceDefinition.size
  var group = new THREE.Group()

  group.add(
    createModelPart(
      new THREE.BoxGeometry(size.x, size.y * 0.34, size.z),
      materialDefinition,
      options,
      { x: 0, y: size.y * 0.17, z: 0 }
    )
  )
  group.add(
    createModelPart(
      new THREE.BoxGeometry(size.x, size.y * 0.33, size.z * 0.66),
      materialDefinition,
      options,
      { x: 0, y: size.y * 0.505, z: -size.z * 0.17 }
    )
  )
  group.add(
    createModelPart(
      new THREE.BoxGeometry(size.x, size.y * 0.33, size.z * 0.32),
      materialDefinition,
      options,
      { x: 0, y: size.y * 0.835, z: -size.z * 0.34 }
    )
  )

  return group
}

function createDecorModel(pieceDefinition, materialDefinition, options) {
  var size = pieceDefinition.size
  var group = new THREE.Group()

  group.add(
    createModelPart(
      new THREE.CylinderGeometry(size.x * 0.24, size.x * 0.34, size.y * 0.46, 10, 1),
      materialDefinition,
      options,
      { x: 0, y: size.y * 0.23, z: 0 }
    )
  )
  group.add(
    createModelPart(
      new THREE.CylinderGeometry(size.x * 0.12, size.x * 0.16, size.y * 0.12, 10, 1),
      materialDefinition,
      options,
      { x: 0, y: size.y * 0.52, z: 0 }
    )
  )
  group.add(
    createModelPart(
      new THREE.SphereGeometry(size.x * 0.18, 12, 12),
      materialDefinition,
      options,
      { x: 0, y: size.y * 0.76, z: 0 }
    )
  )

  return group
}

function createWallBlockModel(pieceDefinition, materialDefinition, options) {
  var size = pieceDefinition.size
  var group = new THREE.Group()
  var frontZ = size.z * 0.44
  var backZ = -size.z * 0.44

  group.add(
    createModelPart(
      new THREE.BoxGeometry(size.x * 0.96, size.y * 0.92, size.z * 0.9),
      materialDefinition,
      options,
      { x: 0, y: size.y * 0.46, z: 0 },
      { color: tintColor(materialDefinition.color, 0, 0, -0.02) }
    )
  )
  group.add(
    createModelPart(
      new THREE.BoxGeometry(size.x * 0.92, size.y * 0.08, size.z * 0.92),
      materialDefinition,
      options,
      { x: 0, y: size.y * 0.96, z: 0 },
      { color: tintColor(materialDefinition.color, 0, 0, 0.08) }
    )
  )

  addFramedPanel(group, pieceDefinition, materialDefinition, options, frontZ)
  addFramedPanel(group, pieceDefinition, materialDefinition, options, backZ)

  return group
}

function createPillarBlockModel(pieceDefinition, materialDefinition, options) {
  var size = pieceDefinition.size
  var group = new THREE.Group()
  var shaftColor = tintColor(materialDefinition.color, 0, 0, -0.05)
  var ribColor = tintColor(materialDefinition.color, 0, 0, 0.07)

  group.add(
    createModelPart(
      new THREE.BoxGeometry(size.x * 1.28, size.y * 0.08, size.z * 1.28),
      materialDefinition,
      options,
      { x: 0, y: size.y * 0.04, z: 0 },
      { color: shaftColor }
    )
  )
  group.add(
    createModelPart(
      new THREE.BoxGeometry(size.x * 0.72, size.y * 0.74, size.z * 0.72),
      materialDefinition,
      options,
      { x: 0, y: size.y * 0.45, z: 0 },
      { color: shaftColor }
    )
  )

  ;[
    { x: size.x * 0.27, z: size.z * 0.27 },
    { x: size.x * 0.27, z: -size.z * 0.27 },
    { x: -size.x * 0.27, z: size.z * 0.27 },
    { x: -size.x * 0.27, z: -size.z * 0.27 }
  ].forEach(function (corner) {
    group.add(
      createModelPart(
        new THREE.BoxGeometry(size.x * 0.16, size.y * 0.7, size.z * 0.16),
        materialDefinition,
        options,
        { x: corner.x, y: size.y * 0.44, z: corner.z },
        { color: ribColor }
      )
    )
  })

  group.add(
    createModelPart(
      new THREE.BoxGeometry(size.x, size.y * 0.12, size.z),
      materialDefinition,
      options,
      { x: 0, y: size.y * 0.93, z: 0 },
      { color: ribColor }
    )
  )
  group.add(
    createModelPart(
      new THREE.BoxGeometry(size.x * 1.18, size.y * 0.06, size.z * 1.18),
      materialDefinition,
      options,
      { x: 0, y: size.y * 0.99, z: 0 },
      { color: tintColor(materialDefinition.color, 0, 0, 0.12) }
    )
  )

  return group
}

function createPatternBlockModel(pieceDefinition, materialDefinition, options) {
  var size = pieceDefinition.size
  var group = new THREE.Group()

  group.add(
    createModelPart(
      new THREE.BoxGeometry(size.x * 0.96, size.y * 0.92, size.z * 0.96),
      materialDefinition,
      options,
      { x: 0, y: size.y * 0.46, z: 0 },
      { color: tintColor(materialDefinition.color, 0, 0, 0.02) }
    )
  )

  ;[size.z * 0.45, -size.z * 0.45].forEach(function (faceZ) {
    group.add(
      createModelPart(
        new THREE.BoxGeometry(size.x * 0.72, size.y * 0.72, size.z * 0.05),
        materialDefinition,
        options,
        { x: 0, y: size.y * 0.5, z: faceZ },
        { color: tintColor(materialDefinition.color, 0, 0, 0.11) }
      )
    )
    group.add(
      createModelPart(
        new THREE.BoxGeometry(size.x * 0.6, size.y * 0.08, size.z * 0.08),
        materialDefinition,
        options,
        { x: 0, y: size.y * 0.5, z: faceZ },
        { color: tintColor(materialDefinition.color, 0, 0, -0.12) }
      )
    )
    group.add(
      createModelPart(
        new THREE.BoxGeometry(size.x * 0.08, size.y * 0.6, size.z * 0.08),
        materialDefinition,
        options,
        { x: 0, y: size.y * 0.5, z: faceZ },
        { color: tintColor(materialDefinition.color, 0, 0, -0.12) }
      )
    )
  })

  return group
}

function createRoadTileModel(pieceDefinition, materialDefinition, options) {
  var size = pieceDefinition.size
  var group = new THREE.Group()

  group.add(
    createModelPart(
      new THREE.BoxGeometry(size.x, size.y * 0.7, size.z),
      materialDefinition,
      options,
      { x: 0, y: size.y * 0.35, z: 0 },
      { color: tintColor(materialDefinition.color, 0, 0, -0.18), roughness: 0.9 }
    )
  )
  group.add(
    createModelPart(
      new THREE.BoxGeometry(size.x * 0.86, size.y * 0.12, size.z * 0.86),
      materialDefinition,
      options,
      { x: 0, y: size.y * 0.78, z: 0 },
      { color: tintColor(materialDefinition.color, 0, 0, -0.06), roughness: 0.82 }
    )
  )
  group.add(
    createModelPart(
      new THREE.BoxGeometry(size.x * 0.18, size.y * 0.08, size.z * 0.64),
      materialDefinition,
      options,
      { x: 0, y: size.y * 0.9, z: 0 },
      { color: tintColor('#f0f6fc', 0, 0, -0.04), roughness: 0.45 }
    )
  )

  return group
}

function createTerrainBlockModel(pieceDefinition, materialDefinition, options) {
  var size = pieceDefinition.size
  var group = new THREE.Group()
  var soilColor = tintColor(materialDefinition.color, 0.02, -0.1, -0.22)
  var grassColor = tintColor(materialDefinition.color, -0.03, 0.06, 0.06)

  group.add(
    createModelPart(
      new THREE.BoxGeometry(size.x * 0.96, size.y * 0.76, size.z * 0.96),
      materialDefinition,
      options,
      { x: 0, y: size.y * 0.38, z: 0 },
      { color: soilColor }
    )
  )
  group.add(
    createModelPart(
      new THREE.BoxGeometry(size.x * 0.98, size.y * 0.16, size.z * 0.98),
      materialDefinition,
      options,
      { x: 0, y: size.y * 0.84, z: 0 },
      { color: grassColor }
    )
  )
  group.add(
    createModelPart(
      new THREE.BoxGeometry(size.x * 0.78, size.y * 0.05, size.z * 0.78),
      materialDefinition,
      options,
      { x: 0, y: size.y * 0.95, z: 0 },
      { color: tintColor(grassColor, 0, 0, 0.08) }
    )
  )

  return group
}

function createRockClusterModel(pieceDefinition, materialDefinition, options, includeOre) {
  var size = pieceDefinition.size
  var group = new THREE.Group()
  var darkRock = tintColor(materialDefinition.color, 0, 0, -0.12)
  var midRock = tintColor(materialDefinition.color, 0, 0, -0.02)
  var lightRock = tintColor(materialDefinition.color, 0, 0, 0.08)

  group.add(
    createModelPart(
      new THREE.BoxGeometry(size.x * 0.88, size.y * 0.18, size.z * 0.8),
      materialDefinition,
      options,
      { x: 0, y: size.y * 0.09, z: 0 },
      { color: darkRock }
    )
  )

  ;[
    { radius: size.x * 0.28, x: -size.x * 0.16, y: size.y * 0.34, z: size.z * 0.08, color: darkRock },
    { radius: size.x * 0.24, x: size.x * 0.18, y: size.y * 0.38, z: -size.z * 0.12, color: midRock },
    { radius: size.x * 0.18, x: 0, y: size.y * 0.63, z: size.z * 0.1, color: lightRock }
  ].forEach(function (part) {
    group.add(
      createModelPart(
        new THREE.DodecahedronGeometry(part.radius, 0),
        materialDefinition,
        options,
        {
          x: part.x,
          y: part.y,
          z: part.z,
          rx: Math.PI * 0.12,
          ry: Math.PI * 0.18
        },
        { color: part.color, roughness: 0.92, metalness: 0.03 }
      )
    )
  })

  if (includeOre) {
    ;[
      { x: size.x * 0.06, y: size.y * 0.54, z: size.z * 0.26 },
      { x: -size.x * 0.22, y: size.y * 0.31, z: size.z * 0.06 },
      { x: size.x * 0.22, y: size.y * 0.34, z: -size.z * 0.08 }
    ].forEach(function (part) {
      group.add(
        createModelPart(
          new THREE.OctahedronGeometry(size.x * 0.08, 0),
          materialDefinition,
          options,
          { x: part.x, y: part.y, z: part.z, ry: Math.PI * 0.25 },
          {
            color: ORE_ACCENT_COLOR,
            roughness: 0.32,
            metalness: 0.2,
            emissive: ORE_ACCENT_COLOR,
            emissiveIntensity: 0.16
          }
        )
      )
    })
  }

  return group
}

function createUtilityBlockModel(pieceDefinition, materialDefinition, options) {
  var size = pieceDefinition.size
  var group = new THREE.Group()
  var bodyColor = tintColor(materialDefinition.color, 0, 0, -0.06)
  var plateColor = tintColor(materialDefinition.color, 0, 0, 0.08)

  group.add(
    createModelPart(
      new THREE.BoxGeometry(size.x * 0.92, size.y * 0.84, size.z * 0.92),
      materialDefinition,
      options,
      { x: 0, y: size.y * 0.42, z: 0 },
      { color: bodyColor, metalness: 0.24, roughness: 0.68 }
    )
  )
  group.add(
    createModelPart(
      new THREE.BoxGeometry(size.x * 0.94, size.y * 0.08, size.z * 0.94),
      materialDefinition,
      options,
      { x: 0, y: size.y * 0.92, z: 0 },
      { color: plateColor, metalness: 0.32, roughness: 0.58 }
    )
  )

  ;[
    { x: 0, y: size.y * 0.5, z: size.z * 0.44, w: size.x * 0.84, h: size.y * 0.1, d: size.z * 0.08 },
    { x: 0, y: size.y * 0.5, z: -size.z * 0.44, w: size.x * 0.84, h: size.y * 0.1, d: size.z * 0.08 },
    { x: size.x * 0.44, y: size.y * 0.5, z: 0, w: size.x * 0.08, h: size.y * 0.1, d: size.z * 0.84 },
    { x: -size.x * 0.44, y: size.y * 0.5, z: 0, w: size.x * 0.08, h: size.y * 0.1, d: size.z * 0.84 }
  ].forEach(function (part) {
    group.add(
      createModelPart(
        new THREE.BoxGeometry(part.w, part.h, part.d),
        materialDefinition,
        options,
        { x: part.x, y: part.y, z: part.z },
        { color: plateColor, metalness: 0.38, roughness: 0.54 }
      )
    )
  })

  return group
}

function createHayBaleModel(pieceDefinition, materialDefinition, options) {
  var size = pieceDefinition.size
  var group = new THREE.Group()
  var hayColor = tintColor(materialDefinition.color, 0.02, 0.08, 0.1)
  var bandColor = tintColor(materialDefinition.color, 0.03, -0.06, -0.2)

  group.add(
    createModelPart(
      new THREE.BoxGeometry(size.x * 0.94, size.y * 0.76, size.z * 0.94),
      materialDefinition,
      options,
      { x: 0, y: size.y * 0.38, z: 0 },
      { color: hayColor, roughness: 0.9 }
    )
  )

  ;[-1, 1].forEach(function (direction) {
    group.add(
      createModelPart(
        new THREE.BoxGeometry(size.x * 0.08, size.y * 0.8, size.z * 0.92),
        materialDefinition,
        options,
        { x: direction * size.x * 0.22, y: size.y * 0.38, z: 0 },
        { color: bandColor, roughness: 0.82 }
      )
    )
  })

  return group
}

function createLightCubeModel(pieceDefinition, materialDefinition, options) {
  var size = pieceDefinition.size
  var group = new THREE.Group()
  var frameColor = tintColor(materialDefinition.color, 0, 0, -0.08)

  group.add(
    createModelPart(
      new THREE.BoxGeometry(size.x * 0.98, size.y * 0.98, size.z * 0.98),
      materialDefinition,
      options,
      { x: 0, y: size.y * 0.49, z: 0 },
      {
        color: frameColor,
        roughness: 0.14,
        metalness: 0.18,
        transparent: true,
        opacity: 0.38
      }
    )
  )
  group.add(
    createModelPart(
      new THREE.BoxGeometry(size.x * 0.62, size.y * 0.62, size.z * 0.62),
      materialDefinition,
      options,
      { x: 0, y: size.y * 0.49, z: 0 },
      {
        color: LIGHT_GLOW_COLOR,
        roughness: 0.1,
        metalness: 0,
        emissive: LIGHT_GLOW_COLOR,
        emissiveIntensity: 1.25
      }
    )
  )

  return group
}

function applyPieceId(object, pieceId) {
  object.userData.pieceId = pieceId
  object.traverse(function (child) {
    child.userData.pieceId = pieceId
  })
}

function createPieceVisual(pieceDefinition, materialDefinition, options) {
  switch (pieceDefinition.id) {
    case 'plank':
      return createPlankModel(pieceDefinition, materialDefinition, options)
    case 'ladder':
      return createLadderModel(pieceDefinition, materialDefinition, options)
    case 'post':
      return createPostModel(pieceDefinition, materialDefinition, options)
    case 'floor-tile':
      return createFloorTileModel(pieceDefinition, materialDefinition, options)
    case 'stair':
      return createStairModel(pieceDefinition, materialDefinition, options)
    case 'decor':
      return createDecorModel(pieceDefinition, materialDefinition, options)
    case 'wall-block':
      return createWallBlockModel(pieceDefinition, materialDefinition, options)
    case 'pillar-block':
      return createPillarBlockModel(pieceDefinition, materialDefinition, options)
    case 'pattern-block':
      return createPatternBlockModel(pieceDefinition, materialDefinition, options)
    case 'road-tile':
      return createRoadTileModel(pieceDefinition, materialDefinition, options)
    case 'terrain-block':
      return createTerrainBlockModel(pieceDefinition, materialDefinition, options)
    case 'rock-block':
      return createRockClusterModel(pieceDefinition, materialDefinition, options, false)
    case 'ore-block':
      return createRockClusterModel(pieceDefinition, materialDefinition, options, true)
    case 'utility-block':
      return createUtilityBlockModel(pieceDefinition, materialDefinition, options)
    case 'hay-bale':
      return createHayBaleModel(pieceDefinition, materialDefinition, options)
    case 'light-cube':
      return createLightCubeModel(pieceDefinition, materialDefinition, options)
    default:
      return createCubeModel(pieceDefinition, materialDefinition, options)
  }
}

export function createPieceMesh(piece, options) {
  var pieceDefinition = getPieceDefinition(piece.pieceType)
  var materialDefinition = getMaterialDefinition(piece.materialToken)
  var mesh = new THREE.Group()

  mesh.add(createPieceVisual(pieceDefinition, materialDefinition, options))
  mesh.position.set(piece.x, piece.y, piece.z)
  mesh.rotation.y = THREE.MathUtils.degToRad(piece.rotation || 0)
  mesh.userData = {
    pieceId: piece.id,
    layerIndex: piece.y,
    baseY: piece.y,
    materialToken: piece.materialToken,
    wireframe: Boolean(options?.wireframe)
  }
  applyPieceId(mesh, piece.id)

  return mesh
}

export function applyPieceTransform(mesh, piece) {
  mesh.position.set(piece.x, piece.y, piece.z)
  mesh.rotation.y = THREE.MathUtils.degToRad(piece.rotation || 0)
  mesh.userData.baseY = piece.y
  mesh.userData.layerIndex = piece.y
  applyPieceId(mesh, piece.id)
}

function applyMaterialStyle(material, style) {
  var baseOpacity = material.userData?.baseOpacity ?? 1
  var baseTransparent = Boolean(material.userData?.baseTransparent)

  material.wireframe = Boolean(style.wireframe)

  if (style.mode === 'ghost') {
    material.transparent = true
    material.opacity = Math.min(baseOpacity, 0.52)
  } else {
    material.transparent = baseTransparent
    material.opacity = baseOpacity
  }

  material.needsUpdate = true
}

export function updateMeshStyle(mesh, style) {
  mesh.traverse(function (child) {
    if (!child.isMesh || !child.material) {
      return
    }

    if (Array.isArray(child.material)) {
      child.material.forEach(function (material) {
        applyMaterialStyle(material, style)
      })
      return
    }

    applyMaterialStyle(child.material, style)
  })
}

export function disposePieceObject(object) {
  object.traverse(function (node) {
    if (node.geometry) {
      node.geometry.dispose()
    }

    if (!node.material) {
      return
    }

    if (Array.isArray(node.material)) {
      node.material.forEach(function (material) {
        material.dispose()
      })
      return
    }

    node.material.dispose()
  })
}

export function summarizeVisibleMaterials(pieces, visibleLayerMode, currentLayer) {
  var visiblePieces = pieces.filter(function (piece) {
    if (visibleLayerMode === 'current') {
      return piece.y === currentLayer
    }

    if (visibleLayerMode === 'current-and-below') {
      return piece.y <= currentLayer
    }

    return true
  })

  return summarizeMaterials(visiblePieces)
}
