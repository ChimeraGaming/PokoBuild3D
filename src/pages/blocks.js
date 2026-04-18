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
  { value: 'actual', label: 'Actual ready' },
  { value: 'test', label: 'Test model ready' },
  { value: 'missing', label: 'Missing' }
]

function getReadinessRank(item) {
  if (item.readiness === 'actual') {
    return 0
  }

  if (item.readiness === 'test') {
    return 1
  }

  return 2
}

function sortBlocks(left, right) {
  if (left.readiness !== right.readiness) {
    return getReadinessRank(left) - getReadinessRank(right)
  }

  if (left.groupLabel !== right.groupLabel) {
    return left.groupLabel.localeCompare(right.groupLabel)
  }

  return left.name.localeCompare(right.name)
}

function matchesStatus(item, status) {
  if (status === 'actual') {
    return item.readiness === 'actual'
  }

  if (status === 'test') {
    return item.readiness === 'test'
  }

  if (status === 'missing') {
    return item.readiness === 'missing'
  }

  return true
}

function getStatusMeta(item) {
  if (item.readiness === 'actual') {
    return {
      className: 'tracker-status--actual',
      icon: 'A',
      label: 'Actual ready'
    }
  }

  if (item.readiness === 'test') {
    return {
      className: 'tracker-status--test',
      icon: 'T',
      label: 'Test model ready'
    }
  }

  return {
    className: 'tracker-status--missing',
    icon: 'X',
    label: 'Missing'
  }
}

function renderStatus(item) {
  var statusMeta = getStatusMeta(item)

  return (
    '<span class="tracker-status ' +
    statusMeta.className +
    '">' +
    '<span class="tracker-status__icon">' +
    statusMeta.icon +
    '</span>' +
    statusMeta.label +
    '</span>'
  )
}

function renderMatchedPiece(item) {
  if (item.readiness === 'missing') {
    return '<span class="muted">No matched editor piece yet</span>'
  }

  return (
    '<strong>' +
    escapeHtml(item.readyPieceName) +
    '</strong><br /><span class="muted">' +
    escapeHtml(item.readiness === 'actual' ? 'Dedicated lookalike piece' : 'Generic editor test piece') +
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
    renderMatchedPiece(item) +
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
      '<p>Dedicated lookalike pieces count as actual ready. The original editor shapes count as test model ready when they only stand in for a similar Pokopia block.</p>' +
      '<p class="muted">Source pulled from <a class="text-link" href="' +
      POKOPIA_BLOCK_SOURCE.url +
      '" target="_blank" rel="noreferrer">' +
      escapeHtml(POKOPIA_BLOCK_SOURCE.label) +
      '</a> on ' +
      escapeHtml(POKOPIA_BLOCK_SOURCE.pulledOn) +
      '.</p>' +
      '<div class="tracker-summary-grid">' +
      '<article class="inset-panel tracker-summary-card"><span class="eyebrow">Total</span><strong>' +
      POKOPIA_BLOCK_SUMMARY.total +
      '</strong><span>Blocks listed on Game8</span></article>' +
      '<article class="inset-panel tracker-summary-card"><span class="eyebrow">Actual Ready</span><strong>' +
      POKOPIA_BLOCK_SUMMARY.actualReady +
      '</strong><span>Matched to dedicated lookalike block pieces</span></article>' +
      '<article class="inset-panel tracker-summary-card"><span class="eyebrow">Test Model Ready</span><strong>' +
      POKOPIA_BLOCK_SUMMARY.testReady +
      '</strong><span>Covered by ' +
      POKOPIA_BLOCK_SUMMARY.editorTestModels +
      ' generic editor test pieces</span></article>' +
      '<article class="inset-panel tracker-summary-card"><span class="eyebrow">Missing</span><strong>' +
      POKOPIA_BLOCK_SUMMARY.missing +
      '</strong><span>Still needs a new lookalike piece</span></article>' +
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
      renderStatus({ readiness: 'actual' }) +
      renderStatus({ readiness: 'test' }) +
      renderStatus({ readiness: 'missing' }) +
      '</div>' +
      '</div>' +
      '</section>' +
      (items.length
        ? '<section class="card stack"><div class="table-wrap"><table class="data-table tracker-table"><thead><tr><th>Status</th><th>Block</th><th>Group</th><th>Matched piece</th></tr></thead><tbody>' +
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
