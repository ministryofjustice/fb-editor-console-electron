const { remote: { app } } = require('electron')
const { ipcRenderer } = require('electron-better-ipc')
const logger = require('electron-timber')

const settingsLogger = logger.create({ name: 'Settings' })

settingsLogger.log('Settings is awake')

ipcRenderer.answerMain('select-tab', (param) => {
  try {
    const a = document.querySelector(`a[href$='${param}']`)
    if (a) a.click()
  } catch (e) {
    console.error(`Error selecting tab for "${param}"`)
  }
})

function showHasGitAuth () {
  document.getElementById('has-git-auth')
    .classList.remove('js-hidden')
}

function hideHasGitAuth () {
  document.getElementById('has-git-auth')
    .classList.add('js-hidden')
}

function showNotGitAuth () {
  document.getElementById('not-git-auth')
    .classList.remove('js-hidden')
}

function hideNotGitAuth () {
  document.getElementById('not-git-auth')
    .classList.add('js-hidden')
}

const updateEditor = () => ipcRenderer.callMain('update-editor')

const reinstallEditor = () => ipcRenderer.callMain('reinstall-editor')

const getFieldNames = () => (
  Array
    .from(document.querySelectorAll('section#git-user input.govuk-input'))
    .reduce((accumulator, element) => accumulator.concat(element.getAttribute('name')), [])
)

const reduceUserSettings = (fieldNames) => (accumulator, [key, value]) => fieldNames.includes(key) ? { ...accumulator, [key]: value } : accumulator

function getUserSettings (fieldNames) {
  return Object.entries(app.store.get('git')).reduce(reduceUserSettings(fieldNames), {})
}

function setUserSettings (userSettings, fieldNames) {
  app.store.set('git', Object.entries(userSettings).reduce(reduceUserSettings(fieldNames), {}))
}

async function onClickSaveUserSettings () {
  settingsLogger.log('Saving settings ...')

  await app.displayNotification('Saving settings ...', { phase: 'GitHub settings' })

  const fieldNames = getFieldNames()

  setUserSettings(
    Object
      .keys(getUserSettings(fieldNames))
      .reduce((userSettings, setting) => ({ ...userSettings, [setting]: document.getElementById(setting).value || '' }), {}),
    fieldNames
  )

  await app.displayNotification('Settings saved', { phase: 'GitHub settings', dismiss: true })

  settingsLogger.log('Settings saved')
}

async function onClickUpdateEditor (event) {
  event.preventDefault()

  await updateEditor()
}

async function onClickReinstallEditor (event) {
  event.preventDefault()

  await reinstallEditor()
}

ipcRenderer.invoke('has-token-file')
  .then((hasTokenFile) => {
    if (hasTokenFile) {
      showHasGitAuth()
      hideNotGitAuth()
    } else {
      hideHasGitAuth()
      showNotGitAuth()
    }
  })

{
  const fieldNames = getFieldNames()

  const userSettings = getUserSettings(fieldNames)
  setUserSettings(userSettings, fieldNames)

  fieldNames
    .forEach((fieldName) => {
      const value = userSettings[fieldName]

      document.getElementById(fieldName)
        .value = value || ''
    })
}

document
  .getElementById('save-user-settings')
  .addEventListener('click', onClickSaveUserSettings)

document
  .querySelector('.govuk-header__navigation-item--active a.govuk-header__link')
  .addEventListener('click', (event) => event.preventDefault())

document
  .getElementById('update-editor')
  .addEventListener('click', onClickUpdateEditor)

document
  .getElementById('reinstall-editor')
  .addEventListener('click', onClickReinstallEditor)
