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

ipc.answerMain('send-notification', async params => {
  const {message, phase, dismiss, disableHeader} = params
  // try {
    if (disableHeader) {
      removeHeader()
    }
    if (phase) {
      updatePhase(phase)
    }
    if (message) {
      updateMessage(message)
    }
  // } catch (e) {
  //   return e
  // }

  return document.querySelector('.pane').innerHTML
});

module.exports = {}