import { renderBuildCard } from '../components/build-card.js'
import { renderEmptyState } from '../components/states.js'

var FILTER_OPTIONS = [
  'model',
  'picture',
  'real3d',
  'tips',
  'beginner',
  'easy',
  'medium',
  'hard',
  'garden',
  'house',
  'decor',
  'farm',
  'market'
]

export var catalogPage = {
  path: '/catalog',
  title: 'Catalog',
  async render(context) {
    var createHref = context.session ? '#/create' : '#/auth?redirect=%2Fcreate'
    var activeFilters = context.query.filters ? context.query.filters.split(',').filter(Boolean) : []
    var sort = context.query.sort || 'newest'
    var search = context.query.search || ''
    var builds = await context.api.listBuilds({
      search: search,
      filters: activeFilters,
      sort: sort
    })
    var cards = builds.length
      ? builds.map(renderBuildCard).join('')
      : renderEmptyState('No matching builds', 'Try a different search or clear one of the active filters.', '#/catalog', 'Clear filters')
    var chips = FILTER_OPTIONS.map(function (filterValue) {
      return (
        '<button class="filter-chip ' +
        (activeFilters.includes(filterValue) ? 'is-active' : '') +
        '" type="button" data-filter-value="' +
        filterValue +
        '">' +
        filterValue +
        '</button>'
      )
    }).join('')

    return (
      '<section class="shell page-stack">' +
      '<div class="page-hero card">' +
      '<div class="split-row">' +
      '<div class="stack">' +
      '<span class="eyebrow">Community catalog</span>' +
      '<h1>Browse builds</h1>' +
      '<p>Search the Pokopia build library, filter by style and difficulty, then open any build for 3D inspection and material tracking.</p>' +
      '</div>' +
      '<a class="button button-primary" href="' +
      createHref +
      '">Upload</a>' +
      '</div>' +
      '</div>' +
      '<section class="card stack">' +
      '<form id="catalog-form" class="catalog-toolbar">' +
      '<label class="grow">Search builds<input type="search" name="search" value="' +
      search +
      '" placeholder="Search by title, author, or tag" /></label>' +
      '<label>Sort<select name="sort">' +
      '<option value="newest" ' +
      (sort === 'newest' ? 'selected' : '') +
      '>Newest</option>' +
      '<option value="easiest" ' +
      (sort === 'easiest' ? 'selected' : '') +
      '>Easiest</option>' +
      '<option value="fewest-materials" ' +
      (sort === 'fewest-materials' ? 'selected' : '') +
      '>Fewest materials</option>' +
      '<option value="most-liked" ' +
      (sort === 'most-liked' ? 'selected' : '') +
      '>Most liked</option>' +
      '</select></label>' +
      '<button class="button button-secondary" type="submit">Apply</button>' +
      '</form>' +
      '<div class="chip-row">' +
      chips +
      '</div>' +
      '</section>' +
      '<div class="card-grid card-grid-three">' +
      cards +
      '</div>' +
      '</section>'
    )
  },
  async afterRender(context) {
    var form = document.getElementById('catalog-form')
    var filterButtons = Array.from(document.querySelectorAll('[data-filter-value]'))

    function currentFilters() {
      return filterButtons
        .filter(function (button) {
          return button.classList.contains('is-active')
        })
        .map(function (button) {
          return button.dataset.filterValue
        })
    }

    filterButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        button.classList.toggle('is-active')
      })
    })

    form.addEventListener('submit', function (event) {
      event.preventDefault()
      var data = new FormData(form)
      var query = {
        search: data.get('search') || '',
        sort: data.get('sort') || 'newest',
        filters: currentFilters().join(',')
      }
      context.router.navigate('/catalog', query)
    })
  }
}
