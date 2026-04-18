import { renderBuildCard } from '../components/build-card.js'
import { resolveBuildAssetKind } from '../utils/build-taxonomy.js'

export var homePage = {
  path: '/',
  title: 'Home',
  async render(context) {
    var publishedBuilds = await context.api.listBuilds()
    var counts = publishedBuilds.reduce(
      function (map, build) {
        var kind = resolveBuildAssetKind(build)
        map[kind] = (map[kind] || 0) + 1
        return map
      },
      {
        model: 0,
        picture: 0,
        real3d: 0,
        tips: 0
      }
    )
    var mostViewedBuilds = publishedBuilds
      .slice()
      .sort(function (left, right) {
        return Number(right.viewCount || right.favoriteCount * 12) - Number(left.viewCount || left.favoriteCount * 12)
      })
      .slice(0, 2)
      .map(renderBuildCard)
      .join('')
    var mostHeartedBuilds = publishedBuilds
      .slice()
      .sort(function (left, right) {
        return Number(right.favoriteCount || 0) - Number(left.favoriteCount || 0)
      })
      .slice(0, 2)
      .map(renderBuildCard)
      .join('')
    var createHref = context.session ? '#/create' : '#/auth?redirect=%2Fcreate'

    return (
      '<section class="hero hero-home">' +
      '<div class="shell hero-grid hero-grid-single">' +
      '<div class="stack hero-copy">' +
      '<span class="eyebrow">Static first. Cozy by default.</span>' +
      '<h1>Build it. Share it. Track it in 3D.</h1>' +
      '<p class="hero-lead">Browse Pokopia builds, inspect them layer by layer in a lightweight 3D viewer, and create your own schematics with an in-browser editor.</p>' +
      '<div class="button-row">' +
      '<a class="button button-primary" href="#/catalog">Browse Builds</a>' +
      '<a class="button button-secondary" href="' +
      createHref +
      '">Create 3D Models</a>' +
      '<a class="button button-ghost" href="' +
      createHref +
      '">Start Creating</a>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</section>' +
      '<section class="shell stack section-gap">' +
      '<div class="split-row"><div><span class="eyebrow">Featured builds</span><h2>Community picks</h2></div><a class="text-link" href="#/catalog">View full catalog</a></div>' +
      '<div class="home-picks-grid">' +
      '<section class="card stack home-picks-column">' +
      '<div class="split-row"><h3>Most viewed</h3><span class="tag-pill">Hot right now</span></div>' +
      '<div class="card-grid home-picks-cards">' +
      mostViewedBuilds +
      '</div>' +
      '</section>' +
      '<section class="card stack home-picks-column">' +
      '<div class="split-row"><h3>Most hearted</h3><span class="tag-pill">Community favorites</span></div>' +
      '<div class="card-grid home-picks-cards">' +
      mostHeartedBuilds +
      '</div>' +
      '</section>' +
      '</div>' +
      '</section>' +
      '<section class="shell stack section-gap">' +
      '<div class="split-row"><div><span class="eyebrow">Browse by format</span><h2>Build surfaces</h2></div></div>' +
      '<div class="home-category-grid">' +
      '<article class="card stack home-category-card">' +
      '<div class="home-category-meta"><span class="eyebrow">3D Models</span><span class="home-category-count">' +
      counts.model +
      ' models available</span></div>' +
      '<h3>Viewer-first builds with orbit controls and layer support.</h3>' +
      '<p>Open native editor schematics and uploaded models, rotate them in 3D, and inspect the structure before you start building.</p>' +
      '<div class="button-row"><a class="button button-primary" href="#/catalog">Explore Models</a><a class="button button-ghost" href="' +
      createHref +
      '">Create 3D Models</a></div>' +
      '</article>' +
      '<article class="card stack home-category-card">' +
      '<div class="home-category-meta"><span class="eyebrow">Pictures</span><span class="home-category-count">' +
      counts.picture +
      ' picture posts</span></div>' +
      '<h3>Reference images, step shots, and gallery views for planning.</h3>' +
      '<p>Browse thumbnails, labeled step images, and close-up references when you want a faster visual guide before loading the full 3D view.</p>' +
      '<div class="button-row"><a class="button button-secondary" href="#/catalog">Browse Pictures</a><a class="button button-ghost" href="#/favorites">Saved Gallery</a></div>' +
      '</article>' +
      '<article class="card stack home-category-card">' +
      '<div class="home-category-meta"><span class="eyebrow">Real 3D</span><span class="home-category-count">' +
      counts.real3d +
      ' real world posts</span></div>' +
      '<h3>Handmade builds, printed pieces, and off screen creations.</h3>' +
      '<p>Share finished objects, work in progress photos, and maker shop links for creations that live outside the browser editor.</p>' +
      '<div class="button-row"><a class="button button-secondary" href="' +
      createHref +
      '">Post Real 3D</a><a class="button button-ghost" href="#/catalog">Browse Catalog</a></div>' +
      '</article>' +
      '<article class="card stack home-category-card">' +
      '<div class="home-category-meta"><span class="eyebrow">Tips & Tricks</span><span class="home-category-count">' +
      counts.tips +
      ' guide posts</span></div>' +
      '<h3>Guide images, visual notes, and quick how to references.</h3>' +
      '<p>Use image based guides for layout tips, labeling systems, and compact visual walkthroughs that are easy to save and revisit.</p>' +
      '<div class="button-row"><a class="button button-secondary" href="' +
      createHref +
      '">Post Tips & Tricks</a><a class="button button-ghost" href="#/catalog">Browse Catalog</a></div>' +
      '</article>' +
      '</section>' +
      '</div>' +
      '</section>' +
      '<section class="shell section-gap">' +
      '<article class="card feature-strip">' +
      '<div class="feature-strip-item">' +
      '<h3>Create</h3>' +
      '<p>Sketch Pokopia-style schematics directly in the browser.</p>' +
      '</div>' +
      '<div class="feature-strip-item">' +
      '<h3>Share</h3>' +
      '<p>Publish screenshots, notes, and viewer-ready build data.</p>' +
      '</div>' +
      '<div class="feature-strip-item">' +
      '<h3>Track</h3>' +
      '<p>Save material progress and step through layers as you build.</p>' +
      '</div>' +
      '</article>' +
      '</section>'
    )
  }
}
