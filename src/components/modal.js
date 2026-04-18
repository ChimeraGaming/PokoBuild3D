import { byId } from '../utils/dom.js'

export function openImageModal(title, imageUrl) {
  var root = byId('modal-root')
  root.innerHTML =
    '<div class="modal-backdrop" id="image-modal">' +
    '<div class="modal-card">' +
    '<button class="modal-close" data-close-modal type="button">Close</button>' +
    '<h3>' +
    title +
    '</h3>' +
    '<img class="modal-image" src="' +
    imageUrl +
    '" alt="' +
    title +
    '" />' +
    '</div>' +
    '</div>'

  root.querySelector('[data-close-modal]').addEventListener('click', closeModal)
  root.querySelector('.modal-backdrop').addEventListener('click', function (event) {
    if (event.target === event.currentTarget) {
      closeModal()
    }
  })
}

export function closeModal() {
  var root = byId('modal-root')
  root.innerHTML = ''
}
