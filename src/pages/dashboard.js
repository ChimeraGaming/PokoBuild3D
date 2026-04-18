import { renderBuildCard } from '../components/build-card.js'
import { renderEmptyState } from '../components/states.js'

export var dashboardPage = {
  path: '/dashboard',
  title: 'My Builds',
  requiresAuth: true,
  async render(context) {
    var filter = context.query.filter || 'all'
    var builds = await context.api.listBuildsByUser(context.session.profile.id)
    var filtered = builds.filter(function (build) {
      if (filter === 'drafts') {
        return !build.isPublished
      }
      if (filter === 'published') {
        return build.isPublished
      }
      return true
    })
    var cards = filtered.length
      ? filtered.map(renderBuildCard).join('')
      : renderEmptyState('No builds yet', 'Drafts and published builds will appear here once you save them.', '#/create', 'Create a build')

    return (
      '<section class="shell page-stack">' +
      '<div class="split-row">' +
      '<div><span class="eyebrow">Dashboard</span><h1>My builds</h1></div>' +
      '<a class="button button-primary" href="#/create">Create Build</a>' +
      '</div>' +
      '<div class="chip-row">' +
      '<a class="filter-chip ' +
      (filter === 'all' ? 'is-active' : '') +
      '" href="#/dashboard?filter=all">All</a>' +
      '<a class="filter-chip ' +
      (filter === 'published' ? 'is-active' : '') +
      '" href="#/dashboard?filter=published">Published</a>' +
      '<a class="filter-chip ' +
      (filter === 'drafts' ? 'is-active' : '') +
      '" href="#/dashboard?filter=drafts">Drafts</a>' +
      '</div>' +
      '<div class="card-grid card-grid-three">' +
      cards +
      '</div>' +
      '</section>'
    )
  }
}
