function trimHash(hashValue) {
  if (!hashValue || hashValue === '#') {
    return '/'
  }

  return hashValue.replace(/^#/, '') || '/'
}

function decodePathPart(value) {
  try {
    return decodeURIComponent(value)
  } catch (error) {
    return value
  }
}

export function getCurrentRoute() {
  var raw = trimHash(window.location.hash)
  var splitIndex = raw.indexOf('?')
  var path = splitIndex === -1 ? raw : raw.slice(0, splitIndex)
  var queryString = splitIndex === -1 ? '' : raw.slice(splitIndex + 1)
  var params = {}
  var query = {}

  if (!path.startsWith('/')) {
    path = '/' + path
  }

  new URLSearchParams(queryString).forEach(function (value, key) {
    query[key] = value
  })

  return {
    path: path || '/',
    query: query,
    params: params
  }
}

export function createRouter(routes) {
  var listeners = []

  function match(pathname) {
    var inputParts = pathname.split('/').filter(Boolean)
    var matchedRoute = routes.find(function (route) {
      var routeParts = route.path.split('/').filter(Boolean)

      if (routeParts.length !== inputParts.length) {
        return false
      }

      return routeParts.every(function (part, index) {
        return part.startsWith(':') || part === inputParts[index]
      })
    })

    if (!matchedRoute) {
      return null
    }

    var routeParts = matchedRoute.path.split('/').filter(Boolean)
    var params = {}

    routeParts.forEach(function (part, index) {
      if (part.startsWith(':')) {
        params[part.slice(1)] = decodePathPart(inputParts[index])
      }
    })

    return {
      route: matchedRoute,
      params: params
    }
  }

  function resolve() {
    var current = getCurrentRoute()
    var matched = match(current.path)

    return {
      path: current.path,
      query: current.query,
      params: matched ? matched.params : {},
      route: matched ? matched.route : null
    }
  }

  function notify() {
    listeners.forEach(function (listener) {
      listener(resolve())
    })
  }

  window.addEventListener('hashchange', notify)

  return {
    getState: resolve,
    onChange: function (listener) {
      listeners.push(listener)
    },
    navigate: function (path, query) {
      var nextQuery = query ? '?' + new URLSearchParams(query).toString() : ''
      window.location.hash = '#' + path + nextQuery
    },
    start: notify
  }
}
