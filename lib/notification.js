const {ipcRenderer} = require('electron-better-ipc')
const {app} = require('./app')

function removeHeader () {
  document.querySelector('.pane').className += ' pane--short'
  const notificationWindow = app.windows.notificationWindow
  notificationWindow.setSize(400, 134)
}
function updatePhase (phase) {
  document.getElementById('consoleInstallerPhase').innerHTML = phase
}
function updateMessage (message) {
  document.getElementById('consoleInstallerMessage').innerHTML = message
}

function dismissNotification (delay = 2000) {
  const spinnerImg = document.querySelector('.spinner img')
  spinnerImg.src = spinnerImg.src.replace(/-animated.gif$/, '.png')
  const notificationWindow = app.windows.notificationWindow
  if (notificationWindow) {
    setTimeout(() => {
      notificationWindow.hide()
    }, delay)
  }
}

ipcRenderer.answerMain('send-notification', async params => {
  if (typeof params === 'string') {
    params = {
      message: params
    }
  }
  const {message, phase, hide, dismiss} = params

  const spinnerImg = document.querySelector('.spinner img')
  if (!spinnerImg.src.includes('animated.gif')) {
    spinnerImg.src = spinnerImg.src.replace(/\.png$/, '-animated.gif')
  }

  const notificationWindow = app.windows.notificationWindow
  if (hide) {
    notificationWindow.hide()
  } else {
    notificationWindow.show()
  }

  if (app.windows.mainWindow) {
    removeHeader()
  }
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

module.exports = {}
