import { createEditorPayload, summarizeMaterials } from '../editor/piece-library.js'
import { normalizeTemplateSize } from './template-size.js'
import { resolveBuildAssetKind, uniqueTags } from './build-taxonomy.js'
import { slugify, uniqueId } from './format.js'

export function normalizeBuildRecord(record) {
  var build = structuredClone(record)

  build.imageGallery = Array.isArray(build.imageGallery) ? build.imageGallery : []
  build.materials = Array.isArray(build.materials)
    ? build.materials
    : summarizeMaterials(build.editorDataJson?.pieces || [])
  build.steps = Array.isArray(build.steps) ? build.steps : []
  build.tags = uniqueTags(Array.isArray(build.tags) ? build.tags : [])
  build.layerData = Array.isArray(build.layerData)
    ? build.layerData
    : build.editorDataJson?.layers || []
  build.assetKind = resolveBuildAssetKind(build)
  build.modelSource =
    build.modelSource ||
    (build.modelType === 'viewer' ? 'upload' : build.assetKind === 'model' ? 'editor' : build.assetKind)
  build.resourceLinks = Array.isArray(build.resourceLinks) ? build.resourceLinks : []
  build.templateSize = normalizeTemplateSize(build.templateSize, build.editorDataJson?.grid)
  build.favoriteCount = Number(build.favoriteCount || 0)

  if (build.editorDataJson && !build.editorDataJson.materials?.length) {
    build.editorDataJson = createEditorPayload(build.id, {
      pieces: build.editorDataJson.pieces || [],
      grid: build.editorDataJson.grid,
      layerMeta: layerMetaFromArray(build.layerData || build.editorDataJson.layers || []),
      notes: build.editorDataJson.notes || '',
      camera: build.editorDataJson.camera
    })
  }

  return build
}

export function createBuildFromDraft(input, currentUserId) {
  var now = new Date().toISOString()
  var buildId = input.id || uniqueId('build')
  var editorDataJson = input.editorDataJson
    ? createEditorPayload(buildId, {
        pieces: input.editorDataJson.pieces || [],
        grid: input.editorDataJson.grid,
        layerMeta: layerMetaFromArray(input.layerData || input.editorDataJson.layers || []),
        notes: input.editorDataJson.notes || input.description || '',
        camera: input.editorDataJson.camera
      })
    : null

  return normalizeBuildRecord({
    id: buildId,
    userId: currentUserId,
    slug: input.slug || slugify(input.title) || uniqueId('slug'),
    title: input.title || 'Untitled build',
    description: input.description || '',
    biome: input.biome || '',
    category: input.category || input.biome || '',
    difficulty: input.difficulty || 'easy',
    tags: Array.isArray(input.tags) ? uniqueTags(input.tags) : splitTags(input.tags),
    thumbnailUrl: input.thumbnailUrl || '',
    imageGallery: input.imageGallery || [],
    materials:
      input.materials && input.materials.length
        ? input.materials
        : summarizeMaterials(editorDataJson?.pieces || []),
    steps: input.steps || [],
    assetKind: input.assetKind || resolveBuildAssetKind(input),
    modelSource:
      input.modelSource ||
      (input.modelType === 'viewer'
        ? 'upload'
        : (input.assetKind || resolveBuildAssetKind(input)) === 'model'
          ? 'editor'
          : input.assetKind || resolveBuildAssetKind(input)),
    modelType: input.modelType || (editorDataJson ? 'editor' : 'viewer'),
    modelUrl: input.modelUrl || '',
    resourceLinks: input.resourceLinks || [],
    editorDataJson: editorDataJson,
    layerData: input.layerData || editorDataJson?.layers || [],
    extraTags: input.extraTags || '',
    templateSize: normalizeTemplateSize(input.templateSize, editorDataJson?.grid),
    isPublished: Boolean(input.isPublished),
    originalBuildId: input.originalBuildId || '',
    favoriteCount: Number(input.favoriteCount || 0),
    createdAt: input.createdAt || now,
    updatedAt: now
  })
}

export function splitTags(value) {
  return uniqueTags(value)
}

export function layerMetaFromArray(layers) {
  return (layers || []).reduce(function (accumulator, layer) {
    accumulator[layer.layerIndex] = {
      layerName: layer.layerName,
      note: layer.note
    }
    return accumulator
  }, {})
}

export function buildToSupabaseRows(build) {
  return {
    build: {
      id: build.id,
      user_id: build.userId,
      slug: build.slug,
      title: build.title,
      description: build.description,
      biome: build.biome,
      difficulty: build.difficulty,
      tags: build.tags,
      thumbnail_url: build.thumbnailUrl,
      asset_kind: build.assetKind,
      model_source: build.modelSource,
      model_type: build.modelType,
      model_url: build.modelUrl,
      resource_links_json: build.resourceLinks,
      editor_data_json: build.editorDataJson,
      is_published: build.isPublished,
      original_build_id: build.originalBuildId || null,
      created_at: build.createdAt,
      updated_at: build.updatedAt
    },
    images: (build.imageGallery || []).map(function (image, index) {
      return {
        id: image.id || uniqueId('image'),
        build_id: build.id,
        image_url: image.imageUrl,
        label: image.label || 'Reference',
        sort_order: index
      }
    }),
    materials: (build.materials || []).map(function (material, index) {
      return {
        id: material.id || uniqueId('material'),
        build_id: build.id,
        item_name: material.itemName,
        qty_required: material.qtyRequired,
        note: material.note || '',
        sort_order: index
      }
    }),
    steps: (build.steps || []).map(function (step, index) {
      return {
        id: step.id || uniqueId('step'),
        build_id: build.id,
        step_title: step.stepTitle,
        step_text: step.stepText,
        image_url: step.imageUrl || '',
        sort_order: index
      }
    }),
    layers: (build.layerData || []).map(function (layer) {
      return {
        id: layer.id || uniqueId('layer'),
        build_id: build.id,
        layer_index: layer.layerIndex,
        layer_name: layer.layerName,
        note: layer.note || ''
      }
    }),
    blocks: (build.editorDataJson?.pieces || []).map(function (piece) {
      return {
        id: piece.id || uniqueId('block'),
        build_id: build.id,
        piece_type: piece.pieceType,
        material_token: piece.materialToken,
        x: piece.x,
        y: piece.y,
        z: piece.z,
        rotation: piece.rotation,
        metadata_json: piece.metadata || {}
      }
    })
  }
}

export function supabaseRowsToBuild(buildRow, related, author) {
  return normalizeBuildRecord({
    id: buildRow.id,
    userId: buildRow.user_id,
    slug: buildRow.slug,
    title: buildRow.title,
    description: buildRow.description,
    biome: buildRow.biome,
    category: buildRow.biome,
    difficulty: buildRow.difficulty,
    tags: buildRow.tags || [],
    thumbnailUrl: buildRow.thumbnail_url || '',
    assetKind: buildRow.asset_kind || resolveBuildAssetKind(buildRow),
    modelSource: buildRow.model_source || (buildRow.model_type === 'viewer' ? 'upload' : 'editor'),
    imageGallery: (related.images || []).map(function (row) {
      return {
        id: row.id,
        label: row.label,
        imageUrl: row.image_url
      }
    }),
    materials: (related.materials || []).map(function (row) {
      return {
        id: row.id,
        itemName: row.item_name,
        qtyRequired: row.qty_required,
        note: row.note
      }
    }),
    steps: (related.steps || []).map(function (row) {
      return {
        id: row.id,
        stepTitle: row.step_title,
        stepText: row.step_text,
        imageUrl: row.image_url,
        sortOrder: row.sort_order
      }
    }),
    modelType: buildRow.model_type || 'viewer',
    modelUrl: buildRow.model_url || '',
    resourceLinks: buildRow.resource_links_json || [],
    editorDataJson: buildRow.editor_data_json || null,
    layerData: (related.layers || []).map(function (row) {
      return {
        id: row.id,
        layerIndex: row.layer_index,
        layerName: row.layer_name,
        note: row.note
      }
    }),
    isPublished: Boolean(buildRow.is_published),
    originalBuildId: buildRow.original_build_id || '',
    favoriteCount: Number(buildRow.favorite_count || 0),
    createdAt: buildRow.created_at,
    updatedAt: buildRow.updated_at,
    author: author || null
  })
}
