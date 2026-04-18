import {
  createEditorPayload,
  createPiece,
  getPieceDefinition,
  pieceKey,
  sortPieces
} from './piece-library.js'
import { clampCoordToGrid } from '../utils/template-size.js'

export function createEditorState(initialDraft) {
  var listeners = []
  var historyPast = []
  var historyFuture = []
  var state = {
    grid: initialDraft?.editorDataJson?.grid || { width: 16, height: 12, depth: 16 },
    pieces: sortPieces((initialDraft?.editorDataJson?.pieces || []).map(createPiece)),
    layerMeta: mapLayers(initialDraft?.layerData || initialDraft?.editorDataJson?.layers || []),
    selectedPieceType: 'cube',
    selectedMaterialToken: 'pine',
    selectedRotation: 0,
    activeLayer: 0,
    mode: 'place',
    notes: initialDraft?.description || initialDraft?.editorDataJson?.notes || '',
    hoverCoord: null
  }

  function emit() {
    listeners.forEach(function (listener) {
      listener(getSnapshot())
    })
  }

  function maxLayerIndex() {
    return Math.max(0, Number(state.grid?.height || 1) - 1)
  }

  function pushHistory() {
    historyPast.push(structuredClone({
      pieces: state.pieces,
      layerMeta: state.layerMeta,
      notes: state.notes
    }))

    if (historyPast.length > 80) {
      historyPast.shift()
    }
    historyFuture = []
  }

  function getSnapshot() {
    return {
      grid: structuredClone(state.grid),
      pieces: structuredClone(state.pieces),
      layerMeta: structuredClone(state.layerMeta),
      selectedPieceType: state.selectedPieceType,
      selectedMaterialToken: state.selectedMaterialToken,
      selectedRotation: state.selectedRotation,
      activeLayer: state.activeLayer,
      mode: state.mode,
      notes: state.notes,
      hoverCoord: state.hoverCoord
    }
  }

  return {
    subscribe(listener) {
      listeners.push(listener)
      listener(getSnapshot())
    },
    getState() {
      return getSnapshot()
    },
    setMode(mode) {
      state.mode = mode
      emit()
    },
    setPieceType(pieceType) {
      state.selectedPieceType = pieceType
      emit()
    },
    setMaterialToken(materialToken) {
      state.selectedMaterialToken = materialToken
      emit()
    },
    setRotation(rotation) {
      state.selectedRotation = Number(rotation)
      emit()
    },
    setActiveLayer(layerIndex) {
      state.activeLayer = Math.min(maxLayerIndex(), Math.max(0, Number(layerIndex)))
      emit()
    },
    setHoverCoord(coord) {
      state.hoverCoord = coord
      emit()
    },
    setLayerMeta(layerIndex, values) {
      state.layerMeta[layerIndex] = {
        layerName: values.layerName || 'Layer ' + (Number(layerIndex) + 1),
        note: values.note || ''
      }
      emit()
    },
    setNotes(notes) {
      state.notes = notes
      emit()
    },
    addPieceAt(coord) {
      var nextCoord = clampCoordToGrid(coord, state.grid)
      var candidate = createPiece({
        pieceType: state.selectedPieceType,
        materialToken: state.selectedMaterialToken,
        x: nextCoord.x,
        y: nextCoord.y,
        z: nextCoord.z,
        rotation: state.selectedRotation
      })

      pushHistory()
      state.pieces = sortPieces(
        state.pieces.filter(function (piece) {
          return pieceKey(piece) !== pieceKey(candidate)
        }).concat(candidate)
      )
      emit()
    },
    removePieceAt(coord) {
      var nextPieces = state.pieces.filter(function (piece) {
        return !(piece.x === coord.x && piece.y === coord.y && piece.z === coord.z)
      })

      if (nextPieces.length === state.pieces.length) {
        return
      }

      pushHistory()
      state.pieces = sortPieces(nextPieces)
      emit()
    },
    removePieceById(pieceId) {
      var nextPieces = state.pieces.filter(function (piece) {
        return piece.id !== pieceId
      })

      if (nextPieces.length === state.pieces.length) {
        return
      }

      pushHistory()
      state.pieces = sortPieces(nextPieces)
      emit()
    },
    clearLayer(layerIndex) {
      pushHistory()
      state.pieces = sortPieces(
        state.pieces.filter(function (piece) {
          return piece.y !== layerIndex
        })
      )
      emit()
    },
    clearAll() {
      pushHistory()
      state.pieces = []
      emit()
    },
    undo() {
      var previous = historyPast.pop()

      if (!previous) {
        return
      }

      historyFuture.push(structuredClone({
        pieces: state.pieces,
        layerMeta: state.layerMeta,
        notes: state.notes
      }))
      state.pieces = previous.pieces
      state.layerMeta = previous.layerMeta
      state.notes = previous.notes
      emit()
    },
    redo() {
      var next = historyFuture.pop()

      if (!next) {
        return
      }

      historyPast.push(structuredClone({
        pieces: state.pieces,
        layerMeta: state.layerMeta,
        notes: state.notes
      }))
      state.pieces = next.pieces
      state.layerMeta = next.layerMeta
      state.notes = next.notes
      emit()
    },
    importPayload(payload) {
      pushHistory()
      state.grid = payload.grid || state.grid
      state.pieces = sortPieces((payload.pieces || []).map(createPiece))
      state.layerMeta = mapLayers(payload.layers || [])
      state.notes = payload.notes || state.notes
      state.activeLayer = Math.min(state.activeLayer, maxLayerIndex())
      emit()
    },
    toEditorPayload(buildId) {
      return createEditorPayload(buildId, {
        pieces: state.pieces,
        grid: state.grid,
        layerMeta: state.layerMeta,
        notes: state.notes
      })
    },
    getLayerCount() {
      return Math.max(
        state.activeLayer + 1,
        state.pieces.reduce(function (maxLayer, piece) {
          return Math.max(maxLayer, piece.y + 1)
        }, 0)
      )
    },
    getSelectedPieceDefinition() {
      return getPieceDefinition(state.selectedPieceType)
    }
  }
}

function mapLayers(layers) {
  return (layers || []).reduce(function (accumulator, layer) {
    accumulator[layer.layerIndex] = {
      layerName: layer.layerName || 'Layer ' + (layer.layerIndex + 1),
      note: layer.note || ''
    }
    return accumulator
  }, {})
}
