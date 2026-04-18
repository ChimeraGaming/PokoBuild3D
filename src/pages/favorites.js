import { renderBuildCard } from '../components/build-card.js'
import { renderEmptyState } from '../components/states.js'

export var favoritesPage = {
  path: '/favorites',
  title: 'Favorites',
  requiresAuth: true,
  async render(context) {
    var builds = await context.api.listFavoriteBuilds(context.session.profile.id)

    return (
      '<section class="shell page-stack">' +
      '<div class="split-row"><div><span class="eyebrow">Saved builds</span><h1>Favorites</h1></div></div>' +
      '<div class="card-grid card-grid-three">' +
      (builds.length
        ? builds.map(renderBuildCard).join('')
        : renderEmptyState('No favorites yet', 'Save builds from the catalog and they will appear here.', '#/catalog', 'Browse catalog')) +
      '</div>' +
      '</section>'
    )
  }
}
