import * as THREE from 'three'
import {
  getMaterialDefinition,
  getPieceDefinition,
  summarizeMaterials
} from '../editor/piece-library.js'

function createPieceMaterial(materialDefinition, options) {
  return new THREE.MeshStandardMaterial({
    color: materialDefinition.color,
    roughness: 0.78,
    metalness: 0.08,
    wireframe: Boolean(options?.wireframe)
  })
}

function createModelPart(geometry, materialDefinition, options, position) {
  var mesh = new THREE.Mesh(geometry, createPieceMaterial(materialDefinition, options))
  mesh.castShadow = true
  mesh.receiveShadow = true

  if (position) {
    mesh.position.set(position.x || 0, position.y || 0, position.z || 0)
  }

  return mesh
}

function applyPieceId(object, pieceId) {
  object.userData.pieceId = pieceId
  object.traverse(function (child) {
    child.userData.pieceId = pieceId
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

function createPieceVisual(pieceDefinition, materialDefinition, options) {
  if (pieceDefinition.id === 'plank') {
    return createPlankModel(pieceDefinition, materialDefinition, options)
  }

  if (pieceDefinition.id === 'ladder') {
    return createLadderModel(pieceDefinition, materialDefinition, options)
  }

  if (pieceDefinition.id === 'post') {
    return createPostModel(pieceDefinition, materialDefinition, options)
  }

  if (pieceDefinition.id === 'floor-tile') {
    return createFloorTileModel(pieceDefinition, materialDefinition, options)
  }

  if (pieceDefinition.id === 'stair') {
    return createStairModel(pieceDefinition, materialDefinition, options)
  }

  if (pieceDefinition.id === 'decor') {
    return createDecorModel(pieceDefinition, materialDefinition, options)
  }

  return createCubeModel(pieceDefinition, materialDefinition, options)
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

export function updateMeshStyle(mesh, style) {
  mesh.traverse(function (child) {
    if (!child.isMesh || !child.material) {
      return
    }

    if (Array.isArray(child.material)) {
      child.material.forEach(function (material) {
        material.wireframe = Boolean(style.wireframe)
        material.transparent = style.mode === 'ghost'
        material.opacity = style.mode === 'ghost' ? 0.52 : 1
      })
      return
    }

    child.material.wireframe = Boolean(style.wireframe)
    child.material.transparent = style.mode === 'ghost'
    child.material.opacity = style.mode === 'ghost' ? 0.52 : 1
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
