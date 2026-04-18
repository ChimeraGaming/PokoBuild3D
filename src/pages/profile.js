import { renderBuildCard } from '../components/build-card.js'
import { renderEmptyState } from '../components/states.js'
import { showToast } from '../components/toast.js'
import { escapeHtml } from '../utils/dom.js'
import { createProfilePath, formatDate } from '../utils/format.js'
import {
  MANAGEABLE_SPECIAL_TAG_OPTIONS,
  canAssignSpecialTags,
  getProfileAvatar,
  renderSocialLinks,
  renderSpecialTagChips
} from '../utils/profile.js'

function renderSpecialTagOption(tag, selected) {
  return (
    '<label class="dropdown-checkbox-option">' +
    '<input name="specialTag" type="checkbox" value="' +
    escapeHtml(tag) +
    '"' +
    (selected ? ' checked' : '') +
    ' />' +
    '<span>' +
    escapeHtml(tag) +
    '</span>' +
    '</label>'
  )
}

function renderSpecialTagSelection(tags) {
  var selectedTags = (tags || []).filter(Boolean)

  if (!selectedTags.length) {
    return 'Choose special tags'
  }

  return selectedTags.join(', ')
}

export var profilePage = {
  path: '/u/:username',
  title: 'Profile',
  async render(context) {
    var profile = await context.api.getProfileByUsername(context.params.username)

    if (!profile) {
      return renderEmptyState(
        'Profile not found',
        'That builder profile is missing or private.',
        '#/catalog',
        'Back to catalog'
      )
    }

    var builds = await context.api.listBuildsByUser(profile.id)
    var publishedBuilds = builds.filter(function (build) {
      return build.isPublished || context.session?.profile?.id === profile.id
    })
    var cards = publishedBuilds.length
      ? publishedBuilds.map(renderBuildCard).join('')
      : renderEmptyState(
          'No builds yet',
          'Published builds from this profile will appear here.',
          '',
          ''
        )
    var isOwnProfile = context.session?.profile?.id === profile.id
    var canManageTags = canAssignSpecialTags(context.session?.profile)

    return (
      '<section class="shell page-stack">' +
      '<div class="profile-hero card">' +
      '<img class="avatar avatar-large" src="' +
      escapeHtml(getProfileAvatar(profile)) +
      '" alt="' +
      escapeHtml(profile.displayName) +
      '" />' +
      '<div class="stack profile-copy">' +
      '<span class="eyebrow">' +
      escapeHtml(profile.username) +
      '</span>' +
      '<h1>' +
      escapeHtml(profile.displayName) +
      '</h1>' +
      '<p>' +
      escapeHtml(profile.bio || 'No bio added yet.') +
      '</p>' +
      '<div class="tag-row">' +
      '<span class="tag-pill">' +
      escapeHtml(profile.buildCount) +
      ' published builds</span>' +
      '<span class="tag-pill">' +
      escapeHtml(profile.favoritesCount) +
      ' favorites</span>' +
      '<span class="tag-pill">Joined ' +
      escapeHtml(formatDate(profile.createdAt)) +
      '</span>' +
      '</div>' +
      '<div class="profile-special-tags stack">' +
      '<span class="eyebrow">Special tags</span>' +
      '<div id="profile-special-tags">' +
      renderSpecialTagChips(profile.specialTags) +
      '</div>' +
      '</div>' +
      '<div class="profile-socials">' +
      '<span class="eyebrow">Socials</span>' +
      renderSocialLinks(profile.socials) +
      '</div>' +
      '</div>' +
      '<div class="profile-actions">' +
      (isOwnProfile
        ? '<a class="button button-primary" href="#/profile/edit">Edit Profile</a><a class="button button-secondary" href="#/dashboard">My Builds</a><button class="button button-ghost" id="sign-out-button" type="button">Sign Out</button>'
        : '') +
      '</div>' +
      '</div>' +
      (canManageTags
        ? '<section class="card stack">' +
          '<span class="eyebrow">Owner tools</span>' +
          '<h2>Manage special tags</h2>' +
          '<p class="muted">Choose which site tag badges appear on this profile.</p>' +
          '<form id="special-tags-form" class="stack" data-profile-id="' +
          escapeHtml(profile.id) +
          '" data-profile-username="' +
          escapeHtml(profile.username) +
          '">' +
          '<details class="dropdown-menu special-tags-dropdown" id="special-tags-dropdown"><summary class="dropdown-menu__summary"><span>Special tags</span><span id="special-tags-selection" class="muted">' +
          escapeHtml(renderSpecialTagSelection(profile.specialTags)) +
          '</span></summary><div class="dropdown-menu__panel"><div class="dropdown-checkbox-list">' +
          MANAGEABLE_SPECIAL_TAG_OPTIONS.map(function (tag) {
            return renderSpecialTagOption(tag, profile.specialTags.includes(tag))
          }).join('') +
          '</div></div></details>' +
          '<div class="button-row">' +
          '<button class="button button-primary" id="save-special-tags" type="submit">Save Special Tags</button>' +
          '</div>' +
          '</form>' +
          '</section>'
        : '') +
      '<div class="split-row"><div><span class="eyebrow">Published builds</span><h2>Build library</h2></div></div>' +
      '<div class="card-grid card-grid-three">' +
      cards +
      '</div>' +
      '</section>'
    )
  },
  async afterRender(context) {
    var signOutButton = document.getElementById('sign-out-button')
    var specialTagsForm = document.getElementById('special-tags-form')
    var specialTagsSelection = document.getElementById('special-tags-selection')
    var specialTagsDropdown = document.getElementById('special-tags-dropdown')

    function selectedSpecialTags() {
      return Array.from(specialTagsForm?.querySelectorAll('input[name="specialTag"]:checked') || []).map(
        function (input) {
          return input.value
        }
      )
    }

    function syncSpecialTagSelection() {
      if (!specialTagsSelection) {
        return
      }

      specialTagsSelection.textContent = renderSpecialTagSelection(selectedSpecialTags())
    }

    if (signOutButton) {
      signOutButton.addEventListener('click', async function () {
        await context.api.signOut()
        context.router.navigate('/')
      })
    }

    if (specialTagsForm) {
      syncSpecialTagSelection()
      specialTagsForm.addEventListener('change', syncSpecialTagSelection)
      specialTagsForm.addEventListener('submit', async function (event) {
        event.preventDefault()

        var saveButton = document.getElementById('save-special-tags')
        var nextTags = selectedSpecialTags()

        try {
          saveButton.disabled = true
          saveButton.textContent = 'Saving...'

          var updatedProfile = await context.api.setProfileSpecialTags(
            specialTagsForm.dataset.profileId,
            nextTags,
            context.session.profile
          )

          document.getElementById('profile-special-tags').innerHTML = renderSpecialTagChips(
            updatedProfile.specialTags
          )
          syncSpecialTagSelection()
          if (specialTagsDropdown) {
            specialTagsDropdown.open = false
          }
          showToast('Special tags updated.', 'success')

          if (updatedProfile.id === context.session.profile.id) {
            context.router.navigate(createProfilePath(updatedProfile.username), {
              refresh: String(Date.now())
            })
            return
          }
        } catch (error) {
          showToast(error.message, 'error')
        } finally {
          saveButton.disabled = false
          saveButton.textContent = 'Save Special Tags'
        }
      })
    }
  }
}
