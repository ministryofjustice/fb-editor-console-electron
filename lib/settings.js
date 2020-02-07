const { remote: { app } } = require('electron')
const logger = require('electron-timber')
const {
  encrypt
} = require('./crypto')
const { writeFileSync } = require('fs')

const settingsLogger = logger.create({ name: 'Settings' })

settingsLogger.log('Settings is awake')

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

async function onClickSaveGitUser () {
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

async function onClickSaveGitAuth () {
  const token = document.getElementById('token').value
  const password = document.getElementById('password').value

  await app.displayNotification('Saving settings ...', { phase: 'GitHub settings' })

  try {
    writeFileSync(app.paths.token, encrypt(Buffer.from(token), password))

    await app.displayNotification('Settings saved', { phase: 'GitHub settings', dismiss: true })
  } catch ({ message }) {
    settingsLogger.error(message)

    await app.displayNotification('Settings could not be saved', { phase: 'GitHub settings', dismiss: true })
  }
}

const onClickHowTo = () => {
  app.openExternal('https://help.github.com/articles/creating-a-personal-access-token-for-the-command-line/')
}

window
  .addEventListener('DOMContentLoaded', () => {
    const fieldNames = getFieldNames()

    const userSettings = getUserSettings(fieldNames)
    setUserSettings(userSettings, fieldNames)

    fieldNames
      .forEach((fieldName) => {
        const value = userSettings[fieldName]

        document.getElementById(fieldName)
          .value = value || ''
      })
  })

document
  .getElementById('saveGitUser')
  .addEventListener('click', onClickSaveGitUser)

document
  .getElementById('saveGitAuth')
  .addEventListener('click', onClickSaveGitAuth)

document
  .getElementById('tokenHowTo')
  .addEventListener('click', onClickHowTo)
