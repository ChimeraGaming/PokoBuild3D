export var settingsPage = {
  path: '/settings',
  title: 'Site Settings',
  async render(context) {
    var backendLabel = context.api.backendMode === 'supabase' ? 'Supabase connected' : 'Local demo mode'
    var backendDescription =
      context.api.backendMode === 'supabase'
        ? 'Profiles, uploads, favorites, and live sync are using Supabase right now.'
        : 'The app is currently running from local demo data and LocalStorage.'
    var accountLinks = context.session
      ? '<div class="button-row">' +
        '<a class="button button-secondary" href="#/edit-profile">Edit Profile</a>' +
        '<a class="button button-ghost" href="#/dashboard">My Builds</a>' +
        '<a class="button button-ghost" href="#/favorites">Favorites</a>' +
        '</div>'
      : '<div class="button-row"><a class="button button-primary" href="#/auth">Sign In</a></div>'

    return (
      '<section class="shell page-stack">' +
      '<div class="page-hero card">' +
      '<span class="eyebrow">Site settings</span>' +
      '<h1>Site settings</h1>' +
      '<p>Quick controls and shortcuts for how the site looks and how you move around it.</p>' +
      '</div>' +
      '<div class="two-column">' +
      '<article class="card stack">' +
      '<h2>Theme</h2>' +
      '<div class="inset-panel stack">' +
      '<strong>GitHub Dark</strong>' +
      '<p class="muted">The site is using a dark GitHub style look with higher contrast panels, blue action buttons, and darker form fields.</p>' +
      '</div>' +
      '</article>' +
      '<article class="card stack">' +
      '<h2>Account shortcuts</h2>' +
      '<p>Jump into the main account pages from one place.</p>' +
      accountLinks +
      '</article>' +
      '</div>' +
      '<div class="two-column">' +
      '<article class="card stack">' +
      '<h2>Live chat</h2>' +
      '<p>Use the chat dock settings button inside the live chat window to collapse it or snap it left or right.</p>' +
      '</article>' +
      '<article class="card stack">' +
      '<h2>Backend mode</h2>' +
      '<p><strong>' +
      backendLabel +
      '</strong></p>' +
      '<p>' +
      backendDescription +
      '</p>' +
      '</article>' +
      '</div>' +
      '</section>'
    )
  }
}
