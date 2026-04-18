import { showToast } from './toast.js'
import { escapeHtml } from '../utils/dom.js'
import { getFeaturedBadge } from '../utils/profile.js'
import { readStorage, writeStorage } from '../utils/storage.js'

var CHAT_UI_KEY = 'pokobuilds3d:chat-ui'
var FREEFORM_MIN_WIDTH = 320
var FREEFORM_MIN_HEIGHT = 380
var CHAT_TEXT_SIZE_MIN = 10
var CHAT_TEXT_SIZE_MAX = 32
var CHAT_TEXT_SIZE_DEFAULT = 15

function isFiniteNumber(value) {
  return Number.isFinite(Number(value))
}

function normalizeLayoutMode(value) {
  var normalized = String(value || '').trim().toLowerCase()

  if (normalized === 'freeform' || normalized === 'popout') {
    return 'freeform'
  }

  return 'default'
}

function normalizeChatTextSize(value) {
  var numeric = Number(value)

  if (!Number.isFinite(numeric)) {
    return CHAT_TEXT_SIZE_DEFAULT
  }

  return Math.min(CHAT_TEXT_SIZE_MAX, Math.max(CHAT_TEXT_SIZE_MIN, Math.round(numeric)))
}

function loadChatUiState() {
  var saved = readStorage(CHAT_UI_KEY, {})
  var legacyModeKeys = ['sizeMode', 'layoutMode', 'windowMode', 'chatMode']
  var legacyLayoutValue =
    saved.layout || saved.layoutMode || saved.sizeMode || saved.windowMode || saved.chatMode
  var hasLegacyMode = legacyModeKeys.some(function (key) {
    return Object.prototype.hasOwnProperty.call(saved, key)
  })
  var normalizedState = {
    collapsed: Boolean(saved.collapsed),
    side: saved.side === 'left' ? 'left' : 'right',
    mode: saved.mode === 'direct' ? 'direct' : 'community',
    directRecipientId: String(saved.directRecipientId || '').trim(),
    layout: normalizeLayoutMode(legacyLayoutValue),
    textSize: normalizeChatTextSize(saved.textSize),
    freeformX: isFiniteNumber(saved.freeformX) ? Number(saved.freeformX) : null,
    freeformY: isFiniteNumber(saved.freeformY) ? Number(saved.freeformY) : null,
    freeformWidth: isFiniteNumber(saved.freeformWidth) ? Number(saved.freeformWidth) : null,
    freeformHeight: isFiniteNumber(saved.freeformHeight) ? Number(saved.freeformHeight) : null
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
    '<option value="">Choose a Ditto</option>' +
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

function renderTextSizeOptions(selectedValue) {
  var selectedSize = normalizeChatTextSize(selectedValue)
  var options = []
  var size

  for (size = CHAT_TEXT_SIZE_MIN; size <= CHAT_TEXT_SIZE_MAX; size += 1) {
    options.push(
      '<option value="' +
        size +
        '"' +
        (size === selectedSize ? ' selected' : '') +
        '>' +
        size +
        ' px</option>'
    )
  }

  return options.join('')
}

function renderConversationList(conversations, selectedRecipientId) {
  if (!conversations.length) {
    return '<div class="live-chat__conversation-empty muted">No DMs yet.</div>'
  }

  return (
    '<div class="live-chat__conversation-list">' +
    conversations
      .map(function (conversation) {
        return (
          '<button class="live-chat__conversation-button' +
          (conversation.profile.id === selectedRecipientId ? ' is-active' : '') +
          '" type="button" data-direct-recipient-id="' +
          escapeHtml(conversation.profile.id) +
          '">' +
          '<div class="live-chat__conversation-meta"><strong class="live-chat__conversation-name">' +
          escapeHtml(conversation.profile.displayName || conversation.profile.username || 'Ditto') +
          '</strong><span class="live-chat__conversation-time">' +
          escapeHtml(formatTime(conversation.lastMessageAt)) +
          '</span></div>' +
          '<p class="live-chat__conversation-preview">' +
          escapeHtml(conversation.lastMessage || '') +
          '</p>' +
          '</button>'
        )
      })
      .join('') +
    '</div>'
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
      ? 'Send a private message.'
      : 'Share a quick build update or ask for help.'
    : uiState.mode === 'direct'
      ? 'Sign in to use direct messages.'
      : 'Sign in to join the live chat.'

  return (
    '<aside id="live-chat-root" class="live-chat live-chat--' +
    uiState.side +
    ' live-chat--' +
    uiState.layout +
    (uiState.collapsed ? ' is-collapsed' : '') +
    '" style="--live-chat-font-size:' +
    uiState.textSize +
    'px;' +
    '">' +
    '<div class="live-chat__shell">' +
    '<div class="live-chat__header">' +
    '<div class="stack live-chat__heading"><strong>Ditto Diary Entries</strong></div>' +
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
    '<label class="dropdown-field">View mode<select id="live-chat-layout" name="liveChatLayout"><option value="default"' +
    (uiState.layout === 'default' ? ' selected' : '') +
    '>Default</option><option value="freeform"' +
    (uiState.layout === 'freeform' ? ' selected' : '') +
    '>Freeform</option></select></label>' +
    '<p class="muted compact-help">Default docks the chat to an edge. Freeform lets you drag and resize it.</p>' +
    '<div id="live-chat-snap-setting"' +
    (uiState.layout === 'default' ? '' : ' hidden') +
    '><label class="dropdown-field">Snap side<select id="live-chat-side" name="liveChatSide"><option value="right"' +
    (uiState.side === 'right' ? ' selected' : '') +
    '>Right</option><option value="left"' +
    (uiState.side === 'left' ? ' selected' : '') +
    '>Left</option></select></label>' +
    '<p class="muted compact-help">Choose where the live chat docks when it is expanded.</p>' +
    '</div>' +
    '<div class="live-chat__text-size-setting">' +
    '<div class="dropdown-field"><span class="live-chat__settings-label">Text size</span><div class="live-chat__text-size-controls"><div class="live-chat__text-size-number"><input id="live-chat-text-size-input" class="live-chat__text-size-input" name="liveChatTextSizeInput" type="number" min="' +
    CHAT_TEXT_SIZE_MIN +
    '" max="' +
    CHAT_TEXT_SIZE_MAX +
    '" step="1" value="' +
    escapeHtml(String(uiState.textSize)) +
    '" aria-label="Chat text size number" /></div><div class="live-chat__text-size-preset"><select id="live-chat-text-size" class="live-chat__text-size-select" name="liveChatTextSize" aria-label="Chat text size preset">' +
    renderTextSizeOptions(uiState.textSize) +
    '</select></div></div></div>' +
    '<p class="muted compact-help">Adjust chat text from 10px to 32px.</p>' +
    '</div>' +
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
    '<label class="dropdown-field">Message Ditto<select id="live-chat-recipient" name="liveChatRecipient"><option value="">' +
    escapeHtml(hasSession ? 'Choose a Ditto' : 'Sign in to use DMs') +
    '</option></select></label>' +
    '<p class="muted compact-help">DMs stay private and do not expire.</p>' +
    '</div>' +
    '<div id="live-chat-messages" class="live-chat__messages"><div class="live-chat__empty muted">Loading chat...</div></div>' +
    '<form id="live-chat-form" class="live-chat__composer"' +
    (uiState.mode === 'direct' && !uiState.directRecipientId ? ' hidden' : '') +
    '>' +
    '<label class="live-chat__label"><span id="live-chat-compose-label">' +
    (uiState.mode === 'direct' ? 'Message Ditto' : 'Message') +
    '</span><textarea id="live-chat-input" rows="3" placeholder="' +
    escapeHtml(composePlaceholder) +
    '"' +
    (hasSession && uiState.mode === 'community' ? '' : ' disabled') +
    '></textarea></label>' +
    '<div class="split-row live-chat__composer-meta"><span class="muted" id="live-chat-context">' +
    escapeHtml(
      hasSession
        ? uiState.mode === 'direct'
          ? ''
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
  var snapSetting = document.getElementById('live-chat-snap-setting')
  var collapseButton = document.getElementById('live-chat-collapse')
  var settingsButton = document.getElementById('live-chat-settings-toggle')
  var layoutSelect = document.getElementById('live-chat-layout')
  var sideSelect = document.getElementById('live-chat-side')
  var textSizeInput = document.getElementById('live-chat-text-size-input')
  var textSizeSelect = document.getElementById('live-chat-text-size')
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
  var directConversations = []
  var refreshToken = 0
  var dragCleanup = null
  var resizeCleanup = null

  function viewportBounds() {
    return {
      minX: 8,
      minY: 72,
      maxX: Math.max(8, window.innerWidth - 8),
      maxY: Math.max(72, window.innerHeight - 8)
    }
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max)
  }

  function captureFreeformRect() {
    var rect = root.getBoundingClientRect()
    return {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height
    }
  }

  function persistFreeformRect() {
    if (uiState.layout !== 'freeform' || uiState.collapsed) {
      return
    }

    var rect = captureFreeformRect()
    var bounds = viewportBounds()
    var width = clamp(rect.width, FREEFORM_MIN_WIDTH, bounds.maxX - bounds.minX)
    var height = clamp(rect.height, FREEFORM_MIN_HEIGHT, bounds.maxY - bounds.minY)

    uiState.freeformWidth = width
    uiState.freeformHeight = height
    uiState.freeformX = clamp(rect.x, bounds.minX, bounds.maxX - width)
    uiState.freeformY = clamp(rect.y, bounds.minY, bounds.maxY - height)
    saveChatUiState(uiState)
  }

  function ensureFreeformRect() {
    var currentRect = captureFreeformRect()
    var bounds = viewportBounds()
    var width = clamp(
      isFiniteNumber(uiState.freeformWidth) ? Number(uiState.freeformWidth) : currentRect.width,
      FREEFORM_MIN_WIDTH,
      bounds.maxX - bounds.minX
    )
    var height = clamp(
      isFiniteNumber(uiState.freeformHeight) ? Number(uiState.freeformHeight) : currentRect.height,
      FREEFORM_MIN_HEIGHT,
      bounds.maxY - bounds.minY
    )
    var x = clamp(
      isFiniteNumber(uiState.freeformX) ? Number(uiState.freeformX) : currentRect.left,
      bounds.minX,
      bounds.maxX - width
    )
    var y = clamp(
      isFiniteNumber(uiState.freeformY) ? Number(uiState.freeformY) : currentRect.top,
      bounds.minY,
      bounds.maxY - height
    )

    uiState.freeformWidth = width
    uiState.freeformHeight = height
    uiState.freeformX = x
    uiState.freeformY = y
  }

  function getRecipientId() {
    return recipientSelect?.value || uiState.directRecipientId || ''
  }

  function getComposeName() {
    return session?.profile?.displayName || session?.profile?.username || 'Builder'
  }

  function getSelectedRecipientProfile() {
    return (
      directProfiles.find(function (profile) {
        return profile.id === getRecipientId()
      }) || null
    )
  }

  function getEmptyLabel() {
    if (uiState.mode === 'community') {
      return 'No messages yet. Start the conversation.'
    }

    if (!session?.profile) {
      return 'Sign in to use direct messages.'
    }

    if (!getRecipientId()) {
      return 'Choose a Ditto to open your DMs.'
    }

    return 'No direct messages yet. Say hello.'
  }

  function bindConversationButtons() {
    Array.from(messagesNode.querySelectorAll('[data-direct-recipient-id]')).forEach(function (button) {
      button.addEventListener('click', function () {
        uiState.directRecipientId = button.dataset.directRecipientId || ''

        if (recipientSelect) {
          recipientSelect.value = uiState.directRecipientId
        }

        saveChatUiState(uiState)
        syncComposerState()
        refreshMessages()
      })
    })
  }

  function renderConversationInbox() {
    if (uiState.mode !== 'direct' || getRecipientId()) {
      return false
    }

    if (!session?.profile) {
      messagesNode.innerHTML = '<div class="live-chat__conversation-empty muted">Sign in to use DMs.</div>'
      return true
    }

    messagesNode.innerHTML = renderConversationList(directConversations, uiState.directRecipientId)
    bindConversationButtons()
    return true
  }

  function syncTextSizeControls() {
    if (textSizeInput) {
      textSizeInput.value = String(uiState.textSize)
    }

    if (textSizeSelect) {
      textSizeSelect.value = String(uiState.textSize)
    }
  }

  function updateTextSize(nextValue) {
    var normalizedValue = normalizeChatTextSize(nextValue)

    uiState.textSize = normalizedValue
    saveChatUiState(uiState)
    applyUiState()
  }

  function applyUiState() {
    root.classList.toggle('is-collapsed', uiState.collapsed)
    root.classList.toggle('live-chat--left', uiState.side === 'left')
    root.classList.toggle('live-chat--right', uiState.side === 'right')
    root.classList.toggle('live-chat--freeform', uiState.layout === 'freeform')
    root.classList.toggle('live-chat--default', uiState.layout !== 'freeform')
    root.style.setProperty('--live-chat-font-size', uiState.textSize + 'px')
    syncTextSizeControls()

    if (uiState.layout === 'freeform') {
      ensureFreeformRect()
      root.style.left = uiState.freeformX + 'px'
      root.style.top = uiState.freeformY + 'px'
      root.style.right = 'auto'
      root.style.bottom = uiState.collapsed ? '1rem' : 'auto'
      root.style.width = uiState.freeformWidth + 'px'
      root.style.height = uiState.collapsed ? 'auto' : uiState.freeformHeight + 'px'
    } else {
      root.style.left = ''
      root.style.top = ''
      root.style.right = ''
      root.style.bottom = ''
      root.style.width = ''
      root.style.height = ''
    }

    body.hidden = uiState.collapsed
    settingsPanel.hidden = uiState.collapsed || !settingsOpen
    if (snapSetting) {
      snapSetting.hidden = uiState.layout !== 'default'
    }
    directControls.hidden = uiState.collapsed || uiState.mode !== 'direct'
    collapseButton.textContent = uiState.collapsed ? 'Open' : 'Collapse'
    communityTab.classList.toggle('is-active', uiState.mode === 'community')
    directTab.classList.toggle('is-active', uiState.mode === 'direct')
  }

  function syncComposerState() {
    var hasSession = Boolean(session?.profile)
    var isDirect = uiState.mode === 'direct'
    var hasRecipient = Boolean(getRecipientId())
    var selectedRecipient = getSelectedRecipientProfile()

    composeLabel.textContent = isDirect ? 'Message Ditto' : 'Message'
    form.hidden = isDirect && !hasRecipient
    input.disabled = !hasSession || (isDirect && !hasRecipient)
    input.placeholder = !hasSession
      ? isDirect
        ? 'Sign in to use direct messages.'
        : 'Sign in to join the live chat.'
      : isDirect
        ? hasRecipient
          ? 'Send a private message.'
          : ''
        : 'Share a quick build update or ask for help.'
    contextNode.textContent = !hasSession
      ? 'Read only until you sign in.'
      : isDirect
        ? hasRecipient
          ? 'Chatting with ' +
            (selectedRecipient?.displayName || selectedRecipient?.username || 'Ditto') +
            '.'
          : ''
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

  async function loadDirectConversations() {
    if (!session?.profile || typeof api.listDirectConversations !== 'function') {
      directConversations = []
      return
    }

    try {
      directConversations = await api.listDirectConversations(session.profile)
    } catch (error) {
      directConversations = []
    }
  }

  async function refreshMessages() {
    var token = (refreshToken += 1)

    try {
      var messages

      if (uiState.mode === 'community') {
        messages = await api.listChatMessages()
      } else if (!session?.profile) {
        await loadDirectConversations()

        if (token !== refreshToken) {
          return
        }

        renderConversationInbox()
        return
      } else if (!getRecipientId()) {
        await loadDirectConversations()

        if (token !== refreshToken) {
          return
        }

        renderConversationInbox()
        return
      } else if (typeof api.listDirectMessages !== 'function') {
        throw new Error('Direct messages are not available right now.')
      } else {
        await loadDirectConversations()
        messages = await api.listDirectMessages(getRecipientId(), session.profile)
      }

      if (token !== refreshToken) {
        return
      }

      if (renderConversationInbox()) {
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

  layoutSelect?.addEventListener('change', function () {
    uiState.layout = normalizeLayoutMode(layoutSelect.value)

    if (uiState.layout === 'freeform') {
      var rect = captureFreeformRect()
      uiState.freeformX = rect.left
      uiState.freeformY = rect.top
      uiState.freeformWidth = rect.width
      uiState.freeformHeight = rect.height
    }

    saveChatUiState(uiState)
    applyUiState()
  })

  textSizeInput?.addEventListener('input', function () {
    if (!textSizeInput.value) {
      return
    }

    updateTextSize(textSizeInput.value)
  })

  textSizeInput?.addEventListener('change', function () {
    updateTextSize(textSizeInput.value || uiState.textSize)
  })

  textSizeSelect?.addEventListener('change', function () {
    updateTextSize(textSizeSelect.value)
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
          showToast('Choose a Ditto before sending a DM.', 'error')
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
      await loadDirectConversations()
      await refreshMessages()
    } catch (error) {
      showToast(error.message, 'error')
    }
  })

  function handleWindowResize() {
    if (uiState.layout !== 'freeform') {
      return
    }

    ensureFreeformRect()
    applyUiState()
    saveChatUiState(uiState)
  }

  function setupFreeformDrag() {
    var header = root.querySelector('.live-chat__header')

    if (!header) {
      return function () {}
    }

    function onMouseDown(event) {
      if (
        uiState.layout !== 'freeform' ||
        uiState.collapsed ||
        event.button !== 0 ||
        event.target.closest('button, a, input, select, textarea, label')
      ) {
        return
      }

      event.preventDefault()
      ensureFreeformRect()

      var startX = event.clientX
      var startY = event.clientY
      var originX = uiState.freeformX
      var originY = uiState.freeformY

      function onMouseMove(moveEvent) {
        var bounds = viewportBounds()
        uiState.freeformX = clamp(
          originX + (moveEvent.clientX - startX),
          bounds.minX,
          bounds.maxX - uiState.freeformWidth
        )
        uiState.freeformY = clamp(
          originY + (moveEvent.clientY - startY),
          bounds.minY,
          bounds.maxY - uiState.freeformHeight
        )
        applyUiState()
      }

      function onMouseUp() {
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
        saveChatUiState(uiState)
      }

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    }

    header.addEventListener('mousedown', onMouseDown)

    return function () {
      header.removeEventListener('mousedown', onMouseDown)
    }
  }

  function setupFreeformResizePersistence() {
    function onMouseUp() {
      persistFreeformRect()
    }

    document.addEventListener('mouseup', onMouseUp)
    window.addEventListener('resize', handleWindowResize)

    return function () {
      document.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('resize', handleWindowResize)
    }
  }

  applyUiState()
  syncComposerState()
  dragCleanup = setupFreeformDrag()
  resizeCleanup = setupFreeformResizePersistence()
  loadRecipients().then(function () {
    loadDirectConversations().then(function () {
      refreshMessages()
    })
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
      loadDirectConversations().then(function () {
        if (uiState.mode === 'direct') {
          refreshMessages()
        }
      })
    })
  }

  return function cleanup() {
    if (chatCleanup) {
      chatCleanup()
    }

    if (directCleanup) {
      directCleanup()
    }

    if (dragCleanup) {
      dragCleanup()
    }

    if (resizeCleanup) {
      resizeCleanup()
    }
  }
}
