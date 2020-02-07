const { app } = require('./app.js')
const logger = require('electron-timber')
const {
  encrypt
} = require('./crypto')
const { writeFileSync } = require('fs')

const {
  getGitUserSettings,
  setGitUserSettings
} = require('./git-user-settings')

const settingsLogger = logger.create({ name: 'Settings' })

settingsLogger.log('Settings is awake')

async function onClickSaveGitUser () {
  settingsLogger.log('Saving settings ...')

  await app.notify('Saving settings ...', { phase: 'Github settings' })

  setGitUserSettings(
    Object
      .keys(getGitUserSettings())
      .reduce((gitSettings, setting) => ({ ...gitSettings, [setting]: document.getElementById(setting).value || '' }), {})
  )

  await app.notify('Settings saved', { phase: 'Github settings', dismiss: true })

  settingsLogger.log('Settings saved')
}

async function onClickSaveGitAuth () {
  const token = document.getElementById('token').value
  const password = document.getElementById('password').value

  await app.notify('Saving settings ...', { phase: 'Github settings' })

  try {
    writeFileSync(app.paths.token, encrypt(Buffer.from(token), password))

    await app.notify('Settings saved', { phase: 'Github settings', dismiss: true })
  } catch ({ message }) {
    settingsLogger.error(message)

    await app.notify('Settings could not be saved', { phase: 'Github settings', dismiss: true })
  }
}

const onClickHowTo = () => {
  app.openExternal('https://help.github.com/articles/creating-a-personal-access-token-for-the-command-line/')
}

Object
  .entries(getGitUserSettings())
  .forEach(([setting, value]) => {
    document.getElementById(setting).value = value || ''
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
