const { ipcRenderer } = require('electron-better-ipc')
const logger = require('electron-timber')

const passwordLogger = logger.create({ name: 'Renderer' })

passwordLogger.log('Password is awake')

function showError () {
  document.querySelector('.govuk-error-summary').classList.remove('js-hidden')
  document.querySelector('.access-token-password-group').classList.add('govuk-form-group--error')
}

function hideError () {
  document.querySelector('.govuk-error-summary').classList.add('js-hidden')
  document.querySelector('.access-token-password-group').classList.remove('govuk-form-group--error')
}

async function onClickSubmitPassword (event) {
  event.preventDefault()

  const password = document.getElementById('access-token-password').value

  let token
  if (password) {
    try {
      token = await ipcRenderer.invoke('decrypt-token', password)
    } catch ({ message }) {
      passwordLogger.error(message)
    }
  }

  if (token) {
    hideError()

    try {
      await ipcRenderer.invoke('set-token', token)

      document.getElementById('access-token-password').value = ''

      await ipcRenderer.callMain('go-to-create')

      return
    } catch ({ message }) {
      passwordLogger.error(message)
    }
  }

  showError()
}

document
  .getElementById('password-form')
  .addEventListener('submit', (event) => event.preventDefault())

document
  .getElementById('submit-password')
  .addEventListener('click', onClickSubmitPassword)
