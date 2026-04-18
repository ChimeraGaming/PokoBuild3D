export var aboutPage = {
  path: '/about',
  title: 'About',
  async render(context) {
    return (
      '<section class="shell page-stack">' +
      '<div class="page-hero card">' +
      '<span class="eyebrow">About</span>' +
      '<h1>PokoBuild3D</h1>' +
      '<p>A static-first Pokopia build library with a browser editor, layered viewer mode, local demo data, and optional Supabase services.</p>' +
      '</div>' +
      '<div class="two-column">' +
      '<article class="card stack">' +
      '<h2>Why this stack</h2>' +
      '<p>The frontend is a Vite app with vanilla JavaScript and Three.js so it can ship to GitHub Pages without a paid server. Supabase handles auth, storage, profiles, builds, and saved progress when credentials are available.</p>' +
      '<p>When Supabase is not configured, the same screens run from local demo data and LocalStorage.</p>' +
      '</article>' +
      '<article class="card stack">' +
      '<h2>What is in the MVP</h2>' +
      '<ul class="list-clean">' +
      '<li>Account and profile flows</li>' +
      '<li>Catalog browsing, search, filters, and sort</li>' +
      '<li>Layered build detail viewer with progress tracking</li>' +
      '<li>Browser editor for block-based schematics</li>' +
      '<li>Upload forms for images and optional GLB or glTF files</li>' +
      '</ul>' +
      '</article>' +
      '</div>' +
      '<article class="card stack">' +
      '<h2>Backend mode</h2>' +
      '<p><strong>' +
      (context.api.backendMode === 'supabase' ? 'Supabase connected' : 'Local demo mode') +
      '</strong></p>' +
      '<p>' +
      (context.api.backendMode === 'supabase'
        ? 'Auth, uploads, profiles, and build progress use Supabase.'
        : 'The app is currently using built-in demo data with LocalStorage persistence.') +
      '</p>' +
      '</article>' +
      '</section>'
    )
  }
}
