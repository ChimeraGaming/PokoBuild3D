import { createEditorPayload } from '../editor/piece-library.js'
import { getSupabaseConfig } from '../supabase/client.js'
import { splitTags } from './build-model.js'
import { slugify, uniqueId } from './format.js'
import { createLocalApi } from './local-api.js'
import { createSupabaseApi } from './supabase-api.js'
import { gridFromTemplateSize, normalizeTemplateSize } from './template-size.js'

export function createAppApi() {
  var config = getSupabaseConfig()
  var api = config.configured ? createSupabaseApi() : createLocalApi()

  return {
    ...api,
    async uploadGalleryFiles(files, sessionProfile) {
      var urls = []
      var fileList = Array.from(files || [])
      var index

      for (index = 0; index < fileList.length; index += 1) {
        urls.push(await api.uploadAsset(fileList[index], 'image', sessionProfile.id))
      }

      return urls
    },
    async uploadModelFile(file, sessionProfile) {
      if (!file) {
        return ''
      }

      return api.uploadAsset(file, 'model', sessionProfile.id)
    },
    async uploadAvatar(file, sessionProfile) {
      if (!file) {
        return ''
      }

      return api.uploadAsset(file, 'avatar', sessionProfile.id)
    },
    createDraftFromTemplate(values) {
      var assetKind = values.assetKind

      if (!assetKind) {
        if (values.modelType === 'picture') {
          assetKind = 'picture'
        } else if (values.modelType === 'real3d') {
          assetKind = 'real3d'
        } else if (values.modelType === 'tips') {
          assetKind = 'tips'
        } else {
          assetKind = 'model'
        }
      }

      var modelSource =
        values.modelSource ||
        (values.modelType === 'viewer' ? 'upload' : assetKind === 'model' ? 'editor' : assetKind)
      var templateSize = normalizeTemplateSize(values.templateSize, values.editorDataJson?.grid)
      var templateGrid = gridFromTemplateSize(templateSize)

      return {
        id: values.id || '',
        slug: values.slug || slugify(values.title),
        title: values.title || '',
        description: values.description || '',
        biome: values.biome || '',
        category: values.category || values.biome || '',
        difficulty: values.difficulty || 'easy',
        tags: splitTags(values.tags || []),
        thumbnailUrl: values.thumbnailUrl || '',
        imageGallery: values.imageGallery || [],
        materials: values.materials || [],
        steps: values.steps || [],
        modelType: values.modelType || 'editor',
        modelUrl: values.modelUrl || '',
        resourceLinks: values.resourceLinks || [],
        editorDataJson:
          values.editorDataJson ||
          createEditorPayload(values.id || uniqueId('build'), {
            pieces: [],
            grid: templateGrid,
            layerMeta: {},
            notes: values.description || ''
          }),
        layerData: values.layerData || [],
        originalBuildId: values.originalBuildId || '',
        isPublished: Boolean(values.isPublished),
        assetKind: assetKind,
        modelSource: modelSource,
        originType: values.originType || 'my',
        creatorKnown: Boolean(values.creatorKnown),
        originalCreator: values.originalCreator || '',
        location: values.location || values.biome || '',
        extraTags: values.extraTags || '',
        templateSize: templateSize
      }
    }
  }
}
