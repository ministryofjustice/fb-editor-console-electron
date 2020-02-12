const { ipcRenderer } = require('electron-better-ipc')

const logger = require('electron-timber')

const addLogger = logger.create({ name: 'Add' })

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

function getRepositoryUrl () {
  return document.getElementById('repository-url').value || ''
}

function hasRepositoryUrl () {
  return /[ -~]+/i.test(getRepositoryUrl())
}

function onKeyPress (e) {
  if (e.key.match(/[ -~]/i)) return

  e.preventDefault()
}

async function onClickAddForm () {
  if (hasRepositoryUrl()) {
    hideError()

    const repositoryUrl = getRepositoryUrl()

    addLogger.log(`Adding repository "${repositoryUrl}" ...`)
    try {
      await ipcRenderer.callMain('clone-github-repository', repositoryUrl)

      addLogger.log(`Repository "${repositoryUrl}" added`)
    } catch ({ message }) {
      addLogger.log(`Adding repository "${repositoryUrl}" failed`)

      renderErrorMessage(message)
      showError()
    }
  } else {
    renderErrorMessage('Enter the repository URL')
    showError()
  }
}

document.querySelector('.govuk-input-target').addEventListener('keypress', onKeyPress)

document
  .getElementById('add-form')
  .addEventListener('click', onClickAddForm)
