import { showToast } from './toast.js'
import { escapeHtml } from '../utils/dom.js'
import { getFeaturedBadge } from '../utils/profile.js'
import { readStorage, writeStorage } from '../utils/storage.js'

var CHAT_UI_KEY = 'pokobuilds3d:chat-ui'

function loadChatUiState() {
  var saved = readStorage(CHAT_UI_KEY, {})
  var legacyModeKeys = ['sizeMode', 'layoutMode', 'windowMode', 'chatMode']
  var hasLegacyMode = legacyModeKeys.some(function (key) {
    return Object.prototype.hasOwnProperty.call(saved, key)
  })
  var normalizedState = {
    collapsed: Boolean(saved.collapsed),
    side: saved.side === 'left' ? 'left' : 'right',
    mode: saved.mode === 'direct' ? 'direct' : 'community',
    directRecipientId: String(saved.directRecipientId || '').trim()
  }

  if (hasLegacyMode) {
    writeStorage(CHAT_UI_KEY, normalizedState)
  }

  return normalizedState
}

function saveChatUiState(state) {
  writeStorage(CHAT_UI_KEY, state)
  return state
}

function formatTime(value) {
  if (!value) {
    return ''
  }

  return new Date(value).toLocaleString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).replace(',', '')
}

function renderBadge(badge) {
  if (!badge) {
    return ''
  }

  return (
    '<span class="live-chat__badge live-chat__badge--' +
    escapeHtml(badge.tone || 'default') +
    '">' +
    escapeHtml(badge.label.toUpperCase()) +
    '</span>'
  )
}

function renderRecipientOptions(profiles, selectedValue) {
  return (
    '<option value="">Choose a builder</option>' +
    (profiles || [])
      .map(function (profile) {
        return (
          '<option value="' +
          escapeHtml(profile.id) +
          '"' +
          (profile.id === selectedValue ? ' selected' : '') +
          '>' +
          escapeHtml(profile.displayName || profile.username || 'Builder') +
          '</option>'
        )
      })
      .join('')
  )
}

function renderMessages(messages, options) {
  if (!messages.length) {
    return (
      '<div class="live-chat__empty muted">' +
      escapeHtml(options.emptyLabel || 'No messages yet. Start the conversation.') +
      '</div>'
    )
  }

  return messages
    .map(function (message) {
      var isSelf = Boolean(options.currentUserId) && message.userId === options.currentUserId
      var authorName = message.author?.displayName || message.author?.username || 'Builder'
      var featuredBadge = getFeaturedBadge(message.author)

      return (
        '<article class="live-chat__message' +
        (isSelf ? ' live-chat__message--self' : '') +
        '">' +
        '<p class="live-chat__line">' +
        '<strong class="live-chat__name">' +
        escapeHtml(isSelf ? 'You' : authorName) +
        '</strong>' +
        (featuredBadge ? ' ' + renderBadge(featuredBadge) : '') +
        '<span class="live-chat__separator">:</span> ' +
        '<span class="live-chat__text">' +
        escapeHtml(message.text) +
        '</span>' +
        '</p>' +
        '<div class="live-chat__time">' +
        escapeHtml(formatTime(message.createdAt)) +
        '</div>' +
        '</article>'
      )
    })
    .join('')
}

export function renderLiveChat(session) {
  var uiState = loadChatUiState()
  var hasSession = Boolean(session?.profile)
  var composePlaceholder = hasSession
    ? uiState.mode === 'direct'
      ? 'Choose a builder above to start a direct message.'
      : 'Share a quick build update or ask for help.'
    : uiState.mode === 'direct'
      ? 'Sign in to use direct messages.'
      : 'Sign in to join the live chat.'

  return (
    '<aside id="live-chat-root" class="live-chat live-chat--' +
    uiState.side +
    (uiState.collapsed ? ' is-collapsed' : '') +
    '">' +
    '<div class="live-chat__shell">' +
    '<div class="live-chat__header">' +
    '<div class="stack live-chat__heading"><span class="eyebrow">Chat</span><strong>Builder Log</strong></div>' +
    '<div class="button-row">' +
    '<button class="button button-ghost live-chat__header-button" id="live-chat-settings-toggle" type="button">Settings</button>' +
    '<button class="button button-secondary live-chat__header-button" id="live-chat-collapse" type="button">' +
    (uiState.collapsed ? 'Open' : 'Collapse') +
    '</button>' +
    '</div>' +
    '</div>' +
    '<div id="live-chat-body" class="live-chat__body"' +
    (uiState.collapsed ? ' hidden' : '') +
    '>' +
    '<div id="live-chat-settings" class="live-chat__settings inset-panel" hidden>' +
    '<label class="dropdown-field">Snap side<select id="live-chat-side" name="liveChatSide"><option value="right"' +
    (uiState.side === 'right' ? ' selected' : '') +
    '>Right</option><option value="left"' +
    (uiState.side === 'left' ? ' selected' : '') +
    '>Left</option></select></label>' +
    '<p class="muted compact-help">Choose where the live chat docks when it is expanded.</p>' +
    '</div>' +
    '<div class="live-chat__tabs">' +
    '<button class="button button-ghost live-chat__tab' +
    (uiState.mode === 'community' ? ' is-active' : '') +
    '" id="live-chat-tab-community" type="button">Community</button>' +
    '<button class="button button-ghost live-chat__tab' +
    (uiState.mode === 'direct' ? ' is-active' : '') +
    '" id="live-chat-tab-direct" type="button">DMs</button>' +
    '</div>' +
    '<div id="live-chat-direct-controls" class="live-chat__direct-controls inset-panel"' +
    (uiState.mode === 'direct' ? '' : ' hidden') +
    '>' +
    '<label class="dropdown-field">Message builder<select id="live-chat-recipient" name="liveChatRecipient"><option value="">' +
    escapeHtml(hasSession ? 'Loading builders...' : 'Sign in to use DMs') +
    '</option></select></label>' +
    '<p class="muted compact-help">DMs stay private and do not expire.</p>' +
    '</div>' +
    '<div id="live-chat-messages" class="live-chat__messages"><div class="live-chat__empty muted">Loading chat...</div></div>' +
    '<form id="live-chat-form" class="live-chat__composer">' +
    '<label class="live-chat__label"><span id="live-chat-compose-label">' +
    (uiState.mode === 'direct' ? 'Direct message' : 'Message') +
    '</span><textarea id="live-chat-input" rows="3" placeholder="' +
    escapeHtml(composePlaceholder) +
    '"' +
    (hasSession && uiState.mode === 'community' ? '' : ' disabled') +
    '></textarea></label>' +
    '<div class="split-row live-chat__composer-meta"><span class="muted" id="live-chat-context">' +
    escapeHtml(
      hasSession
        ? uiState.mode === 'direct'
          ? 'Pick a builder to open DMs.'
          : 'Posting as ' + (session.profile.displayName || session.profile.username)
        : 'Read only until you sign in.'
    ) +
    '</span><button class="button button-primary" id="live-chat-submit" type="submit">' +
    (hasSession ? 'Send' : 'Sign In') +
    '</button></div>' +
    '</form>' +
    '</div>' +
    '</div>' +
    '</aside>'
  )
}

export function mountLiveChat(options) {
  var root = document.getElementById('live-chat-root')

  if (!root) {
    return function () {}
  }

  var api = options.api
  var router = options.router
  var session = options.session
  var path = options.path
  var body = document.getElementById('live-chat-body')
  var messagesNode = document.getElementById('live-chat-messages')
  var form = document.getElementById('live-chat-form')
  var input = document.getElementById('live-chat-input')
  var settingsPanel = document.getElementById('live-chat-settings')
  var collapseButton = document.getElementById('live-chat-collapse')
  var settingsButton = document.getElementById('live-chat-settings-toggle')
  var sideSelect = document.getElementById('live-chat-side')
  var communityTab = document.getElementById('live-chat-tab-community')
  var directTab = document.getElementById('live-chat-tab-direct')
  var directControls = document.getElementById('live-chat-direct-controls')
  var recipientSelect = document.getElementById('live-chat-recipient')
  var composeLabel = document.getElementById('live-chat-compose-label')
  var contextNode = document.getElementById('live-chat-context')
  var submitButton = document.getElementById('live-chat-submit')
  var uiState = loadChatUiState()
  var settingsOpen = false
  var chatCleanup = null
  var directCleanup = null
  var directProfiles = []
  var refreshToken = 0

  function getRecipientId() {
    return recipientSelect?.value || uiState.directRecipientId || ''
  }

  function getComposeName() {
    return session?.profile?.displayName || session?.profile?.username || 'Builder'
  }

  function getEmptyLabel() {
    if (uiState.mode === 'community') {
      return 'No messages yet. Start the conversation.'
    }

    if (!session?.profile) {
      return 'Sign in to use direct messages.'
    }

    if (!getRecipientId()) {
      return 'Choose a builder to open your DMs.'
    }

    return 'No direct messages yet. Say hello.'
  }

  function applyUiState() {
    root.classList.toggle('is-collapsed', uiState.collapsed)
    root.classList.toggle('live-chat--left', uiState.side === 'left')
    root.classList.toggle('live-chat--right', uiState.side === 'right')
    body.hidden = uiState.collapsed
    settingsPanel.hidden = uiState.collapsed || !settingsOpen
    directControls.hidden = uiState.collapsed || uiState.mode !== 'direct'
    collapseButton.textContent = uiState.collapsed ? 'Open' : 'Collapse'
    communityTab.classList.toggle('is-active', uiState.mode === 'community')
    directTab.classList.toggle('is-active', uiState.mode === 'direct')
  }

  function syncComposerState() {
    var hasSession = Boolean(session?.profile)
    var isDirect = uiState.mode === 'direct'
    var hasRecipient = Boolean(getRecipientId())

    composeLabel.textContent = isDirect ? 'Direct message' : 'Message'
    input.disabled = !hasSession || (isDirect && !hasRecipient)
    input.placeholder = !hasSession
      ? isDirect
        ? 'Sign in to use direct messages.'
        : 'Sign in to join the live chat.'
      : isDirect
        ? hasRecipient
          ? 'Send a private message.'
          : 'Choose a builder above to start a direct message.'
        : 'Share a quick build update or ask for help.'
    contextNode.textContent = !hasSession
      ? 'Read only until you sign in.'
      : isDirect
        ? hasRecipient
          ? 'Only you and this builder can read these messages.'
          : 'Pick a builder to open DMs.'
        : 'Posting as ' + getComposeName()
    submitButton.textContent = hasSession ? 'Send' : 'Sign In'
    submitButton.disabled = hasSession ? isDirect && !hasRecipient : false

    if (recipientSelect) {
      recipientSelect.disabled = !hasSession || !directProfiles.length
    }
  }

  function renderCurrentMessages(messages) {
    messagesNode.innerHTML = renderMessages(messages, {
      currentUserId: session?.profile?.id,
      emptyLabel: getEmptyLabel()
    })
    messagesNode.scrollTop = messagesNode.scrollHeight
  }

  function renderErrorState(message) {
    messagesNode.innerHTML =
      '<div class="live-chat__empty muted">' + escapeHtml(message) + '</div>'
  }

  async function loadRecipients() {
    if (!recipientSelect) {
      return
    }

    if (!session?.profile || typeof api.listProfiles !== 'function') {
      recipientSelect.innerHTML = '<option value="">Sign in to use DMs</option>'
      directProfiles = []
      uiState.directRecipientId = ''
      syncComposerState()
      return
    }

    try {
      directProfiles = (await api.listProfiles())
        .filter(function (profile) {
          return profile.id !== session.profile.id
        })
        .sort(function (left, right) {
          var leftName = left.displayName || left.username || ''
          var rightName = right.displayName || right.username || ''
          return leftName.localeCompare(rightName)
        })

      if (
        uiState.directRecipientId &&
        !directProfiles.some(function (profile) {
          return profile.id === uiState.directRecipientId
        })
      ) {
        uiState.directRecipientId = ''
        saveChatUiState(uiState)
      }

      recipientSelect.innerHTML = renderRecipientOptions(directProfiles, uiState.directRecipientId)
      syncComposerState()
    } catch (error) {
      directProfiles = []
      uiState.directRecipientId = ''
      recipientSelect.innerHTML = '<option value="">Builder list unavailable</option>'
      syncComposerState()
    }
  }

  async function refreshMessages() {
    var token = (refreshToken += 1)

    try {
      var messages

      if (uiState.mode === 'community') {
        messages = await api.listChatMessages()
      } else if (!session?.profile) {
        messages = []
      } else if (!getRecipientId()) {
        messages = []
      } else if (typeof api.listDirectMessages !== 'function') {
        throw new Error('Direct messages are not available right now.')
      } else {
        messages = await api.listDirectMessages(getRecipientId(), session.profile)
      }

      if (token !== refreshToken) {
        return
      }

      renderCurrentMessages(messages)
    } catch (error) {
      if (token !== refreshToken) {
        return
      }

      renderErrorState(
        uiState.mode === 'direct'
          ? error.message || 'Direct messages could not be loaded right now.'
          : 'Chat could not be loaded right now.'
      )
    }
  }

  settingsButton.addEventListener('click', function () {
    settingsOpen = !settingsOpen
    applyUiState()
  })

  collapseButton.addEventListener('click', function () {
    uiState.collapsed = !uiState.collapsed
    saveChatUiState(uiState)

    if (uiState.collapsed) {
      settingsOpen = false
    }

    applyUiState()
  })

  sideSelect?.addEventListener('change', function () {
    uiState.side = sideSelect.value === 'left' ? 'left' : 'right'
    saveChatUiState(uiState)
    applyUiState()
  })

  communityTab?.addEventListener('click', function () {
    if (uiState.mode === 'community') {
      return
    }

    uiState.mode = 'community'
    saveChatUiState(uiState)
    applyUiState()
    syncComposerState()
    refreshMessages()
  })

  directTab?.addEventListener('click', function () {
    if (uiState.mode === 'direct') {
      return
    }

    uiState.mode = 'direct'
    saveChatUiState(uiState)
    applyUiState()
    syncComposerState()
    refreshMessages()
  })

  recipientSelect?.addEventListener('change', function () {
    uiState.directRecipientId = recipientSelect.value
    saveChatUiState(uiState)
    syncComposerState()
    refreshMessages()
  })

  form.addEventListener('submit', async function (event) {
    event.preventDefault()

    if (!session?.profile) {
      router.navigate('/auth', { redirect: path })
      return
    }

    try {
      if (uiState.mode === 'direct') {
        if (!getRecipientId()) {
          showToast('Choose a builder before sending a DM.', 'error')
          return
        }

        if (typeof api.sendDirectMessage !== 'function') {
          throw new Error('Direct messages are not available right now.')
        }

        await api.sendDirectMessage(getRecipientId(), input.value, session.profile)
      } else {
        await api.sendChatMessage(input.value, session.profile)
      }

      input.value = ''
      await refreshMessages()
    } catch (error) {
      showToast(error.message, 'error')
    }
  })

  applyUiState()
  syncComposerState()
  loadRecipients().then(function () {
    refreshMessages()
  })

  if (typeof api.subscribeToChatMessages === 'function') {
    chatCleanup = api.subscribeToChatMessages(function () {
      if (uiState.mode === 'community') {
        refreshMessages()
      }
    })
  }

  if (session?.profile && typeof api.subscribeToDirectMessages === 'function') {
    directCleanup = api.subscribeToDirectMessages(session.profile.id, function () {
      if (uiState.mode === 'direct') {
        refreshMessages()
      }
    })
  }

  return function cleanup() {
    if (chatCleanup) {
      chatCleanup()
    }

    if (directCleanup) {
      directCleanup()
    }
  }
}
