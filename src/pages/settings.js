import { showToast } from '../components/toast.js'
import { escapeHtml } from '../utils/dom.js'
import { getFeaturedBadge, getUnlockedBadges, renderBadgeChips } from '../utils/profile.js'

function renderBadgeOptions(badges, selectedKey) {
  return badges
    .map(function (badge) {
      return (
        '<option value="' +
        escapeHtml(badge.key) +
        '"' +
        (badge.key === selectedKey ? ' selected' : '') +
        '>' +
        escapeHtml(badge.label) +
        '</option>'
      )
    })
    .join('')
}

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
        '<a class="button button-secondary" href="#/profile/edit">Edit Profile</a>' +
        '<a class="button button-ghost" href="#/dashboard">My Builds</a>' +
        '<a class="button button-ghost" href="#/favorites">Favorites</a>' +
        '</div>'
      : '<div class="button-row"><a class="button button-primary" href="#/auth">Sign In</a></div>'
    var unlockedBadges = context.session ? getUnlockedBadges(context.session.profile) : []
    var featuredBadge = context.session ? getFeaturedBadge(context.session.profile) : null
    var featuredBadgeCard = context.session
      ? '<article class="card stack">' +
        '<h2>Featured badge</h2>' +
        (unlockedBadges.length
          ? '<div class="stack">' +
            '<p class="muted">Choose which unlocked badge shows first on your profile and in chat.</p>' +
            (featuredBadge
              ? '<div class="stack"><span class="eyebrow">Current badge</span>' +
                renderBadgeChips([featuredBadge]) +
                '</div>'
              : '') +
            '<form id="featured-badge-form" class="stack">' +
            '<label class="dropdown-field">Unlocked badges<select id="featured-badge-select" name="featuredBadgeKey">' +
            renderBadgeOptions(unlockedBadges, featuredBadge?.key || unlockedBadges[0].key) +
            '</select></label>' +
            '<button class="button button-primary" id="save-featured-badge" type="submit">Save Featured Badge</button>' +
            '</form>' +
            '</div>'
          : '<p class="muted">Earn a badge first, then you can feature it here.</p>') +
        '</article>'
      : ''

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
      (featuredBadgeCard ? '<div class="two-column">' + featuredBadgeCard + '</div>' : '') +
      '</section>'
    )
  },
  async afterRender(context) {
    var featuredBadgeForm = document.getElementById('featured-badge-form')

    if (!featuredBadgeForm || !context.session?.profile) {
      return
    }

    featuredBadgeForm.addEventListener('submit', async function (event) {
      event.preventDefault()

      var saveButton = document.getElementById('save-featured-badge')
      var featuredBadgeSelect = document.getElementById('featured-badge-select')

      try {
        saveButton.disabled = true
        saveButton.textContent = 'Saving...'

        await context.api.updateProfile(context.session.profile.id, {
          displayName: context.session.profile.displayName,
          username: context.session.profile.username,
          bio: context.session.profile.bio,
          avatarUrl: context.session.profile.avatarUrl,
          socials: context.session.profile.socials,
          featuredBadgeKey: featuredBadgeSelect.value
        })

        showToast('Featured badge updated.', 'success')
        context.router.navigate('/settings', {
          refresh: String(Date.now())
        })
      } catch (error) {
        showToast(error.message, 'error')
      } finally {
        saveButton.disabled = false
        saveButton.textContent = 'Save Featured Badge'
      }
    })
  }
}
