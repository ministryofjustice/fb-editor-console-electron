const { remote: { app } } = require('electron')
const { ipcRenderer } = require('electron-better-ipc')
const logger = require('electron-timber')

const createLogger = logger.create({ name: 'Create' })

createLogger.log('Create is awake')

ipcRenderer.answerMain('create', async (formName = '') => {
  document.getElementById('form-name').value = formName
  document.getElementById('create-remote').checked = true

  try {
    await ipcRenderer.callMain('initialise-repository-with-remote', formName)
  } catch ({ message }) {
    renderErrorMessage(message)
    showError()
  }
})

function showError () {
  document.querySelector('.govuk-error-summary').classList.remove('js-hidden')
  document.querySelectorAll('.govuk-form-group-target, .govuk-input-target')
    .forEach((element) => element.classList.add('govuk-form-group--error'))
}

function hideError () {
  document.querySelector('.govuk-error-summary').classList.add('js-hidden')
  document.querySelectorAll('.govuk-form-group-target, .govuk-input-target')
    .forEach((element) => element.classList.remove('govuk-form-group--error'))
}

function renderErrorMessage (message) {
  document.querySelector('#error-message').innerText = message
  document.querySelector('.govuk-error-message').innerText = message
}

function hideTokenAndPassword () {
  document.getElementById('token-and-password')
    .classList.add('js-hidden')
}

function showTokenAndPassword () {
  document.getElementById('token-and-password')
    .classList.remove('js-hidden')
}

function isCreateRemoteChecked () {
  const {
    checked = false
  } = document.getElementById('create-remote')

  return checked
}

function getFormName () {
  return document.getElementById('form-name').value || ''
}

function hasFormName () {
  return /[a-z0-9-_]+/i.test(getFormName())
}

function onKeyPress (e) {
  if (e.key.match(/[a-z0-9-_]/i)) return

  e.preventDefault()
}

async function onClickCreateForm (event) {
  event.preventDefault()

  if (hasFormName()) {
    /*
     *  A form name has been provided
     */

    const formName = getFormName()

    hideError()

    try {
      if (isCreateRemoteChecked()) {
        await ipcRenderer.callMain('initialise-repository-with-remote', formName)
      } else {
        await ipcRenderer.callMain('initialise-repository', formName)
      }
    } catch ({ message }) {
      await app.dismissNotification()

      renderErrorMessage(message)
      showError()
    }
  } else {
    await app.dismissNotification()

    /*
     *  A form name has not been provided
     */
    renderErrorMessage('Enter a form name')
    showError()
  }
}

ipcRenderer.invoke('has-token-file')
  .then((hasTokenFile) => {
    if (hasTokenFile) {
      hideTokenAndPassword()
    } else {
      showTokenAndPassword()
    }
  })
  .catch(showTokenAndPassword)

document.querySelector('.govuk-input-target').addEventListener('keypress', onKeyPress)

document
  .getElementById('create-form')
  .addEventListener('click', onClickCreateForm)
