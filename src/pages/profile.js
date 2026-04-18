import { renderBuildCard } from '../components/build-card.js'
import { renderEmptyState } from '../components/states.js'
import { showToast } from '../components/toast.js'
import { escapeHtml } from '../utils/dom.js'
import { createProfilePath, formatDate } from '../utils/format.js'
import { readStorage, writeStorage } from '../utils/storage.js'
import {
  ASSIGNABLE_SPECIAL_TAG_OPTIONS,
  canAssignSpecialTags,
  getBadgeCatalog,
  getFeaturedBadge,
  getProfileAvatar,
  getUnlockedBadges,
  renderBadgeChips,
  renderSocialLinks
} from '../utils/profile.js'

var PROFILE_TAB_KEY = 'pokobuilds3d:profile-tab'

function normalizeProfileTab(value) {
  return value === 'achievements' ? 'achievements' : 'builds'
}

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
    return 'No assignable badges selected'
  }

  return selectedTags.join(', ')
}

function renderMilestoneList(milestones) {
  if (!milestones.length) {
    return ''
  }

  return (
    '<div class="achievement-milestones">' +
    milestones
      .map(function (milestone) {
        return (
          '<div class="achievement-milestone' +
          (milestone.isUnlocked ? ' is-unlocked' : '') +
          '">' +
          '<strong>' +
          escapeHtml(milestone.label) +
          '</strong>' +
          '<span>' +
          escapeHtml(milestone.helper) +
          '</span>' +
          '</div>'
        )
      })
      .join('') +
    '</div>'
  )
}

function getAchievementTone(entry) {
  if (entry?.currentBadge?.tone) {
    return entry.currentBadge.tone
  }

  if (entry?.key === 'post-master') {
    return 'post-master'
  }

  if (entry?.key === 'chatterbox') {
    return 'chatterbox'
  }

  if (entry?.key === 'owner') {
    return 'owner'
  }

  if (entry?.key === 'site-admin') {
    return 'admin'
  }

  if (entry?.key === 'community-expert') {
    return 'expert'
  }

  if (entry?.key === 'early-bird') {
    return 'early-bird'
  }

  return 'default'
}

function renderAchievementCard(entry) {
  var tone = getAchievementTone(entry)
  var isUnlocked = Boolean(entry.currentBadge)
  var summaryTone = isUnlocked ? tone : 'locked'

  return (
    '<article class="card stack achievement-card achievement-card--' +
    escapeHtml(tone) +
    (isUnlocked ? ' is-unlocked' : ' is-locked') +
    '">' +
    '<div class="split-row achievement-card__header"><div><span class="eyebrow achievement-card__eyebrow">Badge</span><h3>' +
    escapeHtml(entry.title) +
    '</h3></div><span class="tag-pill achievement-card__summary-pill achievement-card__summary-pill--' +
    escapeHtml(summaryTone) +
    '">' +
    escapeHtml(entry.currentBadge ? entry.currentBadge.label : entry.countLabel) +
    '</span></div>' +
    '<p class="muted">' +
    escapeHtml(entry.description) +
    '</p>' +
    (entry.currentBadge
      ? '<div class="achievement-card__earned">' +
        renderBadgeChips([entry.currentBadge]) +
        '</div>'
      : '<p class="muted achievement-card__locked">Not unlocked yet.</p>') +
    '<p class="achievement-card__count">' +
    escapeHtml(entry.countLabel) +
    '</p>' +
    renderMilestoneList(entry.milestones || []) +
    '</article>'
  )
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
    var isOwnProfile = context.session?.profile?.id === profile.id
    var activeTab = normalizeProfileTab(readStorage(PROFILE_TAB_KEY, 'builds'))
    var publishedBuilds = builds.filter(function (build) {
      return build.isPublished
    })
    var draftBuilds = isOwnProfile
      ? builds.filter(function (build) {
          return !build.isPublished
        })
      : []
    var publishedCards = publishedBuilds.length
      ? publishedBuilds.map(renderBuildCard).join('')
      : renderEmptyState(
          'No builds yet',
          'Published builds from this profile will appear here.',
          '',
          ''
        )
    var draftCards = draftBuilds.length
      ? draftBuilds.map(renderBuildCard).join('')
      : ''
    var canManageTags = canAssignSpecialTags(context.session?.profile)
    var unlockedBadges = getUnlockedBadges(profile)
    var featuredBadge = getFeaturedBadge(profile)
    var badgeCatalog = getBadgeCatalog(profile)
    var assignableTags = (profile.specialTags || []).filter(function (tag) {
      return ASSIGNABLE_SPECIAL_TAG_OPTIONS.includes(tag)
    })

    return (
      '<section class="shell page-stack">' +
      '<div class="profile-hero card">' +
      '<img class="avatar avatar-large" src="' +
      escapeHtml(getProfileAvatar(profile)) +
      '" alt="' +
      escapeHtml(profile.displayName) +
      '" />' +
      '<div class="stack profile-copy">' +
      '<span class="eyebrow profile-kicker">' +
      escapeHtml(profile.username) +
      '</span>' +
      '<h1>' +
      escapeHtml(profile.displayName) +
      '</h1>' +
      (featuredBadge
        ? '<div class="profile-featured-badge profile-section-block">' +
          '<span class="eyebrow profile-section-label">Featured badge</span>' +
          renderBadgeChips([featuredBadge]) +
          '</div>'
        : '') +
      '<p>' +
      escapeHtml(profile.bio || 'No bio added yet.') +
      '</p>' +
      '<div class="tag-row profile-stat-row">' +
      '<span class="tag-pill profile-stat-pill">' +
      escapeHtml(profile.buildCount) +
      ' published builds</span>' +
      '<span class="tag-pill profile-stat-pill">' +
      escapeHtml(profile.chatCount) +
      ' chat messages</span>' +
      '<span class="tag-pill profile-stat-pill">' +
      escapeHtml(profile.favoritesCount) +
      ' favorites</span>' +
      '<span class="tag-pill profile-stat-pill">Joined ' +
      escapeHtml(formatDate(profile.createdAt)) +
      '</span>' +
      '</div>' +
      (unlockedBadges.length
        ? '<div class="profile-special-tags stack profile-section-block">' +
          '<span class="eyebrow profile-section-label">Unlocked badges</span>' +
          '<div id="profile-special-tags">' +
          renderBadgeChips(unlockedBadges) +
          '</div>' +
          '</div>'
        : '') +
      '<div class="profile-socials profile-section-block">' +
      '<span class="eyebrow profile-section-label">Socials</span>' +
      renderSocialLinks(profile.socials) +
      '</div>' +
      '</div>' +
      '<div class="profile-actions">' +
      (isOwnProfile
        ? '<a class="button button-primary" href="#/profile/edit">Edit Profile</a><a class="button button-secondary" href="#/dashboard">My Builds</a><button class="button button-ghost" id="profile-open-achievements" type="button">Achievements</button><button class="button button-ghost" id="sign-out-button" type="button">Sign Out</button>'
        : '') +
      '</div>' +
      '</div>' +
      (canManageTags
        ? '<section class="card stack">' +
          '<span class="eyebrow profile-section-label">Owner tools</span>' +
          '<h2>Manage special badges</h2>' +
          '<p class="muted">Choose which owner-managed badges appear on this profile.</p>' +
          '<form id="special-tags-form" class="stack" data-profile-id="' +
          escapeHtml(profile.id) +
          '" data-profile-username="' +
          escapeHtml(profile.username) +
          '">' +
          '<details class="dropdown-menu special-tags-dropdown" id="special-tags-dropdown"><summary class="dropdown-menu__summary"><span>Managed badges</span><span id="special-tags-selection" class="muted">' +
          escapeHtml(renderSpecialTagSelection(assignableTags)) +
          '</span></summary><div class="dropdown-menu__panel"><div class="dropdown-checkbox-list">' +
          ASSIGNABLE_SPECIAL_TAG_OPTIONS.map(function (tag) {
            return renderSpecialTagOption(tag, assignableTags.includes(tag))
          }).join('') +
          '</div></div></details>' +
          '<div class="button-row">' +
          '<button class="button button-primary" id="save-special-tags" type="submit">Save Special Badges</button>' +
          '</div>' +
          '</form>' +
          '</section>'
        : '') +
      '<section class="card stack" id="profile-progress-section">' +
      '<div class="split-row"><div><span class="eyebrow profile-section-label">Profile tabs</span><h2>Progress</h2></div></div>' +
      '<div class="profile-section-tabs">' +
      '<button class="button ' +
      (activeTab === 'builds' ? 'button-secondary is-active' : 'button-ghost') +
      '" type="button" data-profile-tab="builds">Builds</button>' +
      '<button class="button ' +
      (activeTab === 'achievements' ? 'button-secondary is-active' : 'button-ghost') +
      '" type="button" data-profile-tab="achievements">Achievements</button>' +
      '</div>' +
      '<div id="profile-tab-builds" data-profile-panel="builds"' +
      (activeTab === 'builds' ? '' : ' hidden') +
      '>' +
      '<div class="split-row"><div><span class="eyebrow profile-section-label">Published builds</span><h3>Build library</h3></div></div>' +
      '<div class="card-grid card-grid-three">' +
      publishedCards +
      '</div>' +
      (draftBuilds.length
        ? '<div class="stack profile-draft-section"><div class="split-row"><div><span class="eyebrow profile-section-label">Private drafts</span><h3>Draft shelf</h3></div></div><p class="muted">These posts only show on your profile until you publish them from the build page.</p><div class="card-grid card-grid-three">' +
          draftCards +
          '</div></div>'
        : '') +
      '</div>' +
      '<div id="profile-tab-achievements" data-profile-panel="achievements"' +
      (activeTab === 'achievements' ? '' : ' hidden') +
      '>' +
      '<div class="split-row"><div><span class="eyebrow profile-section-label">Badge guide</span><h3>Achievements</h3></div></div>' +
      '<div class="achievement-grid">' +
      badgeCatalog.map(renderAchievementCard).join('') +
      '</div>' +
      '</div>' +
      '</section>' +
      '</section>'
    )
  },
  async afterRender(context) {
    var signOutButton = document.getElementById('sign-out-button')
    var achievementsButton = document.getElementById('profile-open-achievements')
    var progressSection = document.getElementById('profile-progress-section')
    var specialTagsForm = document.getElementById('special-tags-form')
    var specialTagsSelection = document.getElementById('special-tags-selection')
    var tabButtons = Array.from(document.querySelectorAll('[data-profile-tab]'))
    var tabPanels = Array.from(document.querySelectorAll('[data-profile-panel]'))

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

    function setActiveTab(tabName) {
      var nextTab = normalizeProfileTab(tabName)

      tabButtons.forEach(function (button) {
        var isActive = button.dataset.profileTab === nextTab
        button.classList.toggle('is-active', isActive)
        button.classList.toggle('button-secondary', isActive)
        button.classList.toggle('button-ghost', !isActive)
      })

      tabPanels.forEach(function (panel) {
        panel.hidden = panel.dataset.profilePanel !== nextTab
      })

      writeStorage(PROFILE_TAB_KEY, nextTab)
    }

    if (signOutButton) {
      signOutButton.addEventListener('click', async function () {
        await context.api.signOut()
        context.router.navigate('/')
      })
    }

    if (tabButtons.length) {
      tabButtons.forEach(function (button) {
        button.addEventListener('click', function () {
          setActiveTab(button.dataset.profileTab)
        })
      })
      setActiveTab(normalizeProfileTab(readStorage(PROFILE_TAB_KEY, 'builds')))
    }

    if (achievementsButton) {
      achievementsButton.addEventListener('click', function () {
        setActiveTab('achievements')
        progressSection?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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

          await context.api.setProfileSpecialTags(
            specialTagsForm.dataset.profileId,
            nextTags,
            context.session.profile
          )

          showToast('Special badges updated.', 'success')
          context.router.navigate(createProfilePath(specialTagsForm.dataset.profileUsername), {
            refresh: String(Date.now())
          })
        } catch (error) {
          showToast(error.message, 'error')
        } finally {
          saveButton.disabled = false
          saveButton.textContent = 'Save Special Badges'
        }
      })
    }
  }
}
