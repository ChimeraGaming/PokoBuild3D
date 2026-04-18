import logoUrl from '../../Images/Site/Logo.png'
import { escapeHtml } from '../utils/dom.js'
import { createProfilePath } from '../utils/format.js'
import { getProfileAvatar } from '../utils/profile.js'

function renderSettingsLink() {
  return (
    '<a class="nav-settings-link" href="#/settings" aria-label="Open site settings" title="Site Settings">' +
    '<svg class="nav-settings-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.527-.94 3.294.826 2.354 2.354a1.724 1.724 0 0 0 1.065 2.572c1.757.426 1.757 2.924 0 3.35a1.724 1.724 0 0 0-1.065 2.573c.94 1.527-.827 3.294-2.354 2.354a1.724 1.724 0 0 0-2.572 1.065c-.427 1.757-2.925 1.757-3.351 0a1.724 1.724 0 0 0-2.572-1.065c-1.528.94-3.295-.827-2.355-2.354a1.724 1.724 0 0 0-1.065-2.572c-1.757-.426-1.757-2.924 0-3.35a1.724 1.724 0 0 0 1.065-2.573c-.94-1.527.827-3.294 2.355-2.354.996.613 2.296.07 2.572-1.065Z"/>' +
    '<path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/>' +
    '</svg>' +
    '</a>'
  )
}

export function renderNavbar(session) {
  var profileLink = session?.profile
    ? '#' + createProfilePath(session.profile.username)
    : '#/auth'
  var settingsMarkup = renderSettingsLink()
  var profileMarkup = session?.profile
    ? '<div class="nav-utility-group">' +
      '<a class="nav-profile-link" href="' +
      profileLink +
      '" aria-label="Open your profile">' +
      '<img class="nav-avatar" src="' +
      escapeHtml(getProfileAvatar(session.profile)) +
      '" alt="' +
      escapeHtml(session.profile.displayName || session.profile.username) +
      '" />' +
      '</a>' +
      settingsMarkup +
      '</div>'
    : '<div class="nav-utility-group"><a href="' + profileLink + '">Sign In</a>' + settingsMarkup + '</div>'

  return (
    '<header class="site-header">' +
    '<div class="shell nav-shell">' +
    '<a class="brand" href="#/">' +
    '<img class="brand-logo" src="' +
    logoUrl +
    '" alt="PokoBuild3D logo" />' +
    '<span class="brand-wordmark">PokoBuild3D</span>' +
    '</a>' +
    '<nav class="site-nav">' +
    '<a href="#/">Home</a>' +
    '<a href="#/catalog">Builds</a>' +
    '<a href="#/editor">Editor</a>' +
    '<a href="#/favorites">Favorites</a>' +
    '<a href="#/blocks">Game Blocks</a>' +
    '<a href="#/about">About</a>' +
    profileMarkup +
    '</nav>' +
    '</div>' +
    '</header>'
  )
}
