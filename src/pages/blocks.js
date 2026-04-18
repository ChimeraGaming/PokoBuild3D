import { renderEmptyState } from '../components/states.js'
import {
  POKOPIA_BLOCK_CATALOG,
  POKOPIA_BLOCK_GROUPS,
  POKOPIA_BLOCK_SOURCE,
  POKOPIA_BLOCK_SUMMARY
} from '../data/pokopia-block-catalog.js'
import { escapeHtml } from '../utils/dom.js'

var STATUS_OPTIONS = [
  { value: 'all', label: 'All blocks' },
  { value: 'in-demo', label: 'In demo' },
  { value: 'missing', label: 'Missing' }
]

function sortBlocks(left, right) {
  if (left.inDemo !== right.inDemo) {
    return left.inDemo ? -1 : 1
  }

  if (left.groupLabel !== right.groupLabel) {
    return left.groupLabel.localeCompare(right.groupLabel)
  }

  return left.name.localeCompare(right.name)
}

function matchesStatus(item, status) {
  if (status === 'in-demo') {
    return item.inDemo
  }

  if (status === 'missing') {
    return !item.inDemo
  }

  return true
}

function renderStatus(item) {
  return (
    '<span class="tracker-status ' +
    (item.inDemo ? 'tracker-status--yes' : 'tracker-status--no') +
    '">' +
    '<span class="tracker-status__icon">' +
    (item.inDemo ? '&#10003;' : 'X') +
    '</span>' +
    (item.inDemo ? 'In demo' : 'Missing') +
    '</span>'
  )
}

function renderBlockRow(item) {
  return (
    '<tr>' +
    '<td>' +
    renderStatus(item) +
    '</td>' +
    '<td><strong>' +
    escapeHtml(item.name) +
    '</strong></td>' +
    '<td>' +
    escapeHtml(item.groupLabel) +
    '</td>' +
    '<td>' +
    (item.inDemo
      ? escapeHtml(item.demoPieceName)
      : '<span class="muted">Not in the demo set yet</span>') +
    '</td>' +
    '</tr>'
  )
}

export var blocksPage = {
  path: '/blocks',
  title: 'Game Blocks',
  async render(context) {
    var search = (context.query.search || '').trim()
    var status = context.query.status || 'all'
    var group = context.query.group || 'all'
    var searchValue = search.toLowerCase()
    var items = POKOPIA_BLOCK_CATALOG.filter(function (item) {
      var matchesSearch = !searchValue || item.name.toLowerCase().includes(searchValue)
      var matchesGroup = group === 'all' || item.group === group

      return matchesSearch && matchesGroup && matchesStatus(item, status)
    }).sort(sortBlocks)

    var rows = items.length
      ? items.map(renderBlockRow).join('')
      : ''
    var statusOptions = STATUS_OPTIONS.map(function (option) {
      return (
        '<option value="' +
        option.value +
        '" ' +
        (status === option.value ? 'selected' : '') +
        '>' +
        option.label +
        '</option>'
      )
    }).join('')
    var groupOptions = POKOPIA_BLOCK_GROUPS.map(function (option) {
      return (
        '<option value="' +
        option.value +
        '" ' +
        (group === option.value ? 'selected' : '') +
        '>' +
        option.label +
        '</option>'
      )
    }).join('')

    return (
      '<section class="shell page-stack">' +
      '<div class="page-hero card">' +
      '<span class="eyebrow">Game block tracker</span>' +
      '<h1>Pokopia block coverage</h1>' +
      '<p>Checks show where the current browser demo has a close preview piece ready. Terrain, ore, and natural rock blocks stay marked missing until those models exist in the demo set.</p>' +
      '<p class="muted">Source pulled from <a class="text-link" href="' +
      POKOPIA_BLOCK_SOURCE.url +
      '" target="_blank" rel="noreferrer">' +
      escapeHtml(POKOPIA_BLOCK_SOURCE.label) +
      '</a> on April 16, 2026.</p>' +
      '<div class="tracker-summary-grid">' +
      '<article class="inset-panel tracker-summary-card"><span class="eyebrow">Total</span><strong>' +
      POKOPIA_BLOCK_SUMMARY.total +
      '</strong><span>Blocks listed on Game8</span></article>' +
      '<article class="inset-panel tracker-summary-card"><span class="eyebrow">In Demo</span><strong>' +
      POKOPIA_BLOCK_SUMMARY.inDemo +
      '</strong><span>Previewable with current demo pieces</span></article>' +
      '<article class="inset-panel tracker-summary-card"><span class="eyebrow">Missing</span><strong>' +
      POKOPIA_BLOCK_SUMMARY.missing +
      '</strong><span>Still needs a demo model</span></article>' +
      '</div>' +
      '</div>' +
      '<section class="card stack">' +
      '<form id="block-tracker-form" class="catalog-toolbar">' +
      '<label class="grow">Search blocks<input type="search" name="search" value="' +
      escapeHtml(search) +
      '" placeholder="Search by block name" /></label>' +
      '<label>Status<select name="status">' +
      statusOptions +
      '</select></label>' +
      '<label>Group<select name="group">' +
      groupOptions +
      '</select></label>' +
      '<button class="button button-secondary" type="submit">Apply</button>' +
      '<button class="button button-ghost" type="button" id="block-tracker-clear">Clear</button>' +
      '</form>' +
      '<div class="split-row">' +
      '<p class="muted">Showing ' +
      items.length +
      ' of ' +
      POKOPIA_BLOCK_SUMMARY.total +
      ' blocks.</p>' +
      '<div class="tag-row">' +
      renderStatus({ inDemo: true }) +
      renderStatus({ inDemo: false }) +
      '</div>' +
      '</div>' +
      '</section>' +
      (items.length
        ? '<section class="card stack"><div class="table-wrap"><table class="data-table tracker-table"><thead><tr><th>Demo</th><th>Block</th><th>Group</th><th>Demo piece</th></tr></thead><tbody>' +
          rows +
          '</tbody></table></div></section>'
        : renderEmptyState(
            'No blocks matched',
            'Try a different name, status, or group filter.',
            '#/blocks',
            'Clear filters'
          )) +
      '</section>'
    )
  },
  async afterRender(context) {
    var form = document.getElementById('block-tracker-form')
    var clearButton = document.getElementById('block-tracker-clear')

    form.addEventListener('submit', function (event) {
      event.preventDefault()
      var data = new FormData(form)

      context.router.navigate('/blocks', {
        search: data.get('search') || '',
        status: data.get('status') || 'all',
        group: data.get('group') || 'all'
      })
    })

    clearButton.addEventListener('click', function () {
      context.router.navigate('/blocks')
    })
  }
}
