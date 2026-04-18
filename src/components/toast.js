import { byId } from '../utils/dom.js'

var toastTimeout = null

export function showToast(message, tone) {
  var root = byId('toast-root')
  root.innerHTML =
    '<div class="toast toast-' +
    (tone || 'info') +
    '">' +
    message +
    '</div>'

  window.clearTimeout(toastTimeout)
  toastTimeout = window.setTimeout(function () {
    root.innerHTML = ''
  }, 3200)
}
