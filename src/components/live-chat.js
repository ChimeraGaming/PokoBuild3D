import { showToast } from './toast.js'
import { escapeHtml } from '../utils/dom.js'
import { getProfileAvatar } from '../utils/profile.js'
import { readStorage, writeStorage } from '../utils/storage.js'

var CHAT_UI_KEY = 'pokobuilds3d:chat-ui'
var CHAT_REFRESH_INTERVAL_MS = 15000

function loadChatUiState() {
  var saved = readStorage(CHAT_UI_KEY, {})

  return {
    collapsed: Boolean(saved.collapsed),
    side: saved.side === 'left' ? 'left' : 'right'
  }
}

function saveChatUiState(state) {
  writeStorage(CHAT_UI_KEY, state)
  return state
}

function formatTime(value) {
  if (!value) {
    return ''
  }

  return new Date(value).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit'
  })
}

function renderMessages(messages) {
  if (!messages.length) {
    return '<div class="live-chat__empty muted">No messages yet. Start the conversation.</div>'
  }

  return messages
    .map(function (message) {
      return (
        '<article class="live-chat__message">' +
        '<img class="live-chat__avatar" src="' +
        escapeHtml(getProfileAvatar(message.author)) +
        '" alt="' +
        escapeHtml(message.author?.displayName || message.author?.username || 'Builder') +
        '" />' +
        '<div class="live-chat__bubble">' +
        '<div class="live-chat__meta"><strong>' +
        escapeHtml(message.author?.displayName || message.author?.username || 'Builder') +
        '</strong><span>' +
        escapeHtml(formatTime(message.createdAt)) +
        '</span></div>' +
        '<p>' +
        escapeHtml(message.text) +
        '</p>' +
        '</div>' +
        '</article>'
      )
    })
    .join('')
}

export function renderLiveChat(session) {
  var uiState = loadChatUiState()

  return (
    '<aside id="live-chat-root" class="live-chat live-chat--' +
    uiState.side +
    (uiState.collapsed ? ' is-collapsed' : '') +
    '">' +
    '<div class="live-chat__shell">' +
    '<div class="live-chat__header">' +
    '<div class="stack live-chat__heading"><span class="eyebrow">Community</span><strong>Live chat</strong></div>' +
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
    '<div id="live-chat-messages" class="live-chat__messages"><div class="live-chat__empty muted">Loading chat...</div></div>' +
    '<form id="live-chat-form" class="live-chat__composer">' +
    '<label class="live-chat__label">Message<textarea id="live-chat-input" rows="3" placeholder="' +
    escapeHtml(session?.profile ? 'Share a quick build update or ask for help.' : 'Sign in to join the live chat.') +
    '"' +
    (session?.profile ? '' : ' disabled') +
    '></textarea></label>' +
    '<div class="split-row"><span class="muted">' +
    escapeHtml(
      session?.profile
        ? 'Posting as ' + (session.profile.displayName || session.profile.username)
        : 'Read only until you sign in.'
    ) +
    '</span><button class="button button-primary" type="submit">' +
    (session?.profile ? 'Send' : 'Sign In') +
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
  var submitButton = form?.querySelector('button[type="submit"]')
  var settingsPanel = document.getElementById('live-chat-settings')
  var collapseButton = document.getElementById('live-chat-collapse')
  var settingsButton = document.getElementById('live-chat-settings-toggle')
  var sideSelect = document.getElementById('live-chat-side')
  var uiState = loadChatUiState()
  var settingsOpen = false
  var subscriptionCleanup = null
  var refreshIntervalId = null
  var refreshInFlight = null
  var isMounted = true

  function applyUiState() {
    root.classList.toggle('is-collapsed', uiState.collapsed)
    root.classList.toggle('live-chat--left', uiState.side === 'left')
    root.classList.toggle('live-chat--right', uiState.side === 'right')
    body.hidden = uiState.collapsed
    settingsPanel.hidden = uiState.collapsed || !settingsOpen
    collapseButton.textContent = uiState.collapsed ? 'Open' : 'Collapse'
  }

  function shouldStickToBottom() {
    return messagesNode.scrollHeight - messagesNode.scrollTop - messagesNode.clientHeight < 48
  }

  function setComposerBusy(isBusy) {
    if (session?.profile && input) {
      input.disabled = isBusy
    }

    if (submitButton) {
      submitButton.disabled = isBusy
    }
  }

  async function refreshMessages(options) {
    if (refreshInFlight) {
      return refreshInFlight
    }

    var forceScroll = Boolean(options?.forceScroll)
    var stickToBottom = forceScroll || shouldStickToBottom()

    refreshInFlight = (async function () {
      try {
        var messages = await api.listChatMessages()
        messagesNode.innerHTML = renderMessages(messages)

        if (stickToBottom) {
          messagesNode.scrollTop = messagesNode.scrollHeight
        }
      } catch (error) {
        messagesNode.innerHTML =
          '<div class="live-chat__empty muted">Chat could not be loaded right now.</div>'
      } finally {
        refreshInFlight = null
      }
    })()

    return refreshInFlight
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

  form.addEventListener('submit', async function (event) {
    event.preventDefault()

    if (!session?.profile) {
      router.navigate('/auth', { redirect: path })
      return
    }

    try {
      setComposerBusy(true)
      await api.sendChatMessage(input.value, session.profile)
      input.value = ''
      await refreshMessages({ forceScroll: true })
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setComposerBusy(false)
    }
  })

  async function bootstrapChat() {
    await refreshMessages({ forceScroll: true })

    if (!isMounted || typeof api.subscribeToChatMessages !== 'function') {
      return
    }

    try {
      subscriptionCleanup = api.subscribeToChatMessages(function () {
        refreshMessages()
      })
    } catch (error) {
      subscriptionCleanup = null
    }
  }

  applyUiState()
  bootstrapChat()

  refreshIntervalId = window.setInterval(function () {
    refreshMessages()
  }, CHAT_REFRESH_INTERVAL_MS)

  return function cleanup() {
    isMounted = false

    if (refreshIntervalId) {
      window.clearInterval(refreshIntervalId)
    }

    if (subscriptionCleanup) {
      subscriptionCleanup()
    }
  }
}
