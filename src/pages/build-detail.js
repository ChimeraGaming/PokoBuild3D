import { openImageModal } from '../components/modal.js'
import { renderMaterialsTable } from '../components/materials-table.js'
import { renderEmptyState } from '../components/states.js'
import { showToast } from '../components/toast.js'
import { getBuildThumbnail } from '../utils/build-images.js'
import {
  getAssetKindLabel,
  hasThreeDimensionalModel,
  resolveBuildAssetKind
} from '../utils/build-taxonomy.js'
import { createProfilePath, formatDate } from '../utils/format.js'
import { canRemoveBuild } from '../utils/profile.js'

function completionPercent(materials, gatheredMap) {
  if (!materials.length) {
    return 0
  }

  var completed = materials.filter(function (material, index) {
    return Boolean(gatheredMap[material.id || index])
  }).length

  return Math.round((completed / materials.length) * 100)
}

function renderVisibleMaterials(items) {
  if (!items.length) {
    return '<p class="muted">No visible pieces on this layer setting.</p>'
  }

  return (
    '<ul class="list-clean">' +
    items
      .map(function (item) {
        return '<li>' + item.itemName + ' x' + item.qtyRequired + '</li>'
      })
      .join('') +
    '</ul>'
  )
}

function renderLayerButtons(layers) {
  return layers
    .map(function (layer) {
      return (
        '<button class="layer-button" type="button" data-layer-index="' +
        layer.layerIndex +
        '">' +
        '<strong>' +
        layer.layerName +
        '</strong>' +
        '<span>' +
        (layer.note || 'No note yet.') +
        '</span>' +
        '</button>'
      )
    })
    .join('')
}

function renderImagePostIntro(assetKind) {
  if (assetKind === 'real3d') {
    return (
      '<section class="card stack picture-detail-card"><div class="split-row"><div><h2>Real world creation set</h2><p class="muted">This post is for handmade builds, finished prints, and other real world creations.</p></div></div><p class="muted">Use the gallery for finished photos, closeups, and process shots. There is no browser 3D model attached to this post.</p></section>'
    )
  }

  if (assetKind === 'tips') {
    return (
      '<section class="card stack picture-detail-card"><div class="split-row"><div><h2>Tips and tricks guide</h2><p class="muted">This post is image led, with guide sheets and detailed visual notes.</p></div></div><p class="muted">Open the gallery images for full size references and walkthrough graphics. There is no browser 3D model attached to this post.</p></section>'
    )
  }

  return (
    '<section class="card stack picture-detail-card"><div class="split-row"><div><h2>Picture reference set</h2><p class="muted">This post is image based, so the gallery below is the main viewing surface.</p></div></div><p class="muted">Use the gallery for close reference shots, step images, and layout checks. There is no 3D model attached to this post.</p></section>'
  )
}

function renderResourceLinks(build) {
  if (!build.resourceLinks?.length) {
    return ''
  }

  return (
    '<section class="card stack"><div class="split-row"><div><h2>Links</h2><p class="muted">External shops, makers, and related resources for this post.</p></div></div><div class="button-row">' +
    build.resourceLinks
      .map(function (link) {
        return (
          '<a class="button button-ghost" href="' +
          link.url +
          '" target="_blank" rel="noreferrer">' +
          link.label +
          '</a>'
        )
      })
      .join('') +
    '</div></section>'
  )
}

function galleryHeading(has3DModel, assetKind) {
  if (has3DModel) {
    return 'Step gallery'
  }

  if (assetKind === 'tips') {
    return 'Guide gallery'
  }

  if (assetKind === 'real3d') {
    return 'Creation gallery'
  }

  return 'Picture gallery'
}

function galleryLabel(assetKind, index) {
  if (assetKind === 'model') {
    return index === 0 ? 'Reference' : 'Step ' + index
  }

  if (assetKind === 'tips') {
    return index === 0 ? 'Main guide image' : 'Guide image ' + (index + 1)
  }

  if (assetKind === 'real3d') {
    return index === 0 ? 'Main creation photo' : 'Creation photo ' + (index + 1)
  }

  return index === 0 ? 'Main picture' : 'Picture ' + (index + 1)
}

function buildGalleryEntries(images, assetKind) {
  var uniqueUrls = []

  ;(images || []).forEach(function (image) {
    var imageUrl = typeof image === 'string' ? image : image?.imageUrl
    var normalizedUrl = String(imageUrl || '').trim()

    if (normalizedUrl && !uniqueUrls.includes(normalizedUrl)) {
      uniqueUrls.push(normalizedUrl)
    }
  })

  return uniqueUrls.map(function (imageUrl, index) {
    return {
      id: 'gallery-' + index,
      label: galleryLabel(assetKind, index),
      imageUrl: imageUrl
    }
  })
}

function renderGalleryItems(images) {
  if (!images.length) {
    return '<p class="muted">No gallery images were uploaded for this post yet.</p>'
  }

  return images
    .map(function (image) {
      return (
        '<button class="gallery-card" type="button" data-gallery-image="' +
        image.imageUrl +
        '" data-gallery-label="' +
        image.label +
        '"><img src="' +
        image.imageUrl +
        '" alt="' +
        image.label +
        '" /><span>' +
        image.label +
        '</span></button>'
      )
    })
    .join('')
}

function readGuestProgress(buildId) {
  try {
    var data = JSON.parse(window.localStorage.getItem('pokobuilds3d:guest-progress') || '{}')
    return data[buildId] || null
  } catch (error) {
    return null
  }
}

function writeGuestProgress(buildId, progress) {
  var data = JSON.parse(window.localStorage.getItem('pokobuilds3d:guest-progress') || '{}')
  data[buildId] = progress
  window.localStorage.setItem('pokobuilds3d:guest-progress', JSON.stringify(data))
}

export var buildDetailPage = {
  path: '/build/:slug',
  title: 'Build Detail',
  async render(context) {
    var build = await context.api.getBuildBySlug(context.params.slug)

    if (!build) {
      return renderEmptyState(
        'Build not found',
        'That build could not be loaded.',
        '#/catalog',
        'Back to catalog'
      )
    }

    var progress = context.session?.profile
      ? await context.api.getProgress(build.id, context.session.profile.id)
      : readGuestProgress(build.id)
    var gatheredMap = progress?.gatheredJson || {}
    var percent = progress?.percentComplete || completionPercent(build.materials, gatheredMap)
    var isFavorited = context.session?.profile
      ? await context.api.isFavorited(build.id, context.session.profile.id)
      : false
    var has3DModel = hasThreeDimensionalModel(build)
    var assetKind = resolveBuildAssetKind(build)
    var canDeleteBuild = canRemoveBuild(context.session?.profile, build)
    var canEditImage = context.session?.profile?.id === build.userId
    var thumbnailUrl = getBuildThumbnail(build)
    var viewerSection = has3DModel
      ? '<div class="viewer-layout">' +
        '<section class="card viewer-panel">' +
        '<div class="split-row"><div><h2>3D viewer</h2><p class="muted">Rotate, zoom, and switch between layer modes.</p></div><button class="button button-ghost" id="reset-camera" type="button">Reset camera</button></div>' +
        '<div id="build-viewer-canvas" class="viewer-canvas"></div>' +
        '<div class="viewer-toolbar">' +
        '<button class="button button-secondary" id="solid-mode" type="button">Solid</button>' +
        '<button class="button button-secondary" id="wireframe-mode" type="button">Wireframe</button>' +
        '<button class="button button-secondary" id="toggle-grid" type="button">Show grid</button>' +
        '<label>Explode<input id="explode-range" type="range" min="0" max="8" value="0" /></label>' +
        '</div>' +
        '</section>' +
        '<aside class="card stack layer-panel">' +
        '<div class="split-row"><div><h2>Layer view</h2><p class="muted">Step through one layer at a time.</p></div><button class="button button-ghost" id="play-layers" type="button">Play</button></div>' +
        '<div class="button-row"><button class="button button-secondary" id="layer-mode-all" type="button">All layers</button><button class="button button-secondary" id="layer-mode-current" type="button">Current only</button><button class="button button-secondary" id="layer-mode-below" type="button">Current and below</button></div>' +
        '<div class="button-row"><button class="button button-ghost" id="previous-layer" type="button">Previous layer</button><button class="button button-ghost" id="next-layer" type="button">Next layer</button></div>' +
        '<label>Current layer<input id="current-layer-range" type="range" min="0" max="' +
        Math.max(0, build.layerData.length - 1) +
        '" value="0" /></label>' +
        '<div id="current-layer-label" class="muted">Layer 1</div>' +
        '<div class="layer-list">' +
        renderLayerButtons(build.layerData) +
        '</div>' +
        '<section class="inset-panel"><h3>Visible materials</h3><div id="visible-materials">' +
        renderVisibleMaterials(build.materials) +
        '</div></section>' +
        '</aside>' +
        '</div>'
      : renderImagePostIntro(assetKind)
    var galleryItems = renderGalleryItems(build.imageGallery)

    return (
      '<section class="shell page-stack">' +
      '<div class="detail-hero card">' +
      '<div class="stack">' +
      '<span class="eyebrow">' +
      getAssetKindLabel(assetKind) +
      ' | ' +
      build.biome +
      ' | ' +
      build.difficulty +
      '</span>' +
      '<h1>' +
      build.title +
      '</h1>' +
      '<div class="author-row">' +
      '<img class="avatar" src="' +
      (build.author?.avatarUrl || '') +
      '" alt="' +
      (build.author?.displayName || 'Author') +
      '" />' +
      '<div><a href="#' +
      createProfilePath(build.author?.username || '') +
      '">' +
      (build.author?.displayName || 'Unknown author') +
      '</a><p class="muted">Published ' +
      formatDate(build.createdAt) +
      '</p></div>' +
      '</div>' +
      '<p>' +
      build.description +
      '</p>' +
      '<div class="tag-row">' +
      build.tags
        .map(function (tag) {
          return '<span class="tag-pill">' + tag + '</span>'
        })
        .join('') +
      '</div>' +
      '<div class="button-row">' +
      (has3DModel
        ? '<button class="button button-primary" id="remix-build" type="button">Save A Copy / Remix</button>'
        : '') +
      '<button class="button button-secondary" id="favorite-build" type="button">' +
      (isFavorited ? 'Unfavorite' : 'Favorite') +
      '</button>' +
      '<button class="button button-ghost" id="copy-materials" type="button">Copy Materials</button>' +
      (canDeleteBuild
        ? '<button class="button button-ghost" id="delete-build" type="button">Remove Post</button>'
        : '') +
      '</div>' +
      (build.originalBuildId ? '<p class="muted">Remixed from another build.</p>' : '') +
      '</div>' +
      (canEditImage
        ? '<button class="detail-thumb-shell detail-thumb-shell-editable" id="edit-build-image" type="button">' +
          '<img class="detail-thumb" src="' +
          thumbnailUrl +
          '" alt="' +
          build.title +
          '" />' +
          '<span class="detail-thumb-edit-badge">Change post image</span>' +
          '</button><input id="edit-build-image-input" type="file" accept="image/*" hidden />'
        : '<div class="detail-thumb-shell"><img class="detail-thumb" src="' +
          thumbnailUrl +
          '" alt="' +
          build.title +
          '" /></div>') +
      '</div>' +
      viewerSection +
      renderResourceLinks(build) +
      '<section class="two-column">' +
      renderMaterialsTable(build.materials, gatheredMap, percent, true) +
      '<article class="card stack">' +
      '<h2>Instructions</h2>' +
      '<div class="stack">' +
      build.steps
        .map(function (step, index) {
          return (
            '<article class="step-card"><strong>' +
            (step.stepTitle || 'Step ' + (index + 1)) +
            '</strong><p>' +
            step.stepText +
            '</p></article>'
          )
        })
        .join('') +
      '</div>' +
      '</article>' +
      '</section>' +
      '<section class="card stack">' +
      '<div class="split-row"><div><h2>' +
      galleryHeading(has3DModel, assetKind) +
      '</h2><p class="muted">Tap any image to inspect it.</p></div>' +
      (canEditImage
        ? '<div class="button-row"><button class="button button-ghost" id="add-build-photos" type="button">Add Photos</button><input id="add-build-photos-input" type="file" accept="image/*" multiple hidden /></div>'
        : '') +
      '</div>' +
      '<div class="gallery-grid">' +
      galleryItems +
      '</div>' +
      '</section>' +
      '</section>'
    )
  },
  async afterRender(context) {
    var build = await context.api.getBuildBySlug(context.params.slug)

    if (!build) {
      return function () {}
    }

    var has3DModel = hasThreeDimensionalModel(build)
    var assetKind = resolveBuildAssetKind(build)
    var deleteButton = document.getElementById('delete-build')
    var editImageButton = document.getElementById('edit-build-image')
    var editImageInput = document.getElementById('edit-build-image-input')
    var addPhotosButton = document.getElementById('add-build-photos')
    var addPhotosInput = document.getElementById('add-build-photos-input')
    var galleryGrid = document.querySelector('.gallery-grid')
    var detailThumbImage = document.querySelector('.detail-thumb-shell .detail-thumb')

    function bindGalleryButtons() {
      document.querySelectorAll('[data-gallery-image]').forEach(function (button) {
        button.onclick = function () {
          openImageModal(button.dataset.galleryLabel, button.dataset.galleryImage)
        }
      })
    }

    function syncGalleryUi(nextBuild) {
      if (galleryGrid) {
        galleryGrid.innerHTML = renderGalleryItems(nextBuild.imageGallery)
      }

      if (detailThumbImage) {
        detailThumbImage.src = getBuildThumbnail(nextBuild)
        detailThumbImage.alt = nextBuild.title
      }

      bindGalleryButtons()
    }

    async function handleImageUpdate() {
      if (!context.session?.profile || context.session.profile.id !== build.userId) {
        return
      }

      var file = editImageInput?.files?.[0]

      if (!file) {
        return
      }

      try {
        if (editImageButton) {
          editImageButton.disabled = true
        }

        var previousThumbnailUrl = getBuildThumbnail(build)
        var nextImageUrl = await context.api.uploadAsset(file, 'image', context.session.profile.id)
        var nextGallery = Array.isArray(build.imageGallery)
          ? build.imageGallery.map(function (image) {
              if (image.imageUrl !== previousThumbnailUrl) {
                return image
              }

              return {
                ...image,
                imageUrl: nextImageUrl
              }
            })
          : []
        var savedBuild = await context.api.saveBuild(
          {
            ...build,
            thumbnailUrl: nextImageUrl,
            imageGallery: nextGallery,
            createdAt: build.createdAt
          },
          context.session.profile
        )

        build = savedBuild
        syncGalleryUi(savedBuild)

        showToast('Post image updated.', 'success')
      } catch (error) {
        showToast(error.message, 'error')
      } finally {
        if (editImageButton) {
          editImageButton.disabled = false
        }
        if (editImageInput) {
          editImageInput.value = ''
        }
      }
    }

    async function handleGalleryAppend() {
      if (!context.session?.profile || context.session.profile.id !== build.userId) {
        return
      }

      if (!addPhotosInput?.files?.length) {
        return
      }

      try {
        if (addPhotosButton) {
          addPhotosButton.disabled = true
        }
        var uploadedGallery = await context.api.uploadGalleryFiles(
          addPhotosInput.files,
          context.session.profile
        )
        var gallerySource = build.imageGallery || []

        if (assetKind !== 'model' && build.thumbnailUrl) {
          gallerySource = [{ imageUrl: build.thumbnailUrl }].concat(gallerySource)
        }

        var nextGallery = buildGalleryEntries(
          gallerySource.concat(uploadedGallery),
          assetKind
        )
        var savedBuild = await context.api.saveBuild(
          {
            ...build,
            thumbnailUrl: build.thumbnailUrl || nextGallery[0]?.imageUrl || '',
            imageGallery: nextGallery,
            createdAt: build.createdAt
          },
          context.session.profile
        )

        build = savedBuild
        syncGalleryUi(savedBuild)
        showToast(uploadedGallery.length === 1 ? 'Photo added.' : 'Photos added.', 'success')
      } catch (error) {
        showToast(error.message, 'error')
      } finally {
        if (addPhotosButton) {
          addPhotosButton.disabled = false
        }
        addPhotosInput.value = ''
      }
    }

    async function handleDelete() {
      if (!context.session?.profile) {
        return
      }

      if (!window.confirm('Remove "' + build.title + '"? This cannot be undone.')) {
        return
      }

      try {
        deleteButton.disabled = true
        deleteButton.textContent = 'Removing...'
        await context.api.deleteBuild(build.id, context.session.profile)
        showToast('Post removed.', 'success')
        context.router.navigate(
          context.session.profile.id === build.userId ? '/dashboard' : '/catalog',
          { refresh: String(Date.now()) }
        )
      } catch (error) {
        deleteButton.disabled = false
        deleteButton.textContent = 'Remove Post'
        showToast(error.message, 'error')
      }
    }

    if (deleteButton) {
      deleteButton.addEventListener('click', handleDelete)
    }

    if (editImageButton && editImageInput) {
      editImageButton.addEventListener('click', function () {
        editImageInput.click()
      })
      editImageInput.addEventListener('change', handleImageUpdate)
    }

    if (addPhotosButton && addPhotosInput) {
      addPhotosButton.addEventListener('click', function () {
        addPhotosInput.click()
      })
      addPhotosInput.addEventListener('change', handleGalleryAppend)
    }

    bindGalleryButtons()

    if (!has3DModel) {
      var favoriteButton = document.getElementById('favorite-build')

      if (favoriteButton) {
        favoriteButton.addEventListener('click', async function () {
          if (!context.session?.profile) {
            context.router.navigate('/auth', { redirect: context.path })
            return
          }
          var favorited = await context.api.toggleFavorite(build.id, context.session.profile.id)
          favoriteButton.textContent = favorited ? 'Unfavorite' : 'Favorite'
          showToast(
            favorited ? 'Build saved to favorites.' : 'Build removed from favorites.',
            'success'
          )
        })
      }

      document.getElementById('copy-materials').addEventListener('click', async function () {
        var text = build.materials
          .map(function (material) {
            return (
              material.itemName +
              ' x' +
              material.qtyRequired +
              (material.note ? ' (' + material.note + ')' : '')
            )
          })
          .join('\n')
        await navigator.clipboard.writeText(text)
        showToast('Materials copied.', 'success')
      })

      return function () {}
    }

    var viewerModule = await import('../three/build-viewer.js')
    var BuildViewer = viewerModule.BuildViewer
    var maxLayer = Math.max(0, build.layerData.length - 1)
    var viewerHost = document.getElementById('build-viewer-canvas')
    var visibleMaterialsNode = document.getElementById('visible-materials')
    var currentLayerLabel = document.getElementById('current-layer-label')
    var materialTable = document.querySelector('.data-table')
    var progressLabel = document.querySelector('.progress-track')?.parentElement?.querySelector('strong')
    var layerRange = document.getElementById('current-layer-range')
    var layerButtons = Array.from(document.querySelectorAll('[data-layer-index]'))
    var favoriteButton = document.getElementById('favorite-build')
    var remixButton = document.getElementById('remix-build')
    var playButton = document.getElementById('play-layers')
    var gridButton = document.getElementById('toggle-grid')
    var playerInterval = null
    var activeLayer = 0
    var layerMode = 'all'
    var buildProgress = context.session?.profile
      ? await context.api.getProgress(build.id, context.session.profile.id)
      : readGuestProgress(build.id)
    var gatheredMap = buildProgress?.gatheredJson || {}
    var viewer = new BuildViewer(viewerHost, build, {
      onLayerChange: function (payload) {
        visibleMaterialsNode.innerHTML = renderVisibleMaterials(payload.materials)
        activeLayer = payload.currentLayer
        var layer = build.layerData.find(function (entry) {
          return entry.layerIndex === activeLayer
        })
        currentLayerLabel.textContent = layer ? layer.layerName : 'Layer ' + (activeLayer + 1)
      }
    })

    function saveProgress() {
      var percent = completionPercent(build.materials, gatheredMap)
      document.querySelector('.progress-fill').style.width = percent + '%'
      if (progressLabel) {
        progressLabel.textContent = percent + '% complete'
      }
      var payload = {
        percentComplete: percent,
        gatheredJson: gatheredMap,
        lastLayerViewed: activeLayer
      }

      if (context.session?.profile) {
        context.api.saveProgress(build.id, context.session.profile.id, payload)
      } else {
        writeGuestProgress(build.id, payload)
      }
    }

    materialTable?.addEventListener('change', function (event) {
      if (!event.target.matches('.material-toggle')) {
        return
      }

      gatheredMap[event.target.dataset.materialId] = event.target.checked
      saveProgress()
    })

    document.getElementById('reset-camera').addEventListener('click', function () {
      viewer.resetCamera()
    })

    document.getElementById('solid-mode').addEventListener('click', function () {
      viewer.setDisplayMode('solid')
    })

    document.getElementById('wireframe-mode').addEventListener('click', function () {
      viewer.setDisplayMode('wireframe')
    })

    gridButton.addEventListener('click', function () {
      viewer.toggleGrid()
      gridButton.classList.toggle('is-active')
    })

    document.getElementById('explode-range').addEventListener('input', function (event) {
      viewer.setExplode(Number(event.target.value))
    })

    document.getElementById('previous-layer').addEventListener('click', function () {
      var nextLayer = Math.max(0, activeLayer - 1)
      layerRange.value = String(nextLayer)
      viewer.setCurrentLayer(nextLayer)
    })

    document.getElementById('next-layer').addEventListener('click', function () {
      var nextLayer = Math.min(maxLayer, activeLayer + 1)
      layerRange.value = String(nextLayer)
      viewer.setCurrentLayer(nextLayer)
    })

    layerRange.addEventListener('input', function (event) {
      viewer.setCurrentLayer(Number(event.target.value))
    })

    layerButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        var layerIndex = Number(button.dataset.layerIndex)
        layerRange.value = String(layerIndex)
        viewer.setCurrentLayer(layerIndex)
      })
    })

    document.getElementById('layer-mode-all').addEventListener('click', function () {
      layerMode = 'all'
      viewer.setLayerMode(layerMode)
    })
    document.getElementById('layer-mode-current').addEventListener('click', function () {
      layerMode = 'current'
      viewer.setLayerMode(layerMode)
    })
    document.getElementById('layer-mode-below').addEventListener('click', function () {
      layerMode = 'current-and-below'
      viewer.setLayerMode(layerMode)
    })

    playButton.addEventListener('click', function () {
      if (playerInterval) {
        window.clearInterval(playerInterval)
        playerInterval = null
        playButton.textContent = 'Play'
        return
      }

      playButton.textContent = 'Stop'
      playerInterval = window.setInterval(function () {
        var nextLayer = activeLayer + 1 > maxLayer ? 0 : activeLayer + 1
        layerRange.value = String(nextLayer)
        viewer.setCurrentLayer(nextLayer)
      }, 900)
    })

    if (favoriteButton) {
      favoriteButton.addEventListener('click', async function () {
        if (!context.session?.profile) {
          context.router.navigate('/auth', { redirect: context.path })
          return
        }
        var favorited = await context.api.toggleFavorite(build.id, context.session.profile.id)
        favoriteButton.textContent = favorited ? 'Unfavorite' : 'Favorite'
        showToast(
          favorited ? 'Build saved to favorites.' : 'Build removed from favorites.',
          'success'
        )
      })
    }

    remixButton.addEventListener('click', function () {
      if (!context.session?.profile) {
        context.router.navigate('/auth', { redirect: '/build/' + build.slug })
        return
      }
      context.router.navigate('/editor', { remix: build.slug })
    })

    document.getElementById('copy-materials').addEventListener('click', async function () {
      var text = build.materials
        .map(function (material) {
          return (
            material.itemName +
            ' x' +
            material.qtyRequired +
            (material.note ? ' (' + material.note + ')' : '')
          )
        })
        .join('\n')
      await navigator.clipboard.writeText(text)
      showToast('Materials copied.', 'success')
    })

    viewer.setCurrentLayer(0)

    return function () {
      if (playerInterval) {
        window.clearInterval(playerInterval)
      }
      viewer.destroy()
    }
  }
}
