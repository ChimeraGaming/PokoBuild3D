export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function createMarkup(strings) {
  return strings.join('')
}

export function byId(id) {
  return document.getElementById(id)
}

export function query(selector, scope) {
  return (scope || document).querySelector(selector)
}

export function queryAll(selector, scope) {
  return Array.from((scope || document).querySelectorAll(selector))
}

export function setDisabled(selector, disabled, scope) {
  queryAll(selector, scope).forEach(function (element) {
    element.disabled = Boolean(disabled)
  })
}
