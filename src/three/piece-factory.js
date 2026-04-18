import * as THREE from 'three'
import {
  getMaterialDefinition,
  getPieceDefinition,
  summarizeMaterials
} from '../editor/piece-library.js'

var geometryCache = new Map()

function getGeometry(pieceDefinition) {
  if (geometryCache.has(pieceDefinition.id)) {
    return geometryCache.get(pieceDefinition.id)
  }

  var geometry
  var size = pieceDefinition.size

  if (pieceDefinition.mesh === 'stair') {
    var shape = new THREE.Shape()
    shape.moveTo(-0.5, -0.5)
    shape.lineTo(0.5, -0.5)
    shape.lineTo(0.5, 0.5)
    shape.lineTo(-0.5, -0.15)
    shape.closePath()
    geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 1,
      bevelEnabled: false
    })
    geometry.translate(0, 0, -0.5)
    geometry.rotateX(Math.PI / 2)
    geometry.scale(size.x, size.y, size.z)
  } else if (pieceDefinition.mesh === 'bevel') {
    geometry = new THREE.CylinderGeometry(0.32, 0.46, size.y, 6, 1)
  } else {
    geometry = new THREE.BoxGeometry(size.x, size.y, size.z)
  }

  geometryCache.set(pieceDefinition.id, geometry)
  return geometry
}

export function createPieceMesh(piece, options) {
  var pieceDefinition = getPieceDefinition(piece.pieceType)
  var materialDefinition = getMaterialDefinition(piece.materialToken)
  var geometry = getGeometry(pieceDefinition)
  var material = new THREE.MeshStandardMaterial({
    color: materialDefinition.color,
    roughness: 0.78,
    metalness: 0.08,
    wireframe: Boolean(options?.wireframe)
  })
  var mesh = new THREE.Mesh(geometry, material)
  var halfHeight = pieceDefinition.size.y / 2

  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.position.set(piece.x, piece.y + halfHeight, piece.z)
  mesh.rotation.y = THREE.MathUtils.degToRad(piece.rotation || 0)
  mesh.userData = {
    pieceId: piece.id,
    layerIndex: piece.y,
    baseY: piece.y + halfHeight,
    materialToken: piece.materialToken
  }

  return mesh
}

export function applyPieceTransform(mesh, piece) {
  var pieceDefinition = getPieceDefinition(piece.pieceType)
  var halfHeight = pieceDefinition.size.y / 2

  mesh.position.set(piece.x, piece.y + halfHeight, piece.z)
  mesh.rotation.y = THREE.MathUtils.degToRad(piece.rotation || 0)
  mesh.userData.baseY = piece.y + halfHeight
  mesh.userData.layerIndex = piece.y
}

export function updateMeshStyle(mesh, style) {
  mesh.material.wireframe = Boolean(style.wireframe)
  mesh.material.transparent = style.mode === 'ghost'
  mesh.material.opacity = style.mode === 'ghost' ? 0.52 : 1
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
