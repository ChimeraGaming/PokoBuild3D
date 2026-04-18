import { showToast } from '../components/toast.js'
import { createEditorState } from '../editor/editor-state.js'
import { MATERIAL_TOKENS, PIECE_LIBRARY, summarizeMaterials } from '../editor/piece-library.js'
import { LOCATION_SUGGESTIONS, composeBuildTags, normalizeLocation } from '../utils/build-taxonomy.js'
import { uniqueId } from '../utils/format.js'
import { parseJsonFile } from '../utils/storage.js'
import { normalizeTemplateSize } from '../utils/template-size.js'
import {
  clearEditorDraft,
  loadCreateDraft,
  loadEditorDraft,
  saveCreateDraft,
  saveEditorDraft
} from '../utils/workspace.js'

function optionList(items, valueSelector, labelSelector, selectedValue) {
  return items
    .map(function (item) {
      var value = valueSelector(item)
      return (
        '<option value="' +
        value +
        '" ' +
        (value === selectedValue ? 'selected' : '') +
        '>' +
        labelSelector(item) +
        '</option>'
      )
    })
    .join('')
}

function renderMaterialSummary(materials) {
  if (!materials.length) {
    return '<p class="muted">No pieces placed yet.</p>'
  }

  return (
    '<ul class="list-clean">' +
    materials
      .map(function (item) {
        return '<li>' + item.itemName + ' x' + item.qtyRequired + '</li>'
      })
      .join('') +
    '</ul>'
  )
}

function renderLocationOptions(selectedValue) {
  var normalizedSelectedValue = normalizeLocation(selectedValue)

  return LOCATION_SUGGESTIONS.map(function (location) {
    return (
      '<option value="' +
      location +
      '"' +
      (location === normalizedSelectedValue ? ' selected' : '') +
      '>' +
      location +
      '</option>'
    )
  }).join('')
}

async function resolveInitialDraft(context) {
  if (context.query.remix) {
    var remixSource = await context.api.getBuildBySlug(context.query.remix)
    if (remixSource) {
      var remixDraft = {
        ...remixSource,
        id: uniqueId('build'),
        title: remixSource.title + ' Remix',
        slug: '',
        isPublished: false,
        originalBuildId: remixSource.originalBuildId || remixSource.id
      }
      saveCreateDraft(remixDraft)
      clearEditorDraft()
      return remixDraft
    }
  }

  var editorDraft = loadEditorDraft()
  if (editorDraft) {
    return editorDraft
  }

  var createDraft = loadCreateDraft()
  if (createDraft) {
    return createDraft
  }

  return context.api.createDraftFromTemplate({})
}

export var editorPage = {
  path: '/editor',
  title: '3D Editor',
  requiresAuth: true,
  async render(context) {
    var draft = await resolveInitialDraft(context)
    var selectedPiece = PIECE_LIBRARY[0].id
    var selectedMaterial = Object.keys(MATERIAL_TOKENS)[0]
    var templateSize = normalizeTemplateSize(draft.templateSize, draft.editorDataJson?.grid)
    var location = normalizeLocation(draft.location || draft.biome || '')
    context.editorDraft = draft

    return (
      '<section class="shell page-stack editor-shell">' +
      '<div class="split-row"><div><span class="eyebrow">Browser editor</span><h1>3D schematic editor</h1></div><a class="button button-secondary" href="#/create">Back to metadata</a></div>' +
      '<div class="editor-layout">' +
      '<section class="card editor-workspace">' +
      '<div class="editor-toolbar">' +
      '<label>Piece<select id="editor-piece-type">' +
      optionList(
        PIECE_LIBRARY,
        function (piece) {
          return piece.id
        },
        function (piece) {
          return piece.name
        },
        selectedPiece
      ) +
      '</select></label>' +
      '<label>Material<select id="editor-material-token">' +
      optionList(
        Object.values(MATERIAL_TOKENS),
        function (token) {
          return token.id
        },
        function (token) {
          return token.name
        },
        selectedMaterial
      ) +
      '</select></label>' +
      '<label>Rotation<select id="editor-rotation"><option value="0">0</option><option value="90">90</option><option value="180">180</option><option value="270">270</option></select></label>' +
      '<button class="button button-secondary is-active" id="editor-mode-place" type="button">Place</button>' +
      '<button class="button button-secondary" id="editor-mode-remove" type="button">Remove</button>' +
      '<button class="button button-ghost" id="editor-undo" type="button">Undo</button>' +
      '<button class="button button-ghost" id="editor-redo" type="button">Redo</button>' +
      '<button class="button button-ghost" id="editor-clear-layer" type="button">Clear layer</button>' +
      '<button class="button button-ghost" id="editor-clear-all" type="button">Clear build</button>' +
      '<button class="button button-ghost" id="editor-reset-camera" type="button">Reset camera</button>' +
      '</div>' +
      '<div id="editor-canvas" class="editor-canvas"></div>' +
      '<div class="editor-footerbar">' +
      '<div class="button-row">' +
      '<button class="button button-ghost" id="editor-import-json" type="button">Import JSON</button>' +
      '<button class="button button-ghost" id="editor-export-json" type="button">Export JSON</button>' +
      '<input id="editor-import-file" type="file" accept="application/json" hidden />' +
      '</div>' +
      '<div class="editor-readout">Hover coord: <strong id="editor-hover-readout">0, 0, 0</strong></div>' +
      '</div>' +
      '</section>' +
      '<aside class="card editor-sidebar stack">' +
      '<label>Title<input id="editor-title" type="text" value="' +
      (draft.title || '') +
      '" placeholder="Untitled build" /></label>' +
      '<label>Location<select id="editor-location"><option value="">Choose a location</option>' +
      renderLocationOptions(location) +
      '</select></label>' +
      '<label>Difficulty<select id="editor-difficulty"><option value="beginner">Beginner friendly</option><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label>' +
      '<label>Tags<input id="editor-tags" type="text" value="' +
      (draft.extraTags || '') +
      '" placeholder="garden, decor, beginner" /></label>' +
      '<div class="inset-panel"><strong>Template size</strong><p class="muted">' +
      templateSize +
      ' workspace</p></div>' +
      '<label>Active layer<input id="editor-layer-input" type="number" min="0" value="0" /></label>' +
      '<label>Layer name<input id="editor-layer-name" type="text" placeholder="Layer 1" /></label>' +
      '<label>Layer note<textarea id="editor-layer-note" rows="4" placeholder="Optional note for this layer"></textarea></label>' +
      '<label>Build notes<textarea id="editor-notes" rows="5" placeholder="Instructions for the full build">' +
      (draft.description || '') +
      '</textarea></label>' +
      '<div class="inset-panel stack">' +
      '<strong>Build summary</strong>' +
      '<div class="split-row"><span>Pieces</span><strong id="editor-piece-count">0</strong></div>' +
      '<div class="split-row"><span>Layers</span><strong id="editor-layer-count">1</strong></div>' +
      '<div id="editor-material-summary">' +
      renderMaterialSummary([]) +
      '</div>' +
      '</div>' +
      '<div class="button-row">' +
      '<button class="button button-secondary" id="editor-save-draft" type="button">Save Draft</button>' +
      '<button class="button button-primary" id="editor-publish" type="button">Publish Build</button>' +
      '</div>' +
      '</aside>' +
      '</div>' +
      '</section>'
    )
  },
  async afterRender(context) {
    var editorCanvasModule = await import('../editor/editor-canvas.js')
    var EditorCanvas = editorCanvasModule.EditorCanvas
    var draft = context.editorDraft
    var buildId = draft.id || uniqueId('build')
    var editorState = createEditorState({
      ...draft,
      id: buildId
    })
    var canvas = new EditorCanvas(document.getElementById('editor-canvas'), editorState, {})
    var pieceSelect = document.getElementById('editor-piece-type')
    var materialSelect = document.getElementById('editor-material-token')
    var rotationSelect = document.getElementById('editor-rotation')
    var hoverReadout = document.getElementById('editor-hover-readout')
    var layerInput = document.getElementById('editor-layer-input')
    var layerNameInput = document.getElementById('editor-layer-name')
    var layerNoteInput = document.getElementById('editor-layer-note')
    var notesInput = document.getElementById('editor-notes')
    var titleInput = document.getElementById('editor-title')
    var locationInput = document.getElementById('editor-location')
    var difficultyInput = document.getElementById('editor-difficulty')
    var tagsInput = document.getElementById('editor-tags')
    var importInput = document.getElementById('editor-import-file')
    var pieceCountNode = document.getElementById('editor-piece-count')
    var layerCountNode = document.getElementById('editor-layer-count')
    var materialSummaryNode = document.getElementById('editor-material-summary')

    difficultyInput.value = draft.difficulty || 'easy'

    function composeBuildRecord(isPublished) {
      var payload = editorState.toEditorPayload(buildId)
      var materials = summarizeMaterials(payload.pieces)
      var layerData = payload.layers
      var location = normalizeLocation(locationInput.value || draft.location || draft.biome || '')
      return {
        ...draft,
        id: buildId,
        title: titleInput.value || 'Untitled build',
        description: notesInput.value,
        biome: location,
        category: 'model',
        difficulty: difficultyInput.value,
        tags: composeBuildTags(
          {
            location: location,
            originType: draft.originType || 'my',
            creatorKnown: draft.creatorKnown,
            originalCreator: draft.originalCreator,
            extraTags: tagsInput.value
          },
          context.session.profile.username
        ),
        editorDataJson: payload,
        layerData: layerData,
        materials: materials,
        modelType: 'editor',
        assetKind: 'model',
        modelSource: 'editor',
        location: location,
        extraTags: tagsInput.value,
        templateSize: normalizeTemplateSize(draft.templateSize, payload.grid),
        isPublished: isPublished
      }
    }

    function syncLayerInputs(snapshot) {
      var layerMeta = snapshot.layerMeta[snapshot.activeLayer] || {
        layerName: 'Layer ' + (snapshot.activeLayer + 1),
        note: ''
      }
      layerInput.max = String(Math.max(0, Number(snapshot.grid?.height || 1) - 1))
      layerInput.value = String(snapshot.activeLayer)
      layerNameInput.value = layerMeta.layerName
      layerNoteInput.value = layerMeta.note
      notesInput.value = snapshot.notes
      pieceCountNode.textContent = String(snapshot.pieces.length)
      layerCountNode.textContent = String(editorState.getLayerCount())
      materialSummaryNode.innerHTML = renderMaterialSummary(summarizeMaterials(snapshot.pieces))
      hoverReadout.textContent = snapshot.hoverCoord
        ? snapshot.hoverCoord.x + ', ' + snapshot.hoverCoord.y + ', ' + snapshot.hoverCoord.z
        : '0, 0, 0'
      saveEditorDraft({
        ...composeBuildRecord(false),
        editorDataJson: editorState.toEditorPayload(buildId)
      })
    }

    editorState.subscribe(syncLayerInputs)
    editorState.setPieceType(pieceSelect.value)
    editorState.setMaterialToken(materialSelect.value)
    editorState.setRotation(rotationSelect.value)

    pieceSelect.addEventListener('change', function () {
      editorState.setPieceType(pieceSelect.value)
    })
    materialSelect.addEventListener('change', function () {
      editorState.setMaterialToken(materialSelect.value)
    })
    rotationSelect.addEventListener('change', function () {
      editorState.setRotation(rotationSelect.value)
    })

    document.getElementById('editor-mode-place').addEventListener('click', function () {
      editorState.setMode('place')
    })
    document.getElementById('editor-mode-remove').addEventListener('click', function () {
      editorState.setMode('remove')
    })
    document.getElementById('editor-undo').addEventListener('click', function () {
      editorState.undo()
    })
    document.getElementById('editor-redo').addEventListener('click', function () {
      editorState.redo()
    })
    document.getElementById('editor-clear-layer').addEventListener('click', function () {
      editorState.clearLayer(Number(layerInput.value))
    })
    document.getElementById('editor-clear-all').addEventListener('click', function () {
      editorState.clearAll()
    })
    document.getElementById('editor-reset-camera').addEventListener('click', function () {
      canvas.resetCamera()
    })
    layerInput.addEventListener('change', function () {
      editorState.setActiveLayer(Number(layerInput.value))
    })
    layerNameInput.addEventListener('input', function () {
      editorState.setLayerMeta(Number(layerInput.value), {
        layerName: layerNameInput.value,
        note: layerNoteInput.value
      })
    })
    layerNoteInput.addEventListener('input', function () {
      editorState.setLayerMeta(Number(layerInput.value), {
        layerName: layerNameInput.value,
        note: layerNoteInput.value
      })
    })
    notesInput.addEventListener('input', function () {
      editorState.setNotes(notesInput.value)
    })

    document.getElementById('editor-import-json').addEventListener('click', function () {
      importInput.click()
    })
    importInput.addEventListener('change', async function () {
      try {
        var payload = await parseJsonFile(importInput.files[0])
        if (payload) {
          editorState.importPayload(payload)
          showToast('JSON imported.', 'success')
        }
      } catch (error) {
        showToast('That JSON file could not be loaded.', 'error')
      }
    })
    document.getElementById('editor-export-json').addEventListener('click', function () {
      var payload = editorState.toEditorPayload(buildId)
      var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      var url = URL.createObjectURL(blob)
      var link = document.createElement('a')
      link.href = url
      link.download = (titleInput.value || 'pokobuild') + '.json'
      link.click()
      URL.revokeObjectURL(url)
    })

    document.getElementById('editor-save-draft').addEventListener('click', async function () {
      try {
        var buildRecord = composeBuildRecord(false)
        var saved = await context.api.saveBuild(buildRecord, context.session.profile)
        var savedDraft = {
          ...saved,
          originType: buildRecord.originType,
          creatorKnown: buildRecord.creatorKnown,
          originalCreator: buildRecord.originalCreator,
          location: buildRecord.location,
          extraTags: buildRecord.extraTags,
          templateSize: buildRecord.templateSize
        }
        saveCreateDraft(savedDraft)
        saveEditorDraft(savedDraft)
        showToast('Draft saved.', 'success')
      } catch (error) {
        showToast(error.message, 'error')
      }
    })

    document.getElementById('editor-publish').addEventListener('click', async function () {
      try {
        var buildRecord = composeBuildRecord(true)
        var saved = await context.api.saveBuild(buildRecord, context.session.profile)
        var savedDraft = {
          ...saved,
          originType: buildRecord.originType,
          creatorKnown: buildRecord.creatorKnown,
          originalCreator: buildRecord.originalCreator,
          location: buildRecord.location,
          extraTags: buildRecord.extraTags,
          templateSize: buildRecord.templateSize
        }
        saveCreateDraft(savedDraft)
        saveEditorDraft(savedDraft)
        showToast('Build published.', 'success')
        context.router.navigate('/build/' + saved.slug)
      } catch (error) {
        showToast(error.message, 'error')
      }
    })

    return function () {
      canvas.destroy()
    }
  }
}
