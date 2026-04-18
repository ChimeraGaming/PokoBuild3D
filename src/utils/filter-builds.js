export function applyBuildFilters(builds, options) {
  var filtered = builds.slice()

  if (options.search) {
    var term = options.search.toLowerCase()
    filtered = filtered.filter(function (build) {
      return (
        build.title.toLowerCase().includes(term) ||
        build.description.toLowerCase().includes(term) ||
        build.tags.some(function (tag) {
          return tag.toLowerCase().includes(term)
        }) ||
        build.author?.displayName?.toLowerCase().includes(term)
      )
    })
  }

  if (options.filters?.length) {
    filtered = filtered.filter(function (build) {
      return options.filters.every(function (filterValue) {
        var normalizedFilter = String(filterValue || '').toLowerCase()

        return (
          build.tags.some(function (tag) {
            return String(tag || '').toLowerCase() === normalizedFilter
          }) ||
          String(build.biome || '').toLowerCase() === normalizedFilter ||
          String(build.category || '').toLowerCase() === normalizedFilter ||
          String(build.difficulty || '').toLowerCase() === normalizedFilter
        )
      })
    })
  }

  if (options.sort === 'easiest') {
    var difficultyRank = {
      beginner: 0,
      easy: 1,
      medium: 2,
      hard: 3
    }

    filtered.sort(function (left, right) {
      return (difficultyRank[left.difficulty] || 9) - (difficultyRank[right.difficulty] || 9)
    })
  } else if (options.sort === 'fewest-materials') {
    filtered.sort(function (left, right) {
      var leftCount = left.materials.reduce(function (sum, material) {
        return sum + Number(material.qtyRequired || 0)
      }, 0)
      var rightCount = right.materials.reduce(function (sum, material) {
        return sum + Number(material.qtyRequired || 0)
      }, 0)
      return leftCount - rightCount
    })
  } else if (options.sort === 'most-liked') {
    filtered.sort(function (left, right) {
      return Number(right.favoriteCount || 0) - Number(left.favoriteCount || 0)
    })
  } else {
    filtered.sort(function (left, right) {
      return new Date(right.createdAt) - new Date(left.createdAt)
    })
  }

  return filtered
}
