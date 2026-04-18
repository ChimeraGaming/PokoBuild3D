import { readStorage, removeStorage, writeStorage } from './storage.js'

var KEYS = {
  createDraft: 'pokobuilds3d:create-draft',
  editorDraft: 'pokobuilds3d:editor-draft'
}

export function loadCreateDraft() {
  return readStorage(KEYS.createDraft, null)
}

export function saveCreateDraft(value) {
  return writeStorage(KEYS.createDraft, value)
}

export function clearCreateDraft() {
  removeStorage(KEYS.createDraft)
}

export function loadEditorDraft() {
  return readStorage(KEYS.editorDraft, null)
}

export function saveEditorDraft(value) {
  return writeStorage(KEYS.editorDraft, value)
}

export function clearEditorDraft() {
  removeStorage(KEYS.editorDraft)
}
