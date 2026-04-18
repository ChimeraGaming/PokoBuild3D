import { clamp } from '../utils/format.js'
import { showToast } from './toast.js'
import { escapeHtml } from '../utils/dom.js'
import { getProfileAvatar } from '../utils/profile.js'
import { readStorage, writeStorage } from '../utils/storage.js'

var CHAT_UI_KEY = 'pokobuilds3d:chat-ui'
var CHAT_REFRESH_INTERVAL_MS = 15000
var CHAT_WIDTH_PRESETS = {
  compact: 320,
  standard: 384,
  wide: 448
}
var CHAT_WINDOW_MIN_WIDTH = 280
var CHAT_WINDOW_MIN_HEIGHT = 360
var CHAT_WINDOW_MAX_WIDTH = 640
var CHAT_WINDOW_MAX_HEIGHT = 860
var CHAT_MODE_OPTIONS = [
  { value: 'default', label: 'Default' },
  { value: 'freeform', label: 'Freeform' },
  { value: 'popout', label: 'Popout' }
]
var CHAT_SIZE_OPTIONS = [
  { value: 'compact', label: 'Compact' },
  { value: 'standard', label: 'Standard' },
  { value: 'wide', label: 'Wide' }
]

function renderOptions(options, selectedValue) {
  return options
    .map(function (option) {
      return (
        '<option value="' +
        escapeHtml(option.value) +
        '"' +
        (option.value === selectedValue ? ' selected' : '') +
        '>' +
        escapeHtml(option.label) +
        '</option>'
      )
    })
    .join('')
}

function createWindowDefaults(mode) {
  var viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1366
  var viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 900
  var width = mode === 'popout' ? 340 : 380
  var height = mode === 'popout' ? 520 : 620

  return clampWindowRect(
    {
      x: viewportWidth - width - 24,
      y: mode === 'popout' ? viewportHeight - height - 24 : 88,
      width: width,
      height: height
    },
    viewportWidth,
    viewportHeight
  )
}

function normalizeWindowRect(rect, mode) {
  var defaults = createWindowDefaults(mode)

  return {
    x: Number.isFinite(rect?.x) ? rect.x : defaults.x,
    y: Number.isFinite(rect?.y) ? rect.y : defaults.y,
    width: Number.isFinite(rect?.width) ? rect.width : defaults.width,
    height: Number.isFinite(rect?.height) ? rect.height : defaults.height
  }
}

function clampWindowRect(rect, viewportWidth, viewportHeight) {
  var maxWidth = Math.max(260, Math.min(CHAT_WINDOW_MAX_WIDTH, viewportWidth - 16))
  var minWidth = Math.min(CHAT_WINDOW_MIN_WIDTH, maxWidth)
  var maxHeight = Math.max(280, Math.min(CHAT_WINDOW_MAX_HEIGHT, viewportHeight - 16))
  var minHeight = Math.min(CHAT_WINDOW_MIN_HEIGHT, maxHeight)
  var width = clamp(Number(rect?.width || 0), minWidth, maxWidth)
  var height = clamp(Number(rect?.height || 0), minHeight, maxHeight)
  var x = clamp(
    Number.isFinite(rect?.x) ? rect.x : viewportWidth - width - 24,
    8,
    Math.max(8, viewportWidth - width - 8)
  )
  var y = clamp(
    Number.isFinite(rect?.y) ? rect.y : Math.max(8, viewportHeight - height - 24),
    8,
    Math.max(8, viewportHeight - height - 8)
  )

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height)
  }
}

function getChatRootClass(uiState) {
  return (
    'live-chat live-chat--' +
    uiState.side +
    ' live-chat--mode-' +
    uiState.mode +
    (uiState.collapsed ? ' is-collapsed' : '')
  )
}

function getChatRootStyle(uiState) {
  var styles = ['--live-chat-width:' + (CHAT_WIDTH_PRESETS[uiState.sizePreset] || 384) + 'px']

  if (uiState.mode !== 'default') {
    var windowRect = normalizeWindowRect(
      uiState.mode === 'popout' ? uiState.popoutRect : uiState.freeformRect,
      uiState.mode
    )
    var clampedRect = clampWindowRect(
      windowRect,
      typeof window !== 'undefined' ? window.innerWidth : 1366,
      typeof window !== 'undefined' ? window.innerHeight : 900
    )

    styles.push('--live-chat-left:' + clampedRect.x + 'px')
    styles.push('--live-chat-top:' + clampedRect.y + 'px')
    styles.push('--live-chat-width:' + clampedRect.width + 'px')
    styles.push('--live-chat-height:' + clampedRect.height + 'px')
  }

  return styles.join(';')
}

function getSettingsHelp(mode) {
  if (mode === 'freeform') {
    return 'Freeform lets you drag the chat anywhere and resize it from the lower right corner.'
  }

  if (mode === 'popout') {
    return 'Popout floats like a separate bubble window that you can move and resize.'
  }

  return 'Default keeps the chat fitted to the screen height and snapped to the side you choose.'
}

function loadChatUiState() {
  var saved = readStorage(CHAT_UI_KEY, {})

  return {
    collapsed: Boolean(saved.collapsed),
    side: saved.side === 'left' ? 'left' : 'right',
    mode:
      saved.mode === 'freeform' || saved.mode === 'popout' || saved.mode === 'default'
        ? saved.mode
        : 'default',
    sizePreset:
      saved.sizePreset === 'compact' || saved.sizePreset === 'wide' || saved.sizePreset === 'standard'
        ? saved.sizePreset
        : 'standard',
    freeformRect: normalizeWindowRect(saved.freeformRect, 'freeform'),
    popoutRect: normalizeWindowRect(saved.popoutRect, 'popout')
  }
}

function saveChatUiState(state) {
  writeStorage(CHAT_UI_KEY, state)
  return state
}

function padDatePart(value) {
  return String(value).padStart(2, '0')
}

function formatTimestamp(value) {
  if (!value) {
    return ''
  }

  var date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  var month = padDatePart(date.getMonth() + 1)
  var day = padDatePart(date.getDate())
  var year = padDatePart(date.getFullYear() % 100)
  var minutes = padDatePart(date.getMinutes())
  var meridiem = date.getHours() >= 12 ? 'PM' : 'AM'
  var hours = date.getHours() % 12 || 12

  return month + '/' + day + '/' + year + ' ' + hours + ':' + minutes + ' ' + meridiem
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
        '</strong><span class="live-chat__timestamp">' +
        escapeHtml(formatTimestamp(message.createdAt)) +
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
    '<aside id="live-chat-root" class="' +
    getChatRootClass(uiState) +
    '" style="' +
    escapeHtml(getChatRootStyle(uiState)) +
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
    '<div class="compact-field-grid live-chat__settings-grid">' +
    '<label class="dropdown-field">Mode<select id="live-chat-mode" name="liveChatMode">' +
    renderOptions(CHAT_MODE_OPTIONS, uiState.mode) +
    '</select></label>' +
    '<label class="dropdown-field" id="live-chat-side-field"' +
    (uiState.mode === 'default' ? '' : ' hidden') +
    '>Snap side<select id="live-chat-side" name="liveChatSide"><option value="right"' +
    (uiState.side === 'right' ? ' selected' : '') +
    '>Right</option><option value="left"' +
    (uiState.side === 'left' ? ' selected' : '') +
    '>Left</option></select></label>' +
    '<label class="dropdown-field" id="live-chat-size-field"' +
    (uiState.mode === 'default' ? '' : ' hidden') +
    '>Default size<select id="live-chat-size" name="liveChatSize">' +
    renderOptions(CHAT_SIZE_OPTIONS, uiState.sizePreset) +
    '</select></label>' +
    '</div>' +
    '<p id="live-chat-settings-help" class="muted compact-help live-chat__settings-note">' +
    escapeHtml(getSettingsHelp(uiState.mode)) +
    '</p>' +
    '<div class="button-row"><button class="button button-ghost" id="live-chat-reset-layout" type="button">' +
    (uiState.mode === 'default' ? 'Reset dock' : 'Reset window') +
    '</button></div>' +
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
  var settingsHelp = document.getElementById('live-chat-settings-help')
  var settingsButton = document.getElementById('live-chat-settings-toggle')
  var collapseButton = document.getElementById('live-chat-collapse')
  var sideSelect = document.getElementById('live-chat-side')
  var sideField = document.getElementById('live-chat-side-field')
  var modeSelect = document.getElementById('live-chat-mode')
  var sizeSelect = document.getElementById('live-chat-size')
  var sizeField = document.getElementById('live-chat-size-field')
  var resetLayoutButton = document.getElementById('live-chat-reset-layout')
  var header = root.querySelector('.live-chat__header')
  var uiState = loadChatUiState()
  var settingsOpen = false
  var subscriptionCleanup = null
  var refreshIntervalId = null
  var refreshInFlight = null
  var resizeObserver = null
  var dragState = null
  var isMounted = true

  function getActiveWindowKey() {
    return uiState.mode === 'popout' ? 'popoutRect' : 'freeformRect'
  }

  function syncWindowStateToViewport() {
    if (uiState.mode === 'default') {
      return
    }

    var windowKey = getActiveWindowKey()
    uiState[windowKey] = clampWindowRect(uiState[windowKey], window.innerWidth, window.innerHeight)
  }

  function updateActiveWindowRect(nextRect, shouldSave) {
    if (uiState.mode === 'default') {
      return
    }

    var windowKey = getActiveWindowKey()
    var currentRect = uiState[windowKey]
    var clampedRect = clampWindowRect(
      {
        x: Number.isFinite(nextRect?.x) ? nextRect.x : currentRect.x,
        y: Number.isFinite(nextRect?.y) ? nextRect.y : currentRect.y,
        width: Number.isFinite(nextRect?.width) ? nextRect.width : currentRect.width,
        height: Number.isFinite(nextRect?.height) ? nextRect.height : currentRect.height
      },
      window.innerWidth,
      window.innerHeight
    )

    if (
      currentRect.x === clampedRect.x &&
      currentRect.y === clampedRect.y &&
      currentRect.width === clampedRect.width &&
      currentRect.height === clampedRect.height
    ) {
      return
    }

    uiState[windowKey] = clampedRect

    if (shouldSave) {
      saveChatUiState(uiState)
    }

    applyUiState()
  }

  function applyUiState() {
    syncWindowStateToViewport()
    root.className = getChatRootClass(uiState)
    root.style.cssText = getChatRootStyle(uiState)
    body.hidden = uiState.collapsed
    settingsPanel.hidden = uiState.collapsed || !settingsOpen
    collapseButton.textContent = uiState.collapsed ? 'Open' : 'Collapse'

    if (modeSelect) {
      modeSelect.value = uiState.mode
    }

    if (sideSelect) {
      sideSelect.value = uiState.side
    }

    if (sizeSelect) {
      sizeSelect.value = uiState.sizePreset
    }

    if (sideField) {
      sideField.hidden = uiState.mode !== 'default'
    }

    if (sizeField) {
      sizeField.hidden = uiState.mode !== 'default'
    }

    if (settingsHelp) {
      settingsHelp.textContent = getSettingsHelp(uiState.mode)
    }

    if (resetLayoutButton) {
      resetLayoutButton.textContent = uiState.mode === 'default' ? 'Reset dock' : 'Reset window'
    }
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

  modeSelect?.addEventListener('change', function () {
    uiState.mode =
      modeSelect.value === 'freeform' || modeSelect.value === 'popout' ? modeSelect.value : 'default'

    if (uiState.mode !== 'default') {
      var windowKey = getActiveWindowKey()
      uiState[windowKey] = normalizeWindowRect(uiState[windowKey], uiState.mode)
    }

    saveChatUiState(uiState)
    applyUiState()
  })

  sideSelect?.addEventListener('change', function () {
    uiState.side = sideSelect.value === 'left' ? 'left' : 'right'
    saveChatUiState(uiState)
    applyUiState()
  })

  sizeSelect?.addEventListener('change', function () {
    uiState.sizePreset =
      sizeSelect.value === 'compact' || sizeSelect.value === 'wide' ? sizeSelect.value : 'standard'
    saveChatUiState(uiState)
    applyUiState()
  })

  resetLayoutButton?.addEventListener('click', function () {
    if (uiState.mode === 'default') {
      uiState.side = 'right'
      uiState.sizePreset = 'standard'
    } else {
      uiState[getActiveWindowKey()] = createWindowDefaults(uiState.mode)
    }

    saveChatUiState(uiState)
    applyUiState()
  })

  header?.addEventListener('pointerdown', function (event) {
    if (uiState.mode === 'default' || uiState.collapsed || event.button !== 0) {
      return
    }

    if (event.target.closest('button, a, input, select, textarea, label')) {
      return
    }

    var activeRect = uiState[getActiveWindowKey()]

    dragState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      left: activeRect.x,
      top: activeRect.y
    }

    header.setPointerCapture(event.pointerId)
    event.preventDefault()
  })

  header?.addEventListener('pointermove', function (event) {
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return
    }

    updateActiveWindowRect(
      {
        x: dragState.left + (event.clientX - dragState.startX),
        y: dragState.top + (event.clientY - dragState.startY)
      },
      false
    )
  })

  header?.addEventListener('pointerup', function (event) {
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return
    }

    header.releasePointerCapture(event.pointerId)
    dragState = null
    saveChatUiState(uiState)
  })

  header?.addEventListener('pointercancel', function (event) {
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return
    }

    if (header.hasPointerCapture(event.pointerId)) {
      header.releasePointerCapture(event.pointerId)
    }

    dragState = null
    saveChatUiState(uiState)
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

  function handleWindowResize() {
    applyUiState()
  }

  if (typeof window.ResizeObserver === 'function') {
    resizeObserver = new ResizeObserver(function (entries) {
      if (uiState.mode === 'default' || !entries.length || dragState) {
        return
      }

      updateActiveWindowRect(
        {
          width: Math.round(entries[0].contentRect.width),
          height: Math.round(entries[0].contentRect.height)
        },
        true
      )
    })

    resizeObserver.observe(root)
  }

  window.addEventListener('resize', handleWindowResize)

  applyUiState()
  bootstrapChat()

  refreshIntervalId = window.setInterval(function () {
    refreshMessages()
  }, CHAT_REFRESH_INTERVAL_MS)

  return function cleanup() {
    isMounted = false

    window.removeEventListener('resize', handleWindowResize)

    if (resizeObserver) {
      resizeObserver.disconnect()
    }

    if (refreshIntervalId) {
      window.clearInterval(refreshIntervalId)
    }

    if (subscriptionCleanup) {
      subscriptionCleanup()
    }
  }
}
