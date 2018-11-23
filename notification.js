const {app} = require('./app.js')

const ipc = require('electron-better-ipc');


const removeHeader = () => {
  document.querySelector('.pane').className += ' pane--short'
}
const updatePhase = (phase) => {
  document.getElementById('consoleInstallerPhase').innerHTML = phase
}
const updateMessage = (message) => {
  document.getElementById('consoleInstallerMessage').innerHTML = message
}

const dismissNotification = (delay=2000) => {
  const notificationWindow = app.windows.notificationWindow
  if (notificationWindow) {
    setTimeout(() => {
      notificationWindow.hide()
    }, delay)
  }
}

ipc.answerMain('send-notification', async params => {
  if (typeof params === 'string') {
    params = {
      message: params
    }
  }
  const {message, phase, hide, dismiss} = params

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