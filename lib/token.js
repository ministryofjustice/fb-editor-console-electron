const { remote: { app } } = require('electron')
const { ipcRenderer } = require('electron-better-ipc')
const logger = require('electron-timber')

const tokenLogger = logger.create({ name: 'Token' })

tokenLogger.log('Token is awake')

function showPersonalAccessTokenError () {
  document.querySelectorAll('.govuk-error-summary, .personal-access-token-summary')
    .forEach((element) => element.classList.remove('js-hidden'))
  document.querySelector('.personal-access-token-group').classList.add('govuk-form-group--error')
}

function hidePersonalAccessTokenError () {
  document.querySelectorAll('.govuk-error-summary, .personal-access-token-summary')
    .forEach((element) => element.classList.add('js-hidden'))
  document.querySelector('.personal-access-token-group').classList.remove('govuk-form-group--error')
}

function showAccessTokenPasswordError () {
  document.querySelectorAll('.govuk-error-summary, .access-token-password-summary')
    .forEach((element) => element.classList.remove('js-hidden'))
  document.querySelector('.access-token-password-group').classList.add('govuk-form-group--error')
}

function hideAccessTokenPasswordError () {
  document.querySelectorAll('.govuk-error-summary, .access-token-password-summary')
    .forEach((element) => element.classList.add('js-hidden'))
  document.querySelector('.access-token-password-group').classList.remove('govuk-form-group--error')
}

function showTokenFileError () {
  document.querySelectorAll('.govuk-error-summary, .token-file-summary')
    .forEach((element) => element.classList.remove('js-hidden'))
}

function hideTokenFileError () {
  document.querySelectorAll('.govuk-error-summary, .token-file-summary')
    .forEach((element) => element.classList.add('js-hidden'))
}

function hideError () {
  document.querySelectorAll('.govuk-error-summary, .access-token-password-summary, .personal-access-token-summary, .token-file-summary')
    .forEach((element) => element.classList.add('js-hidden'))
  document.querySelectorAll('.personal-access-token-group, .access-token-password-group')
    .forEach((element) => element.classList.remove('govuk-form-group--error'))
}

// https://security.stackexchange.com/questions/215727/oauth-access-token-api-key-patterns-for-large-web-sites
const isPersonalAccessTokenPattern = (value) => /[0-9a-fA-F]{40}/.test(value)

// at least eight characters of the printable ascii range
const isAccessTokenPasswordPattern = (value) => /[ -~]{8,}/.test(value)

async function onClickSaveUserSettings (event) {
  event.preventDefault()

  const token = document.getElementById('personal-access-token').value
  const password = document.getElementById('access-token-password').value

  const isPersonalAccessToken = isPersonalAccessTokenPattern(token)
  const isAccessTokenPassword = isAccessTokenPasswordPattern(password)

  let hasTokenFile = false
  if (isPersonalAccessToken && isAccessTokenPassword) {
    hideError()

    try {
      await ipcRenderer.invoke('encrypt-token', token, password)
      await ipcRenderer.invoke('set-token', token)

      hasTokenFile = true

      tokenLogger.log('Token has been saved')

      document.getElementById('personal-access-token').value = ''
      document.getElementById('access-token-password').value = ''
    } catch (e) {
      tokenLogger.error('Token could not be saved')
    }

    if (hasTokenFile) {
      /*
       *  Only go to settings if there are no errors
       */
      ipcRenderer.send('go-to-settings', 'git-auth')

      return
    }

    /*
     *  Try again, or email us
     */
    showTokenFileError()
  } else {
    /*
     *  Hide
     */
    hideTokenFileError()
    hidePersonalAccessTokenError()
    hideAccessTokenPasswordError()

    /*
     *  Then show
     */
    if (!isPersonalAccessToken) showPersonalAccessTokenError()
    if (!isAccessTokenPassword) showAccessTokenPasswordError()
  }
}

async function onClickTokenHowTo () {
  return app.openExternal('https://help.github.com/articles/creating-a-personal-access-token-for-the-command-line/')
}

document
  .getElementById('token-form')
  .addEventListener('submit', (event) => event.preventDefault())

document
  .getElementById('save-user-settings')
  .addEventListener('click', onClickSaveUserSettings)

document
  .getElementById('token-how-to')
  .addEventListener('click', onClickTokenHowTo)
