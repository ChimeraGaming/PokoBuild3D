import { countUnique, uniqueId } from '../utils/format.js'

export var MODEL_LIBRARY_GROUPS = [
  {
    id: 'blocks',
    name: 'Blocks',
    assetFolder: 'Images/Models/Blocks'
  },
  {
    id: 'liquid',
    name: 'Liquid',
    assetFolder: 'Images/Models/Liquid'
  },
  {
    id: 'etc',
    name: 'Etc',
    assetFolder: 'Images/Models/Etc'
  }
]

export var MATERIAL_TOKENS = {
  pine: {
    id: 'pine',
    name: 'Pine',
    color: '#d7b07f'
  },
  mosswood: {
    id: 'mosswood',
    name: 'Mosswood',
    color: '#8d714d'
  },
  forest: {
    id: 'forest',
    name: 'Forest Paint',
    color: '#456950'
  },
  cream: {
    id: 'cream',
    name: 'Cream Glaze',
    color: '#f4ead5'
  },
  clay: {
    id: 'clay',
    name: 'Clay',
    color: '#c87b5c'
  },
  slate: {
    id: 'slate',
    name: 'Slate',
    color: '#66717d'
  },
  vine: {
    id: 'vine',
    name: 'Vine',
    color: '#6f8b4d'
  },
  canvas: {
    id: 'canvas',
    name: 'Canvas',
    color: '#dccba6'
  },
  glass: {
    id: 'glass',
    name: 'Glass',
    color: '#b8d9df'
  }
}

export var PIECE_LIBRARY = [
  {
    id: 'cube',
    name: 'Cube block',
    category: 'structure',
    libraryGroup: 'blocks',
    coverageTier: 'test',
    size: { x: 1, y: 1, z: 1 },
    defaultMaterial: 'pine',
    mesh: 'box'
  },
  {
    id: 'plank',
    name: 'Plank block',
    category: 'structure',
    libraryGroup: 'blocks',
    coverageTier: 'test',
    size: { x: 1, y: 0.4, z: 1 },
    defaultMaterial: 'mosswood',
    mesh: 'box'
  },
  {
    id: 'ladder',
    name: 'Ladder panel',
    category: 'detail',
    libraryGroup: 'blocks',
    coverageTier: 'test',
    size: { x: 1, y: 1, z: 0.2 },
    defaultMaterial: 'cream',
    mesh: 'panel'
  },
  {
    id: 'post',
    name: 'Post',
    category: 'structure',
    libraryGroup: 'blocks',
    coverageTier: 'test',
    size: { x: 0.35, y: 1.2, z: 0.35 },
    defaultMaterial: 'forest',
    mesh: 'post'
  },
  {
    id: 'floor-tile',
    name: 'Floor tile',
    category: 'surface',
    libraryGroup: 'blocks',
    coverageTier: 'test',
    size: { x: 1, y: 0.18, z: 1 },
    defaultMaterial: 'slate',
    mesh: 'tile'
  },
  {
    id: 'stair',
    name: 'Stair wedge',
    category: 'structure',
    libraryGroup: 'blocks',
    coverageTier: 'test',
    size: { x: 1, y: 1, z: 1 },
    defaultMaterial: 'pine',
    mesh: 'stair'
  },
  {
    id: 'decor',
    name: 'Decor piece',
    category: 'detail',
    libraryGroup: 'blocks',
    coverageTier: 'test',
    size: { x: 0.8, y: 0.6, z: 0.8 },
    defaultMaterial: 'clay',
    mesh: 'bevel'
  },
  {
    id: 'wall-block',
    name: 'Wall block',
    category: 'structure',
    libraryGroup: 'blocks',
    coverageTier: 'actual',
    size: { x: 1, y: 1, z: 1 },
    defaultMaterial: 'slate',
    mesh: 'wall'
  },
  {
    id: 'pillar-block',
    name: 'Pillar block',
    category: 'structure',
    libraryGroup: 'blocks',
    coverageTier: 'actual',
    size: { x: 0.58, y: 1.2, z: 0.58 },
    defaultMaterial: 'slate',
    mesh: 'pillar'
  },
  {
    id: 'pattern-block',
    name: 'Pattern block',
    category: 'surface',
    libraryGroup: 'blocks',
    coverageTier: 'actual',
    size: { x: 1, y: 1, z: 1 },
    defaultMaterial: 'cream',
    mesh: 'pattern'
  },
  {
    id: 'road-tile',
    name: 'Road tile',
    category: 'surface',
    libraryGroup: 'blocks',
    coverageTier: 'actual',
    size: { x: 1, y: 0.18, z: 1 },
    defaultMaterial: 'slate',
    mesh: 'road'
  },
  {
    id: 'terrain-block',
    name: 'Terrain block',
    category: 'terrain',
    libraryGroup: 'blocks',
    coverageTier: 'actual',
    size: { x: 1, y: 1, z: 1 },
    defaultMaterial: 'vine',
    mesh: 'terrain'
  },
  {
    id: 'rock-block',
    name: 'Rock block',
    category: 'stone',
    libraryGroup: 'blocks',
    coverageTier: 'actual',
    size: { x: 1, y: 1, z: 1 },
    defaultMaterial: 'slate',
    mesh: 'rock'
  },
  {
    id: 'ore-block',
    name: 'Ore block',
    category: 'stone',
    libraryGroup: 'blocks',
    coverageTier: 'actual',
    size: { x: 1, y: 1, z: 1 },
    defaultMaterial: 'slate',
    mesh: 'ore'
  },
  {
    id: 'utility-block',
    name: 'Utility block',
    category: 'utility',
    libraryGroup: 'blocks',
    coverageTier: 'actual',
    size: { x: 1, y: 1, z: 1 },
    defaultMaterial: 'slate',
    mesh: 'utility'
  },
  {
    id: 'hay-bale',
    name: 'Hay bale',
    category: 'utility',
    libraryGroup: 'blocks',
    coverageTier: 'actual',
    size: { x: 1, y: 0.75, z: 1 },
    defaultMaterial: 'pine',
    mesh: 'hay'
  },
  {
    id: 'light-cube',
    name: 'Light cube',
    category: 'utility',
    libraryGroup: 'blocks',
    coverageTier: 'actual',
    size: { x: 1, y: 1, z: 1 },
    defaultMaterial: 'glass',
    mesh: 'light'
  }
]

export function getPiecesForLibraryGroup(groupId) {
  if (!groupId || groupId === 'all') {
    return PIECE_LIBRARY.slice()
  }

  return PIECE_LIBRARY.filter(function (piece) {
    return piece.libraryGroup === groupId
  })
}

export function getPieceDefinition(pieceType) {
  return PIECE_LIBRARY.find(function (piece) {
    return piece.id === pieceType
  }) || PIECE_LIBRARY[0]
}

export function getMaterialDefinition(materialToken) {
  return MATERIAL_TOKENS[materialToken] || MATERIAL_TOKENS.pine
}

export function createPiece(partialPiece) {
  var pieceDefinition = getPieceDefinition(partialPiece.pieceType)
  return {
    id: partialPiece.id || uniqueId('piece'),
    pieceType: pieceDefinition.id,
    materialToken: partialPiece.materialToken || pieceDefinition.defaultMaterial,
    x: Number(partialPiece.x || 0),
    y: Number(partialPiece.y || 0),
    z: Number(partialPiece.z || 0),
    rotation: Number(partialPiece.rotation || 0),
    metadata: partialPiece.metadata || {}
  }
}

export function pieceKey(piece) {
  return [piece.x, piece.y, piece.z].join(':')
}

export function sortPieces(pieces) {
  return pieces.slice().sort(function (left, right) {
    if (left.y !== right.y) {
      return left.y - right.y
    }

    if (left.z !== right.z) {
      return left.z - right.z
    }

    return left.x - right.x
  })
}

export function buildLayersFromPieces(pieces, namesByLayer) {
  var grouped = {}

  sortPieces(pieces).forEach(function (piece) {
    if (!grouped[piece.y]) {
      grouped[piece.y] = []
    }

    grouped[piece.y].push(piece)
  })

  return Object.keys(grouped)
    .map(function (layerIndex) {
      var numericIndex = Number(layerIndex)
      return {
        layerIndex: numericIndex,
        layerName:
          (namesByLayer && namesByLayer[numericIndex]?.layerName) ||
          'Layer ' + (numericIndex + 1),
        note: (namesByLayer && namesByLayer[numericIndex]?.note) || '',
        pieces: grouped[layerIndex]
      }
    })
    .sort(function (left, right) {
      return left.layerIndex - right.layerIndex
    })
}

export function summarizeMaterials(pieces) {
  var counts = countUnique(pieces, function (piece) {
    return piece.materialToken + '|' + piece.pieceType
  })

  return Array.from(counts.entries())
    .map(function (entry, index) {
      var tokens = entry[0].split('|')
      var material = getMaterialDefinition(tokens[0])
      var piece = getPieceDefinition(tokens[1])
      return {
        id: 'material-' + index,
        itemName: material.name + ' ' + piece.name,
        qtyRequired: entry[1],
        note: piece.category
      }
    })
    .sort(function (left, right) {
      return right.qtyRequired - left.qtyRequired
    })
}

export function createEditorPayload(buildId, values) {
  var pieces = sortPieces(
    (values.pieces || []).map(function (piece) {
      return createPiece(piece)
    })
  )
  var layers = buildLayersFromPieces(pieces, values.layerMeta)
  var materials = summarizeMaterials(pieces)

  return {
    version: '1.0.0',
    buildId: buildId,
    grid: values.grid || { width: 16, height: 12, depth: 16 },
    pieces: pieces,
    layers: layers.map(function (layer) {
      return {
        layerIndex: layer.layerIndex,
        layerName: layer.layerName,
        note: layer.note
      }
    }),
    materials: materials,
    camera: values.camera || {
      position: { x: 14, y: 14, z: 14 },
      target: { x: 0, y: 2, z: 0 }
    },
    notes: values.notes || ''
  }
}
