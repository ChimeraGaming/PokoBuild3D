import { showToast } from '../components/toast.js'
import {
  LOCATION_SUGGESTIONS,
  composeBuildTags,
  normalizeLocation
} from '../utils/build-taxonomy.js'
import { escapeHtml } from '../utils/dom.js'
import { normalizeTemplateSize, TEMPLATE_SIZE_OPTIONS } from '../utils/template-size.js'
import { loadCreateDraft, saveCreateDraft } from '../utils/workspace.js'

var ASSET_KIND_OPTIONS = [
  {
    value: 'model',
    title: '3D Model',
    description: 'Use the browser editor or upload a GLB or glTF file.'
  },
  {
    value: 'picture',
    title: 'Picture',
    description: 'Post a cover image and a picture gallery without a 3D file.'
  },
  {
    value: 'real3d',
    title: 'Real 3D',
    description: 'Share handmade creations, finished prints, and real world builds.'
  },
  {
    value: 'tips',
    title: 'Tips & Tricks',
    description: 'Upload visual guides, labeled images, and detailed tip sheets.'
  }
]

var ORIGIN_TYPE_OPTIONS = [
  {
    value: 'my',
    label: 'My Creation',
    description: 'The tag will credit your site username automatically.'
  },
  {
    value: 'online',
    label: 'Online Creation',
    description: 'Credit the original creator when you know who made it.'
  }
]

var CREATOR_KNOWN_OPTIONS = [
  { value: 'no', label: 'No' },
  { value: 'yes', label: 'Yes' }
]

var MODEL_SOURCE_OPTIONS = [
  {
    value: 'editor',
    label: 'Browser editor',
    description: 'Save metadata here, then finish the 3D build in the editor.'
  },
  {
    value: 'upload',
    label: 'Upload model file',
    description: 'Publish a GLB or glTF build directly from this page.'
  }
]

var IMAGE_POST_CONFIG = {
  picture: {
    title: 'Picture upload',
    coverLabel: 'Main picture',
    galleryLabel: 'Picture gallery',
    mainGalleryLabel: 'Main picture',
    galleryPrefix: 'Picture',
    materialsLabel: 'Materials',
    materialsPlaceholder: 'Item name | qty | note',
    stepsLabel: 'Steps',
    stepsPlaceholder: 'Step title | Step text',
    publishLabel: 'Publish Picture Post',
    publishNote:
      'Picture posts publish directly from this page and keep the right credit and location tags.'
  },
  real3d: {
    title: 'Real 3D upload',
    coverLabel: 'Main creation photo',
    galleryLabel: 'Creation gallery',
    mainGalleryLabel: 'Main creation photo',
    galleryPrefix: 'Creation photo',
    materialsLabel: 'Materials used',
    materialsPlaceholder: 'Material | qty | note',
    stepsLabel: 'Process notes',
    stepsPlaceholder: 'Stage title | What happened here',
    linksLabel: 'Shop sites',
    linksPlaceholder: 'Shop name | https://shop-url.com',
    publishLabel: 'Publish Real 3D Post',
    publishNote:
      'Real 3D posts publish directly from this page and can include maker or shop links.'
  },
  tips: {
    title: 'Tips & Tricks upload',
    coverLabel: 'Main guide image',
    galleryLabel: 'Guide image set',
    mainGalleryLabel: 'Main guide image',
    galleryPrefix: 'Guide image',
    stepsLabel: 'Tip callouts',
    stepsPlaceholder: 'Tip title | Helpful detail',
    publishLabel: 'Publish Tips & Tricks',
    publishNote:
      'Tips and tricks posts publish directly from this page and focus on guide images and visual notes.'
  }
}

function parseMaterials(text) {
  return String(text || '')
    .split('\n')
    .map(function (line, index) {
      var parts = line.split('|').map(function (part) {
        return part.trim()
      })

      if (!parts[0]) {
        return null
      }

      return {
        id: 'manual-material-' + index,
        itemName: parts[0],
        qtyRequired: Number(parts[1] || 1),
        note: parts[2] || ''
      }
    })
    .filter(Boolean)
}

function serializeMaterials(items) {
  return (items || [])
    .map(function (item) {
      return [item.itemName || '', item.qtyRequired || '', item.note || ''].join(' | ')
    })
    .join('\n')
}

function parseSteps(text) {
  return String(text || '')
    .split('\n')
    .map(function (line, index) {
      var parts = line.split('|').map(function (part) {
        return part.trim()
      })

      if (!parts[0]) {
        return null
      }

      return {
        id: 'manual-step-' + index,
        stepTitle: parts[0],
        stepText: parts[1] || '',
        imageUrl: '',
        sortOrder: index
      }
    })
    .filter(Boolean)
}

function serializeSteps(items) {
  return (items || [])
    .map(function (item) {
      return [item.stepTitle || '', item.stepText || ''].join(' | ')
    })
    .join('\n')
}

function normalizeExternalUrl(value) {
  var normalized = String(value || '').trim()

  if (!normalized) {
    return ''
  }

  if (!/^https?:\/\//i.test(normalized)) {
    normalized = 'https://' + normalized
  }

  return normalized
}

function parseResourceLinks(text) {
  return String(text || '')
    .split('\n')
    .map(function (line, index) {
      var parts = line.split('|').map(function (part) {
        return part.trim()
      })
      var label = parts.length > 1 ? parts[0] : 'Shop link ' + (index + 1)
      var url = normalizeExternalUrl(parts.length > 1 ? parts[1] : parts[0])

      if (!url) {
        return null
      }

      return {
        id: 'resource-link-' + index,
        label: label || 'Shop link ' + (index + 1),
        url: url
      }
    })
    .filter(Boolean)
}

function serializeResourceLinks(links) {
  return (links || [])
    .map(function (link) {
      return [link.label || '', link.url || ''].join(' | ')
    })
    .join('\n')
}

function resolveAssetKind(draft) {
  if (draft.assetKind) {
    return draft.assetKind
  }

  if (draft.modelType === 'picture') {
    return 'picture'
  }

  if (draft.modelType === 'real3d') {
    return 'real3d'
  }

  if (draft.modelType === 'tips') {
    return 'tips'
  }

  return 'model'
}

function resolveModelSource(draft) {
  if (draft.modelSource) {
    return draft.modelSource
  }

  if (draft.modelType === 'viewer') {
    return 'upload'
  }

  return resolveAssetKind(draft) === 'model' ? 'editor' : resolveAssetKind(draft)
}

function isKnownAssetKind(value) {
  return ASSET_KIND_OPTIONS.some(function (option) {
    return option.value === value
  })
}

function isKnownModelSource(value) {
  return MODEL_SOURCE_OPTIONS.some(function (option) {
    return option.value === value
  })
}

function applyCreateQueryPreset(draft, query, api) {
  var presetAssetKind = isKnownAssetKind(query?.assetKind) ? query.assetKind : ''
  var presetModelSource = isKnownModelSource(query?.modelSource) ? query.modelSource : ''

  if (!presetAssetKind && !presetModelSource) {
    return draft
  }

  var assetKind = presetAssetKind || resolveAssetKind(draft)
  var modelSource =
    assetKind === 'model'
      ? presetModelSource || resolveModelSource({ ...draft, assetKind: assetKind })
      : assetKind

  return api.createDraftFromTemplate({
    ...draft,
    assetKind: assetKind,
    modelSource: modelSource,
    modelType: assetKind === 'model' ? (modelSource === 'upload' ? 'viewer' : 'editor') : assetKind
  })
}

function renderLocationOptions(selectedValue) {
  return LOCATION_SUGGESTIONS.map(function (location) {
    return (
      '<option value="' +
      escapeHtml(location) +
      '"' +
      (location === selectedValue ? ' selected' : '') +
      '>' +
      escapeHtml(location) +
      '</option>'
    )
  }).join('')
}

function buildGalleryEntries(urls, assetKind) {
  var config = IMAGE_POST_CONFIG[assetKind]

  return urls.map(function (url, index) {
    return {
      id: 'gallery-' + index,
      label:
        assetKind === 'model'
          ? index === 0
            ? 'Reference'
            : 'Step ' + index
          : index === 0
            ? config.mainGalleryLabel
            : config.galleryPrefix + ' ' + (index + 1),
      imageUrl: url
    }
  })
}

function getOptionDetails(options, selectedValue) {
  return (
    options.find(function (option) {
      return option.value === selectedValue
    }) || options[0]
  )
}

function renderSelectOptions(options, selectedValue) {
  return options
    .map(function (option) {
      return (
        '<option value="' +
        escapeHtml(option.value) +
        '"' +
        (selectedValue === option.value ? ' selected' : '') +
        '>' +
        escapeHtml(option.label || option.title || option.value) +
        '</option>'
      )
    })
    .join('')
}

function renderTemplateSizeOptions(selectedValue) {
  return TEMPLATE_SIZE_OPTIONS.map(function (option) {
    return (
      '<option value="' +
      escapeHtml(option) +
      '"' +
      (selectedValue === option ? ' selected' : '') +
      '>' +
      escapeHtml(option) +
      '</option>'
    )
  }).join('')
}

function ensureImageGallery(assetKind, thumbnailUrl, imageGallery) {
  var items = Array.isArray(imageGallery) ? imageGallery.slice() : []
  var mainLabel = IMAGE_POST_CONFIG[assetKind]?.mainGalleryLabel || 'Main image'

  if (
    thumbnailUrl &&
    !items.some(function (entry) {
      return entry.imageUrl === thumbnailUrl
    })
  ) {
    items.unshift({
      id: 'gallery-main',
      label: mainLabel,
      imageUrl: thumbnailUrl
    })
  }

  return items
}

function createTagPreview(tags) {
  return tags
    .map(function (tag) {
      return '<span class="tag-pill">' + escapeHtml(tag) + '</span>'
    })
    .join('')
}

function readImageFiles(form, prefix) {
  return {
    thumbnailFile: form.querySelector('[name="' + prefix + 'Cover"]')?.files?.[0] || null,
    galleryFiles: form.querySelector('[name="' + prefix + 'Gallery"]')?.files || [],
    manualMaterials: form.querySelector('[name="' + prefix + 'ManualMaterials"]')?.value || '',
    manualSteps: form.querySelector('[name="' + prefix + 'ManualSteps"]')?.value || '',
    resourceLinks: form.querySelector('[name="' + prefix + 'ResourceLinks"]')?.value || '',
    modelFile: null
  }
}

function readActiveFiles(form, assetKind) {
  if (assetKind === 'model') {
    return {
      thumbnailFile: form.querySelector('[name="modelThumbnail"]').files?.[0] || null,
      galleryFiles: form.querySelector('[name="modelGallery"]').files || [],
      manualMaterials: form.querySelector('[name="modelManualMaterials"]').value,
      manualSteps: form.querySelector('[name="modelManualSteps"]').value,
      resourceLinks: '',
      modelFile: form.querySelector('[name="modelFile"]').files?.[0] || null
    }
  }

  return readImageFiles(form, assetKind)
}

function renderAssetKindChoices(selectedValue) {
  return renderSelectOptions(ASSET_KIND_OPTIONS, selectedValue)
}

function renderImageAssetCard(assetKind, draft, isVisible) {
  var config = IMAGE_POST_CONFIG[assetKind]
  var materialsValue = serializeMaterials(draft.materials)
  var stepsValue = serializeSteps(draft.steps)
  var resourceLinksValue = serializeResourceLinks(draft.resourceLinks)
  var materialsField = config.materialsLabel
    ? '<label>' +
      config.materialsLabel +
      '<textarea name="' +
      assetKind +
      'ManualMaterials" rows="5" placeholder="' +
      config.materialsPlaceholder +
      '">' +
      escapeHtml(materialsValue) +
      '</textarea></label>'
    : '<textarea name="' + assetKind + 'ManualMaterials" hidden></textarea>'
  var stepsField =
    '<label>' +
    config.stepsLabel +
    '<textarea name="' +
    assetKind +
    'ManualSteps" rows="5" placeholder="' +
    config.stepsPlaceholder +
    '">' +
    escapeHtml(stepsValue) +
    '</textarea></label>'

  return (
    '<article class="card stack create-step-card create-upload-card create-media-card" data-asset-card="' +
    assetKind +
    '"' +
    (isVisible ? '' : ' hidden') +
    '>' +
    '<span class="eyebrow">Step 4</span>' +
    '<h2>' +
    config.title +
    '</h2>' +
    '<div class="compact-field-grid">' +
    '<label>' +
    config.coverLabel +
    '<input name="' +
    assetKind +
    'Cover" type="file" accept="image/*" /></label>' +
    '<label>' +
    config.galleryLabel +
    '<input name="' +
    assetKind +
    'Gallery" type="file" accept="image/*" multiple /></label>' +
    '</div>' +
    (config.linksLabel
      ? '<label>' +
        config.linksLabel +
        '<textarea name="' +
        assetKind +
        'ResourceLinks" rows="5" placeholder="' +
        config.linksPlaceholder +
        '">' +
        escapeHtml(resourceLinksValue) +
        '</textarea></label>'
      : '') +
    (config.materialsLabel
      ? '<div class="compact-field-grid">' + materialsField + stepsField + '</div>'
      : materialsField + stepsField) +
    '</article>'
  )
}

async function serializeDraft(form, context) {
  var data = new FormData(form)
  var sessionProfile = context.session.profile
  var previousDraft =
    context.createDraft || loadCreateDraft() || context.api.createDraftFromTemplate({})
  var assetKind = data.get('assetKind') || 'model'
  var modelSource = assetKind === 'model' ? data.get('modelSource') || 'editor' : assetKind
  var templateSize = normalizeTemplateSize(data.get('templateSize'), previousDraft.editorDataJson?.grid)
  var originType = data.get('originType') || ''
  var creatorKnown = data.get('creatorKnown') === 'yes'
  var originalCreator = creatorKnown ? String(data.get('originalCreator') || '').trim() : ''
  var location = normalizeLocation(data.get('location'))
  var extraTags = String(data.get('tags') || '').trim()
  var activeFiles = readActiveFiles(form, assetKind)
  var thumbnailFile = activeFiles.thumbnailFile
  var galleryFiles = activeFiles.galleryFiles
  var modelFile = activeFiles.modelFile
  var tags = composeBuildTags(
    {
      location: location,
      originType: originType,
      creatorKnown: creatorKnown,
      originalCreator: originalCreator,
      extraTags: extraTags
    },
    sessionProfile.username
  )
  var thumbnailUrl = previousDraft.thumbnailUrl || ''
  var galleryEntries = Array.isArray(previousDraft.imageGallery) ? previousDraft.imageGallery : []
  var modelUrl = previousDraft.modelUrl || ''
  var previousTemplateSize = normalizeTemplateSize(
    previousDraft.templateSize,
    previousDraft.editorDataJson?.grid
  )

  if (!originType) {
    throw new Error('Choose whether this post is your creation or an online creation.')
  }

  if (!location) {
    throw new Error('Add a location before saving or publishing.')
  }

  if (originType === 'online' && creatorKnown && !originalCreator) {
    throw new Error('Add the original creator name or switch that answer to No.')
  }

  if (thumbnailFile && thumbnailFile.size) {
    thumbnailUrl = await context.api.uploadAsset(thumbnailFile, 'image', sessionProfile.id)
  }

  if (galleryFiles && galleryFiles.length) {
    var uploadedGallery = await context.api.uploadGalleryFiles(galleryFiles, sessionProfile)
    galleryEntries = buildGalleryEntries(uploadedGallery, assetKind)
  }

  if (!thumbnailUrl && galleryEntries.length) {
    thumbnailUrl = galleryEntries[0].imageUrl
  }

  if (assetKind === 'model' && modelSource === 'upload') {
    if (modelFile && modelFile.size) {
      modelUrl = await context.api.uploadModelFile(modelFile, sessionProfile)
    }

    if (!modelUrl) {
      throw new Error('Upload a GLB or glTF file for the 3D model.')
    }
  }

  if (assetKind !== 'model') {
    galleryEntries = ensureImageGallery(assetKind, thumbnailUrl, galleryEntries)

    if (!galleryEntries.length) {
      throw new Error('Upload at least one image before publishing.')
    }

    modelUrl = ''
  }

  var editorTemplate = null
  var editorDataJson = null
  var layerData = []

  if (assetKind === 'model' && modelSource === 'editor') {
    editorTemplate = context.api.createDraftFromTemplate({
      id: previousDraft.id,
      title: data.get('title'),
      description: data.get('description'),
      biome: location,
      difficulty: data.get('difficulty'),
      tags: tags,
      templateSize: templateSize
    })
    editorDataJson =
      previousDraft.editorDataJson &&
      previousTemplateSize === templateSize &&
      previousDraft.editorDataJson.pieces?.length
        ? previousDraft.editorDataJson
        : editorTemplate.editorDataJson
    layerData =
      previousTemplateSize === templateSize && previousDraft.layerData?.length
        ? previousDraft.layerData
        : editorTemplate.layerData
  }

  return {
    ...previousDraft,
    title: String(data.get('title') || '').trim(),
    slug: '',
    description: String(data.get('description') || '').trim(),
    biome: location,
    category: assetKind,
    difficulty: String(data.get('difficulty') || 'easy'),
    tags: tags,
    thumbnailUrl: thumbnailUrl,
    imageGallery: galleryEntries,
    materials: parseMaterials(activeFiles.manualMaterials),
    steps: parseSteps(activeFiles.manualSteps),
    modelType:
      assetKind === 'model' ? (modelSource === 'upload' ? 'viewer' : 'editor') : assetKind,
    modelUrl: assetKind === 'model' && modelSource === 'upload' ? modelUrl : '',
    resourceLinks: assetKind === 'real3d' ? parseResourceLinks(activeFiles.resourceLinks) : [],
    editorDataJson: editorDataJson,
    layerData: layerData,
    assetKind: assetKind,
    modelSource: modelSource,
    originType: originType,
    creatorKnown: creatorKnown,
    originalCreator: originalCreator,
    location: location,
    extraTags: extraTags,
    templateSize: templateSize
  }
}

export var createBuildPage = {
  path: '/create',
  title: 'Create Build',
  requiresAuth: true,
  async render(context) {
    var draft = applyCreateQueryPreset(
      loadCreateDraft() || context.api.createDraftFromTemplate({}),
      context.query,
      context.api
    )
    var assetKind = resolveAssetKind(draft)
    var modelSource = resolveModelSource(draft)
    var originType = draft.originType || 'my'
    var creatorKnown = Boolean(draft.creatorKnown)
    var creatorKnownValue = creatorKnown ? 'yes' : 'no'
    var location = normalizeLocation(draft.location || draft.biome || '')
    var templateSize = normalizeTemplateSize(draft.templateSize, draft.editorDataJson?.grid)
    var assetKindDetails = getOptionDetails(ASSET_KIND_OPTIONS, assetKind)
    var modelSourceDetails = getOptionDetails(MODEL_SOURCE_OPTIONS, modelSource)
    var tagPreview = composeBuildTags(
      {
        location: location,
        originType: originType,
        creatorKnown: creatorKnown,
        originalCreator: draft.originalCreator || '',
        extraTags: draft.extraTags || ''
      },
      context.session.profile.username
    )

    context.createDraft = draft

    return (
      '<section class="shell page-stack create-flow">' +
      '<div class="split-row"><div><span class="eyebrow">Creator workflow</span><h1>Create build</h1><p class="muted">Choose what you are posting, add creator credit, lock in the location, and publish with the right metadata from the start.</p></div><a class="button button-secondary" href="#/editor">Open blank editor</a></div>' +
      '<form id="create-build-form" class="create-flow-grid">' +
      '<article class="card stack create-step-card create-choice-card">' +
      '<span class="eyebrow">Step 1</span>' +
      '<h2>What are you posting</h2>' +
      '<label class="dropdown-field">Post type<select id="create-asset-kind" name="assetKind">' +
      renderAssetKindChoices(assetKind) +
      '</select></label>' +
      '<p id="create-asset-kind-description" class="muted compact-help">' +
      escapeHtml(assetKindDetails.description) +
      '</p>' +
      '</article>' +
      '<article class="card stack create-step-card create-details-card">' +
      '<span class="eyebrow">Step 2</span>' +
      '<h2>Build details</h2>' +
      '<label>Title<input name="title" type="text" required value="' +
      escapeHtml(draft.title || '') +
      '" placeholder="Garden lattice" /></label>' +
      '<label>Description<textarea name="description" rows="4" placeholder="Notes, build tips, and placement advice.">' +
      escapeHtml(draft.description || '') +
      '</textarea></label>' +
      '<div class="compact-field-grid">' +
      '<label>Location<select id="create-location-input" name="location" required><option value="">Choose a location</option>' +
      renderLocationOptions(location) +
      '</select></label>' +
      '<label>Difficulty<select name="difficulty"><option value="beginner"' +
      (draft.difficulty === 'beginner' ? ' selected' : '') +
      '>Beginner friendly</option><option value="easy"' +
      ((draft.difficulty || 'easy') === 'easy' ? ' selected' : '') +
      '>Easy</option><option value="medium"' +
      (draft.difficulty === 'medium' ? ' selected' : '') +
      '>Medium</option><option value="hard"' +
      (draft.difficulty === 'hard' ? ' selected' : '') +
      '>Hard</option></select></label>' +
      '</div>' +
      '<label>Extra tags<input id="create-tags-input" name="tags" type="text" value="' +
      escapeHtml(draft.extraTags || '') +
      '" placeholder="cozy, market, cottage" /></label>' +
      '</article>' +
      '<article class="card stack create-step-card create-credit-card">' +
      '<span class="eyebrow">Step 3</span>' +
      '<h2>Ownership and credit</h2>' +
      '<label class="dropdown-field">Creation type<select id="create-origin-type" name="originType">' +
      renderSelectOptions(ORIGIN_TYPE_OPTIONS, originType) +
      '</select></label>' +
      '<div id="online-creator-panel" class="inset-panel stack"' +
      (originType === 'online' ? '' : ' hidden') +
      '>' +
      '<label class="dropdown-field">Do you know the original creator<select id="create-creator-known" name="creatorKnown">' +
      renderSelectOptions(CREATOR_KNOWN_OPTIONS, creatorKnownValue) +
      '</select></label>' +
      '<label id="original-creator-field"' +
      (creatorKnown ? '' : ' hidden') +
      '>Original creator name<input id="create-original-creator" name="originalCreator" type="text" value="' +
      escapeHtml(draft.originalCreator || '') +
      '" placeholder="OwnerName" /></label>' +
      '</div>' +
      '<div class="inset-panel stack create-tag-preview-panel">' +
      '<strong>Tag Preview</strong>' +
      '<div id="create-required-tags-preview" class="tag-row">' +
      createTagPreview(tagPreview) +
      '</div>' +
      '</div>' +
      '<p class="muted compact-help">Only claim work that is yours. Credit the original creator when posting someone else&apos;s build, print, or guide.</p>' +
      '</article>' +
      '<article class="card stack create-step-card create-upload-card create-model-card" data-asset-card="model"' +
      (assetKind === 'model' ? '' : ' hidden') +
      '>' +
      '<span class="eyebrow">Step 4</span>' +
      '<h2>3D model upload</h2>' +
      '<div class="compact-field-grid">' +
      '<label class="dropdown-field">3D source<select id="create-model-source" name="modelSource">' +
      renderSelectOptions(MODEL_SOURCE_OPTIONS, modelSource) +
      '</select></label>' +
      '<div id="template-size-field" class="stack"' +
      (modelSource === 'editor' ? '' : ' hidden') +
      '><label class="dropdown-field">Template size<select name="templateSize">' +
      renderTemplateSizeOptions(templateSize) +
      '</select></label><p class="muted compact-help">Starts with 5x5, 10x10, or 15x15.</p></div>' +
      '</div>' +
      '<p id="create-model-source-description" class="muted compact-help">' +
      escapeHtml(modelSourceDetails.description) +
      '</p>' +
      '<div class="compact-field-grid">' +
      '<label>Thumbnail image<input name="modelThumbnail" type="file" accept="image/*" /></label>' +
      '<label>Reference or step images<input name="modelGallery" type="file" accept="image/*" multiple /></label>' +
      '</div>' +
      '<label id="model-upload-field"' +
      (modelSource === 'upload' ? '' : ' hidden') +
      '>GLB or glTF model<input name="modelFile" type="file" accept=".glb,.gltf,model/gltf-binary,model/gltf+json" /></label>' +
      '<div class="compact-field-grid">' +
      '<label>Materials<textarea name="modelManualMaterials" rows="5" placeholder="Item name | qty | note">' +
      escapeHtml(serializeMaterials(draft.materials)) +
      '</textarea></label>' +
      '<label>Steps<textarea name="modelManualSteps" rows="5" placeholder="Step title | Step text">' +
      escapeHtml(serializeSteps(draft.steps)) +
      '</textarea></label>' +
      '</div>' +
      '</article>' +
      renderImageAssetCard('picture', draft, assetKind === 'picture') +
      renderImageAssetCard('real3d', draft, assetKind === 'real3d') +
      renderImageAssetCard('tips', draft, assetKind === 'tips') +
      '<article class="card stack create-actions-card">' +
      '<div class="button-row">' +
      '<button class="button button-secondary" type="button" id="save-create-draft">Save Draft Metadata</button>' +
      '<button class="button button-primary" type="button" id="open-editor">Continue In Editor</button>' +
      '<button class="button button-ghost" type="button" id="publish-build">Publish Post</button>' +
      '</div>' +
      '<p class="muted" id="create-actions-note">Editor based 3D builds move into the editor for publishing. Upload based 3D builds and image based posts can publish directly from this page.</p>' +
      '</article>' +
      '</form>' +
      '</section>'
    )
  },
  async afterRender(context) {
    var form = document.getElementById('create-build-form')
    var saveButton = document.getElementById('save-create-draft')
    var editorButton = document.getElementById('open-editor')
    var publishButton = document.getElementById('publish-build')
    var noteNode = document.getElementById('create-actions-note')
    var tagPreview = document.getElementById('create-required-tags-preview')
    var locationInput = document.getElementById('create-location-input')
    var tagsInput = document.getElementById('create-tags-input')
    var creatorNameInput = document.getElementById('create-original-creator')
    var assetKindDescription = document.getElementById('create-asset-kind-description')
    var modelSourceDescription = document.getElementById('create-model-source-description')
    var modelUploadField = document.getElementById('model-upload-field')
    var templateSizeField = document.getElementById('template-size-field')
    var originalCreatorField = document.getElementById('original-creator-field')
    var onlineCreatorPanel = document.getElementById('online-creator-panel')
    var modelCard = document.querySelector('[data-asset-card="model"]')
    var pictureCard = document.querySelector('[data-asset-card="picture"]')
    var real3dCard = document.querySelector('[data-asset-card="real3d"]')
    var tipsCard = document.querySelector('[data-asset-card="tips"]')
    var shouldLaunchEditor = context.query.launchEditor === '1'

    function getAssetKind() {
      return form.querySelector('[name="assetKind"]')?.value || 'model'
    }

    function getModelSource() {
      return form.querySelector('[name="modelSource"]')?.value || 'editor'
    }

    function getOriginType() {
      return form.querySelector('[name="originType"]')?.value || 'my'
    }

    function knowsCreator() {
      return form.querySelector('[name="creatorKnown"]')?.value === 'yes'
    }

    function syncRequiredTagPreview() {
      var tags = composeBuildTags(
        {
          location: locationInput.value,
          originType: getOriginType(),
          creatorKnown: knowsCreator(),
          originalCreator: creatorNameInput ? creatorNameInput.value : '',
          extraTags: tagsInput.value
        },
        context.session.profile.username
      )

      tagPreview.innerHTML = createTagPreview(tags)
    }

    function syncFormState() {
      var assetKind = getAssetKind()
      var modelSource = getModelSource()
      var originType = getOriginType()
      var creatorKnown = knowsCreator()

      assetKindDescription.textContent = getOptionDetails(ASSET_KIND_OPTIONS, assetKind).description
      modelSourceDescription.textContent = getOptionDetails(
        MODEL_SOURCE_OPTIONS,
        modelSource
      ).description

      modelCard.hidden = assetKind !== 'model'
      pictureCard.hidden = assetKind !== 'picture'
      real3dCard.hidden = assetKind !== 'real3d'
      tipsCard.hidden = assetKind !== 'tips'
      modelUploadField.hidden = assetKind !== 'model' || modelSource !== 'upload'
      templateSizeField.hidden = assetKind !== 'model' || modelSource !== 'editor'
      onlineCreatorPanel.hidden = originType !== 'online'
      originalCreatorField.hidden = originType !== 'online' || !creatorKnown
      editorButton.hidden = assetKind !== 'model' || modelSource !== 'editor'

      if (assetKind === 'model') {
        if (modelSource === 'upload') {
          publishButton.textContent = 'Publish 3D Upload'
          noteNode.textContent =
            'Uploaded 3D model posts publish directly from this page once the file is attached.'
        } else {
          publishButton.textContent = 'Save And Open Editor'
          noteNode.textContent =
            'Editor based 3D builds carry this metadata into the editor and publish from there.'
        }
      } else {
        publishButton.textContent = IMAGE_POST_CONFIG[assetKind].publishLabel
        noteNode.textContent = IMAGE_POST_CONFIG[assetKind].publishNote
      }

      syncRequiredTagPreview()
    }

    form.addEventListener('change', syncFormState)
    form.addEventListener('input', syncFormState)
    syncFormState()

    if (shouldLaunchEditor && getAssetKind() === 'model' && getModelSource() === 'editor') {
      saveCreateDraft(context.createDraft)
      context.router.navigate('/editor')
      return
    }

    saveButton.addEventListener('click', async function () {
      try {
        var draft = await serializeDraft(form, context)
        context.createDraft = draft
        saveCreateDraft(draft)
        showToast('Draft metadata saved.', 'success')
      } catch (error) {
        showToast(error.message, 'error')
      }
    })

    editorButton.addEventListener('click', async function () {
      try {
        var draft = await serializeDraft(form, context)
        context.createDraft = draft
        saveCreateDraft(draft)
        context.router.navigate('/editor')
      } catch (error) {
        showToast(error.message, 'error')
      }
    })

    publishButton.addEventListener('click', async function () {
      try {
        var draft = await serializeDraft(form, context)
        context.createDraft = draft

        if (draft.modelType === 'editor') {
          saveCreateDraft(draft)
          showToast('Metadata saved. Finish the 3D build in the editor.', 'info')
          context.router.navigate('/editor')
          return
        }

        var saved = await context.api.saveBuild(draft, context.session.profile)
        saveCreateDraft(draft)
        showToast('Post published.', 'success')
        context.router.navigate('/build/' + saved.slug)
      } catch (error) {
        showToast(error.message, 'error')
      }
    })
  }
}
