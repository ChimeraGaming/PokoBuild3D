import logoUrl from '../../Images/Site/Logo.png'
import settingsIconUrl from '../../Images/Site/Settings.png'
import { escapeHtml } from '../utils/dom.js'
import { createProfilePath } from '../utils/format.js'
import { getProfileAvatar } from '../utils/profile.js'

function renderSettingsLink() {
  return (
    '<a class="nav-settings-link" href="#/settings" aria-label="Open site settings" title="Site Settings">' +
    '<img class="nav-settings-icon" src="' +
    settingsIconUrl +
    '" alt="" aria-hidden="true" />' +
    '</a>'
  )
}

function renderPokoSitesMenu() {
  return (
    '<details class="nav-sites-menu">' +
    '<summary class="button button-ghost nav-sites-toggle" aria-label="Other PokoSites">' +
    '<span class="nav-sites-toggle-label nav-sites-toggle-label--full">Other PokoSites</span>' +
    '<span class="nav-sites-toggle-label nav-sites-toggle-label--short">PokoSites</span>' +
    '</summary>' +
    '<div class="nav-sites-panel card stack">' +
    '<a class="nav-sites-link" href="https://pokovisit.com" target="_blank" rel="noreferrer">PokoVisit</a>' +
    '<p class="muted nav-sites-note">Daily Shops and Codes</p>' +
    '<p class="muted nav-sites-note">More to Come</p>' +
    '<p class="muted nav-sites-note">DM Site owner if you want your site added</p>' +
    '</div>' +
    '</details>'
  )
}

export function renderNavbar(session) {
  var profileLink = session?.profile
    ? '#' + createProfilePath(session.profile.username)
    : '#/auth'
  var settingsMarkup = renderSettingsLink()
  var pokoSitesMarkup = renderPokoSitesMenu()
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
    pokoSitesMarkup +
    '<a href="#/about">About</a>' +
    profileMarkup +
    '</nav>' +
    '</div>' +
    '</header>'
  )
}
