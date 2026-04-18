export function renderProgressBar(percent) {
  return (
    '<div class="progress-track">' +
    '<div class="progress-fill" style="width:' +
    Math.max(0, Math.min(100, percent)) +
    '%"></div>' +
    '</div>'
  )
}
