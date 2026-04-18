export function readStorage(key, fallbackValue) {
  try {
    var raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallbackValue
  } catch (error) {
    return fallbackValue
  }
}

export function writeStorage(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value))
  return value
}

export function removeStorage(key) {
  window.localStorage.removeItem(key)
}

export function fileToDataUrl(file) {
  return new Promise(function (resolve, reject) {
    if (!file) {
      resolve('')
      return
    }

    var reader = new FileReader()
    reader.onload = function () {
      resolve(String(reader.result || ''))
    }
    reader.onerror = function () {
      reject(reader.error || new Error('Unable to read file'))
    }
    reader.readAsDataURL(file)
  })
}

export function parseJsonFile(file) {
  return new Promise(function (resolve, reject) {
    if (!file) {
      resolve(null)
      return
    }

    var reader = new FileReader()
    reader.onload = function () {
      try {
        resolve(JSON.parse(String(reader.result || '{}')))
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = function () {
      reject(reader.error || new Error('Unable to read file'))
    }
    reader.readAsText(file)
  })
}
