const { remote: { app } } = require('electron')
const { ipcRenderer } = require('electron-better-ipc')
const logger = require('electron-timber')

const {
  initialiseGitRepository,
  initialiseGitRepositoryWithRemote
} = require('./github')

const createLogger = logger.create({ name: 'Create' })

createLogger.log('Create is awake')

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

function isCreateRepoChecked () {
  const {
    checked = false
  } = document.getElementById('create-repo')

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
    const formName = getFormName()

    /*
     *  A form name has been provided
     */
    hideError()

    if (isCreateRepoChecked()) {
      /*
       *  And the checkbox to create a repository has been checked
       */
      if (await ipcRenderer.invoke('has-token')) {
        const token = await ipcRenderer.invoke('get-token')

        const {
          user,
          name,
          email
        } = app.store.get('git')

        try {
          await initialiseGitRepositoryWithRemote(formName, { user, name, email, token })

          ipcRenderer.send('go-to-index')
        } catch ({ message }) {
          renderErrorMessage(message)
          showError()
        }
      } else {
        ipcRenderer.send('go-to-password')
      }
    } else {
      const {
        name,
        email
      } = app.store.get('git')

      /*
       *  The checkbox to create a repository has not been checked
       */
      try {
        await initialiseGitRepository(formName, { name, email })

        ipcRenderer.send('go-to-index')
      } catch ({ message }) {
        renderErrorMessage(message)
        showError()
      }
    }

    return
  }

  /*
   *  A form name has not been provided
   */
  renderErrorMessage('Enter a form name')
  showError()
}

ipcRenderer.invoke('has-token-file')
  .then((hasTokenFile) => {
    if (hasTokenFile) {
      document.getElementById('token-and-password')
        .classList.add('js-hidden')
    } else {
      document.getElementById('token-and-password')
        .classList.remove('js-hidden')
    }
  })

document.querySelector('.govuk-input-target').addEventListener('keypress', onKeyPress)

document
  .getElementById('create-form')
  .addEventListener('click', onClickCreateForm)
