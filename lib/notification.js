const {ipcRenderer} = require('electron-better-ipc')
// const logger = require('electron-timber')
const {app} = require('./app')

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

  if (notificationWindow) {
    notificationWindow.setSize(400, 134)
  }
}

function updatePhase (phase) {
  document.getElementById('consoleInstallerPhase').innerHTML = phase
}

function updateMessage (message) {
  document.getElementById('consoleInstallerMessage').innerHTML = message
}

function dismissNotification (delay = 2000) {
  const spinnerImg = document.querySelector('.spinner img')
  if (spinnerImg.src.includes('animated.gif')) spinnerImg.src = spinnerImg.src.replace(/-animated.gif$/, '.png')

  const notificationWindow = getNotificationWindow()
  if (notificationWindow) {
    setTimeout(() => {
      notificationWindow.hide()
    }, delay)
  }
}

ipcRenderer.answerMain('send-notification', async (params = {}) => {
  const spinnerImg = document.querySelector('.spinner img')
  if (!spinnerImg.src.includes('animated.gif')) spinnerImg.src = spinnerImg.src.replace(/\.png$/, '-animated.gif')

  if (typeof params === 'string') {
    params = {
      message: params
    }
  }

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
})
