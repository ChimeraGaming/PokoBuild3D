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

function renderShortcutChip(keys, label) {
  return (
    '<div class="editor-shortcut-chip"><strong>' +
    keys +
    '</strong><span>' +
    label +
    '</span></div>'
  )
}

function renderEditorHelp() {
  return (
    '<section class="inset-panel editor-help-card">' +
    '<div class="editor-help-grid">' +
    '<div class="stack">' +
    '<strong>How to use the editor</strong>' +
    '<ol class="editor-help-list">' +
    '<li>Pick a piece, material, rotation, and layer in the builder bar.</li>' +
    '<li>Click a grid cell to place a piece, or switch to remove mode to delete.</li>' +
    '<li>Drag to orbit the view and scroll to zoom closer.</li>' +
    '<li>Use the notes field on the right for step by step build instructions.</li>' +
    '</ol>' +
    '</div>' +
    '<div class="stack">' +
    '<strong>Keyboard shortcuts</strong>' +
    '<div class="editor-shortcut-grid">' +
    renderShortcutChip('W A S D', 'Move the build cursor') +
    renderShortcutChip('Arrow keys', 'Move the build cursor') +
    renderShortcutChip('Q / E', 'Move layer down or up') +
    renderShortcutChip('Space / Enter', 'Place on the current cursor') +
    renderShortcutChip('Delete / Backspace', 'Remove at the current cursor') +
    renderShortcutChip('R', 'Rotate the selected piece') +
    renderShortcutChip('F', 'Toggle fullscreen') +
    '</div>' +
    '<p class="muted">Shortcuts pause while you are typing in a field.</p>' +
    '</div>' +
    '</div>' +
    '</section>'
  )
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
      '<section class="shell page-stack editor-shell editor-shell--wide">' +
      '<div class="split-row editor-page-header">' +
      '<div class="stack editor-page-copy">' +
      '<span class="eyebrow">Browser editor</span>' +
      '<h1>3D schematic editor</h1>' +
      '<p>Build in the large workspace first, then fill out the publish details on the right. The editor now supports keyboard placement and fullscreen.</p>' +
      '</div>' +
      '<div class="button-row">' +
      '<a class="button button-secondary" href="#/create">Back to metadata</a>' +
      '</div>' +
      '</div>' +
      '<div class="editor-layout editor-layout--wide">' +
      '<section class="card editor-workspace">' +
      '<div class="split-row editor-workspace-header">' +
      '<div class="stack editor-workspace-copy">' +
      '<strong>Build workspace</strong>' +
      '<p class="muted">Use the top controls to change pieces quickly, then build directly in the canvas.</p>' +
      '</div>' +
      '<div class="button-row">' +
      '<button class="button button-ghost" id="editor-fullscreen" type="button">Fullscreen</button>' +
      '<button class="button button-ghost" id="editor-reset-camera" type="button">Reset view</button>' +
      '</div>' +
      '</div>' +
      '<div class="editor-control-grid">' +
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
      '<label>Active layer<input id="editor-layer-input" type="number" min="0" value="0" /></label>' +
      '</div>' +
      '<div class="editor-toolbar editor-toolbar--workspace">' +
      '<button class="button button-secondary editor-mode-toggle is-active" id="editor-mode-place" type="button">Place</button>' +
      '<button class="button button-ghost editor-mode-toggle" id="editor-mode-remove" type="button">Remove</button>' +
      '<button class="button button-ghost" id="editor-undo" type="button">Undo</button>' +
      '<button class="button button-ghost" id="editor-redo" type="button">Redo</button>' +
      '<button class="button button-ghost" id="editor-clear-layer" type="button">Clear layer</button>' +
      '<button class="button button-ghost" id="editor-clear-all" type="button">Clear build</button>' +
      '</div>' +
      renderEditorHelp() +
      '<div id="editor-canvas-shell" class="editor-canvas-shell">' +
      '<div id="editor-canvas" class="editor-canvas"></div>' +
      '<div class="editor-canvas-hud">' +
      '<span class="editor-hud-pill">Mode <strong id="editor-mode-status">Place</strong></span>' +
      '<span class="editor-hud-pill">Layer <strong id="editor-layer-status">0</strong></span>' +
      '<span class="editor-hud-pill">Cursor <strong id="editor-hover-readout">0, 0, 0</strong></span>' +
      '<span class="editor-hud-pill">Rotation <strong id="editor-rotation-status">0°</strong></span>' +
      '</div>' +
      '</div>' +
      '<div class="editor-footerbar editor-footerbar--workspace">' +
      '<div class="button-row">' +
      '<button class="button button-ghost" id="editor-import-json" type="button">Import JSON</button>' +
      '<button class="button button-ghost" id="editor-export-json" type="button">Export JSON</button>' +
      '<input id="editor-import-file" type="file" accept="application/json" hidden />' +
      '</div>' +
      '<div class="editor-readout">Drag to orbit, scroll to zoom, and use the keyboard shortcuts when you are not typing in the side panels.</div>' +
      '</div>' +
      '</section>' +
      '<aside class="editor-sidebar stack">' +
      '<section class="card stack editor-side-card">' +
      '<strong>Build details</strong>' +
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
      '</section>' +
      '<section class="card stack editor-side-card">' +
      '<strong>Layer details</strong>' +
      '<label>Layer name<input id="editor-layer-name" type="text" placeholder="Layer 1" /></label>' +
      '<label>Layer note<textarea id="editor-layer-note" rows="4" placeholder="Optional note for this layer"></textarea></label>' +
      '</section>' +
      '<section class="card stack editor-side-card">' +
      '<strong>Build notes</strong>' +
      '<p class="muted">Write the instructions the viewer should follow when rebuilding this design.</p>' +
      '<label>Instructions<textarea id="editor-notes" rows="8" placeholder="Step 1: Build the floor. Step 2: Add the walls.">' +
      (draft.description || '') +
      '</textarea></label>' +
      '</section>' +
      '<section class="card stack editor-side-card">' +
      '<strong>Build summary</strong>' +
      '<div class="editor-summary-stats">' +
      '<div class="split-row"><span>Pieces</span><strong id="editor-piece-count">0</strong></div>' +
      '<div class="split-row"><span>Layers</span><strong id="editor-layer-count">1</strong></div>' +
      '</div>' +
      '<div id="editor-material-summary">' +
      renderMaterialSummary([]) +
      '</div>' +
      '</section>' +
      '<section class="card stack editor-side-card editor-actions-card">' +
      '<strong>Save and publish</strong>' +
      '<div class="button-row">' +
      '<button class="button button-secondary" id="editor-save-draft" type="button">Save Draft</button>' +
      '<button class="button button-primary" id="editor-publish" type="button">Publish Build</button>' +
      '</div>' +
      '</section>' +
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
    var modeStatusNode = document.getElementById('editor-mode-status')
    var layerStatusNode = document.getElementById('editor-layer-status')
    var rotationStatusNode = document.getElementById('editor-rotation-status')
    var placeButton = document.getElementById('editor-mode-place')
    var removeButton = document.getElementById('editor-mode-remove')
    var fullscreenButton = document.getElementById('editor-fullscreen')
    var fullscreenTarget = document.getElementById('editor-canvas-shell')
    var lastPersistedDraftKey = ''
    var lastStateDraftKey = ''
    var canvas = new EditorCanvas(document.getElementById('editor-canvas'), editorState, {
      onToggleFullscreen: toggleFullscreen
    })

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

    function syncFullscreenButton() {
      var isFullscreen = document.fullscreenElement === fullscreenTarget
      fullscreenTarget.classList.toggle('is-fullscreen', isFullscreen)
      fullscreenButton.textContent = isFullscreen ? 'Exit fullscreen' : 'Fullscreen'
    }

    async function toggleFullscreen() {
      try {
        if (document.fullscreenElement === fullscreenTarget) {
          await document.exitFullscreen()
        } else {
          await fullscreenTarget.requestFullscreen()
        }
      } catch (error) {
        showToast('Fullscreen is not available here.', 'error')
      }
    }

    function persistEditorDraft() {
      var payload = editorState.toEditorPayload(buildId)
      var draftKey = JSON.stringify({
        title: titleInput.value,
        location: locationInput.value,
        difficulty: difficultyInput.value,
        tags: tagsInput.value,
        notes: notesInput.value,
        payload: payload
      })

      if (draftKey === lastPersistedDraftKey) {
        return
      }

      lastPersistedDraftKey = draftKey
      saveEditorDraft({
        ...composeBuildRecord(false),
        editorDataJson: payload
      })
    }

    function syncLayerInputs(snapshot) {
      var layerMeta = snapshot.layerMeta[snapshot.activeLayer] || {
        layerName: 'Layer ' + (snapshot.activeLayer + 1),
        note: ''
      }
      var selectedMaterial = MATERIAL_TOKENS[snapshot.selectedMaterialToken] || MATERIAL_TOKENS.pine

      layerInput.max = String(Math.max(0, Number(snapshot.grid?.height || 1) - 1))
      layerInput.value = String(snapshot.activeLayer)
      layerNameInput.value = layerMeta.layerName
      layerNoteInput.value = layerMeta.note
      notesInput.value = snapshot.notes
      pieceSelect.value = snapshot.selectedPieceType
      materialSelect.value = snapshot.selectedMaterialToken
      rotationSelect.value = String(snapshot.selectedRotation)
      pieceCountNode.textContent = String(snapshot.pieces.length)
      layerCountNode.textContent = String(editorState.getLayerCount())
      modeStatusNode.textContent = snapshot.mode === 'remove' ? 'Remove' : 'Place'
      layerStatusNode.textContent = String(snapshot.activeLayer)
      rotationStatusNode.textContent = String(snapshot.selectedRotation) + '°'
      materialSummaryNode.innerHTML = renderMaterialSummary(summarizeMaterials(snapshot.pieces))
      hoverReadout.textContent = snapshot.hoverCoord
        ? snapshot.hoverCoord.x + ', ' + snapshot.hoverCoord.y + ', ' + snapshot.hoverCoord.z
        : '0, 0, 0'
      placeButton.classList.toggle('is-active', snapshot.mode === 'place')
      placeButton.classList.toggle('button-secondary', snapshot.mode === 'place')
      placeButton.classList.toggle('button-ghost', snapshot.mode !== 'place')
      removeButton.classList.toggle('is-active', snapshot.mode === 'remove')
      removeButton.classList.toggle('button-secondary', snapshot.mode === 'remove')
      removeButton.classList.toggle('button-ghost', snapshot.mode !== 'remove')
      removeButton.textContent = snapshot.mode === 'remove' ? 'Remove mode' : 'Remove'
      placeButton.textContent = snapshot.mode === 'place' ? 'Place mode' : 'Place'
      materialSelect.title = selectedMaterial.name

      var stateDraftKey = JSON.stringify({
        grid: snapshot.grid,
        pieces: snapshot.pieces,
        layerMeta: snapshot.layerMeta,
        notes: snapshot.notes
      })

      if (stateDraftKey !== lastStateDraftKey) {
        lastStateDraftKey = stateDraftKey
        persistEditorDraft()
      }
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

    placeButton.addEventListener('click', function () {
      editorState.setMode('place')
    })
    removeButton.addEventListener('click', function () {
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
    fullscreenButton.addEventListener('click', function () {
      toggleFullscreen()
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
    titleInput.addEventListener('input', persistEditorDraft)
    locationInput.addEventListener('change', persistEditorDraft)
    difficultyInput.addEventListener('change', persistEditorDraft)
    tagsInput.addEventListener('input', persistEditorDraft)

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

    document.addEventListener('fullscreenchange', syncFullscreenButton)
    syncFullscreenButton()

    return function () {
      document.removeEventListener('fullscreenchange', syncFullscreenButton)
      canvas.destroy()
    }
  }
}
