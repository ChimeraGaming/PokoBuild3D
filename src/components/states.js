export function renderLoadingState(label) {
  return (
    '<div class="empty-state card">' +
    '<div class="spinner"></div>' +
    '<p>' +
    label +
    '</p>' +
    '</div>'
  )
}

export function renderEmptyState(title, text, actionHref, actionLabel) {
  return (
    '<div class="empty-state card">' +
    '<h3>' +
    title +
    '</h3>' +
    '<p>' +
    text +
    '</p>' +
    (actionHref
      ? '<a class="button button-primary" href="' + actionHref + '">' + actionLabel + '</a>'
      : '') +
    '</div>'
  )
}
