import { escapeHtml } from '../utils/dom.js'
import { getBuildThumbnail } from '../utils/build-images.js'
import { resolveBuildAssetKind } from '../utils/build-taxonomy.js'

export function renderBuildCard(build) {
  var materialCount = build.materials.reduce(function (sum, material) {
    return sum + Number(material.qtyRequired || 0)
  }, 0)
  var assetKind = resolveBuildAssetKind(build)
  var thumbnailUrl = getBuildThumbnail(build)
  var baseMetaLabel =
    assetKind === 'picture'
      ? 'Picture post'
      : assetKind === 'real3d'
        ? 'Real 3D creation'
        : assetKind === 'tips'
          ? 'Tips and tricks'
          : materialCount + ' parts'
  var metaLabel = build.isPublished ? baseMetaLabel : 'Private draft | ' + baseMetaLabel
  var tags = build.tags
    .slice(0, 3)
    .map(function (tag) {
      return '<span class="tag-pill">' + escapeHtml(tag) + '</span>'
    })
    .join('')

  return (
    '<article class="build-card card">' +
    '<a class="build-card__image" href="#/build/' +
    escapeHtml(build.slug) +
    '">' +
    '<img src="' +
    escapeHtml(thumbnailUrl) +
    '" alt="' +
    escapeHtml(build.title) +
    ' thumbnail" loading="lazy" />' +
    '</a>' +
    '<div class="build-card__body">' +
    '<div class="build-card__meta">' +
    '<span class="eyebrow">' +
    escapeHtml(build.difficulty) +
    '</span>' +
    '<span class="muted">' +
    escapeHtml(metaLabel) +
    '</span>' +
    '</div>' +
    '<h3><a href="#/build/' +
    escapeHtml(build.slug) +
    '">' +
    escapeHtml(build.title) +
    '</a></h3>' +
    '<p class="muted">by ' +
    escapeHtml(build.author?.displayName || 'Unknown') +
    '</p>' +
    '<div class="tag-row">' +
    tags +
    '</div>' +
    '</div>' +
    '</article>'
  )
}
