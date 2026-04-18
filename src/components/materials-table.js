import { escapeHtml } from '../utils/dom.js'
import { renderProgressBar } from './progress-bar.js'

export function renderMaterialsTable(materials, gatheredMap, percentComplete, editable) {
  var rows = materials
    .map(function (material, index) {
      var checked = Boolean(gatheredMap[material.id || index])
      return (
        '<tr>' +
        '<td>' +
        escapeHtml(material.itemName) +
        '</td>' +
        '<td>' +
        escapeHtml(material.qtyRequired) +
        '</td>' +
        '<td>' +
        escapeHtml(material.note || '') +
        '</td>' +
        '<td>' +
        (editable
          ? '<input type="checkbox" class="material-toggle" data-material-id="' +
            escapeHtml(material.id || index) +
            '" ' +
            (checked ? 'checked' : '') +
            ' />'
          : checked
            ? 'Done'
            : 'Open') +
        '</td>' +
        '</tr>'
      )
    })
    .join('')

  return (
    '<section class="card stack">' +
    '<div class="split-row">' +
    '<div>' +
    '<h3>Materials</h3>' +
    '<p class="muted">Track what you have gathered while building.</p>' +
    '</div>' +
    '<strong>' +
    percentComplete +
    '% complete</strong>' +
    '</div>' +
    renderProgressBar(percentComplete) +
    '<div class="table-wrap">' +
    '<table class="data-table">' +
    '<thead><tr><th>Item</th><th>Qty Required</th><th>Note</th><th>Gathered</th></tr></thead>' +
    '<tbody>' +
    rows +
    '</tbody>' +
    '</table>' +
    '</div>' +
    '</section>'
  )
}
