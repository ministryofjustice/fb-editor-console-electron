const { remote: { app } } = require('electron')
const { ipcRenderer } = require('electron-better-ipc')
const logger = require('electron-timber')

const notificationLogger = logger.create({ name: 'Notification' })

notificationLogger.log('Notification is awake')

function getNotificationWindow () {
  const {
    windows: {
      notificationWindow
    }
  } = app

  return notificationWindow
}

function hasMainWindow () {
  const {
    windows: {
      mainWindow
    }
  } = app

  return !!mainWindow
}

function removeHeader () {
  document.querySelector('.pane').className += ' pane--short'

  const notificationWindow = getNotificationWindow()
  if (notificationWindow) notificationWindow.setSize(400, 134)
}

function updatePhase (phase) {
  document.getElementById('notification-phase').innerText = phase
}

function updateMessage (message) {
  document.getElementById('notification-message').innerText = message
}

async function displayNotification (params = {}) {
  const spinnerImg = document.querySelector('.spinner img')
  if (!spinnerImg.src.includes('animated.gif')) spinnerImg.src = spinnerImg.src.replace(/\.png$/, '-animated.gif')

  const {
    message,
    phase,
    hide,
    dismiss
  } = params

  const notificationWindow = getNotificationWindow()

  if (notificationWindow) {
    if (hide) {
      notificationWindow.hide()
    } else {
      notificationWindow.show()
    }
  }

  if (hasMainWindow()) removeHeader()

  if (phase) {
    updatePhase(phase)
  }

  if (message) {
    updateMessage(message)
  }

  if (dismiss) {
    dismissNotification()
  }
}

function dismissNotification (delay = 2000) {
  const spinnerImg = document.querySelector('.spinner img')
  if (spinnerImg.src.includes('animated.gif')) spinnerImg.src = spinnerImg.src.replace(/-animated.gif$/, '.png')

  const notificationWindow = getNotificationWindow()
  if (notificationWindow) setTimeout(() => { notificationWindow.hide() }, delay)
}

ipcRenderer.answerMain('display-notification', displayNotification)

ipcRenderer.answerMain('dismiss-notification', dismissNotification)
