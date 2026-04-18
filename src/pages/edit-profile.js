import { showToast } from '../components/toast.js'
import { escapeHtml } from '../utils/dom.js'
import { createProfilePath } from '../utils/format.js'
import { getProfileAvatar, normalizeSocials, parseSocialsFromForm } from '../utils/profile.js'

function renderSocialField(entry) {
  return (
    '<div class="social-editor-row inset-panel" data-social-row>' +
    '<label>Site name<input name="socialLabel" type="text" maxlength="30" placeholder="Instagram, YouTube, personal site" value="' +
    escapeHtml(entry?.label || '') +
    '" /></label>' +
    '<label>Link URL<input name="socialUrl" type="text" inputmode="url" autocapitalize="off" spellcheck="false" placeholder="https://example.com or www.example.com" value="' +
    escapeHtml(entry?.url || '') +
    '" /></label>' +
    '<button class="button button-ghost social-row-remove" data-remove-social type="button">Remove</button>' +
    '</div>'
  )
}

export var editProfilePage = {
  path: '/profile/edit',
  title: 'Edit Profile',
  requiresAuth: true,
  async render(context) {
    var profile = context.session.profile
    var socials = normalizeSocials(profile.socials)

    return (
      '<section class="shell narrow page-stack">' +
      '<article class="card stack">' +
      '<span class="eyebrow">Profile</span>' +
      '<h1>Edit profile</h1>' +
      '<form id="edit-profile-form" class="stack">' +
      '<div class="profile-avatar-upload">' +
      '<img class="avatar avatar-large" id="profile-avatar-preview" src="' +
      escapeHtml(getProfileAvatar(profile)) +
      '" alt="' +
      escapeHtml(profile.displayName || profile.username) +
      '" />' +
      '<label>Avatar image<input id="profile-avatar-input" name="avatar" type="file" accept="image/*" /></label>' +
      '</div>' +
      '<label>Display name<input name="displayName" type="text" required value="' +
      escapeHtml(profile.displayName) +
      '" /></label>' +
      '<label>Username<input name="username" type="text" required value="' +
      escapeHtml(profile.username) +
      '" /></label>' +
      '<label>Bio<textarea name="bio" rows="5" placeholder="A short builder bio">' +
      escapeHtml(profile.bio || '') +
      '</textarea></label>' +
      '<div class="stack">' +
      '<div class="split-row">' +
      '<div class="stack">' +
      '<span class="eyebrow">Socials</span>' +
      '<p class="muted form-helper">Add up to 5 custom links to your profile.</p>' +
      '</div>' +
      '<button class="button button-secondary" id="add-social-button" type="button">+ Add Link</button>' +
      '</div>' +
      '<div id="social-fields" class="social-editor-list">' +
      socials.map(renderSocialField).join('') +
      '</div>' +
      '</div>' +
      '<button class="button button-primary" type="submit">Save Profile</button>' +
      '</form>' +
      '</article>' +
      '</section>'
    )
  },
  async afterRender(context) {
    var form = document.getElementById('edit-profile-form')
    var avatarInput = document.getElementById('profile-avatar-input')
    var avatarPreview = document.getElementById('profile-avatar-preview')
    var socialFields = document.getElementById('social-fields')
    var addSocialButton = document.getElementById('add-social-button')
    var previewUrl = ''

    function socialCount() {
      return socialFields.querySelectorAll('[data-social-row]').length
    }

    function syncSocialButton() {
      addSocialButton.disabled = socialCount() >= 5
    }

    function addSocialRow(entry) {
      if (socialCount() >= 5) {
        showToast('You can add up to 5 social links.', 'error')
        return
      }

      socialFields.insertAdjacentHTML('beforeend', renderSocialField(entry))
      syncSocialButton()
    }

    avatarInput.addEventListener('change', function () {
      var file = avatarInput.files && avatarInput.files[0]

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
        previewUrl = ''
      }

      if (file) {
        previewUrl = URL.createObjectURL(file)
        avatarPreview.src = previewUrl
        return
      }

      avatarPreview.src = getProfileAvatar(context.session.profile)
    })

    addSocialButton.addEventListener('click', function () {
      addSocialRow({
        label: '',
        url: ''
      })
    })

    socialFields.addEventListener('click', function (event) {
      var removeButton = event.target.closest('[data-remove-social]')

      if (!removeButton) {
        return
      }

      var row = removeButton.closest('[data-social-row]')

      if (row) {
        row.remove()
        syncSocialButton()
      }
    })

    syncSocialButton()

    form.addEventListener('submit', async function (event) {
      event.preventDefault()
      var formData = new FormData(form)

      try {
        var avatarUrl = context.session.profile.avatarUrl
        var avatarFile = formData.get('avatar')
        if (avatarFile && avatarFile.size) {
          avatarUrl = await context.api.uploadAvatar(avatarFile, context.session.profile)
        }

        await context.api.updateProfile(context.session.profile.id, {
          displayName: String(formData.get('displayName') || '').trim(),
          username: String(formData.get('username') || '').trim(),
          bio: String(formData.get('bio') || '').trim(),
          avatarUrl: avatarUrl,
          socials: parseSocialsFromForm(formData)
        })
        showToast('Profile updated.', 'success')
        context.router.navigate(createProfilePath(String(formData.get('username') || '').trim()))
      } catch (error) {
        showToast(error.message, 'error')
      }
    })

    return function cleanup() {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }
}
