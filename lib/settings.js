const {app} = require('./app.js')
const logger = require('electron-timber')

const settingsLogger = logger.create({name: 'Settings'})

settingsLogger.log('Settings is awake')

const gitSettings = app.store.get('git') || {}
const gitProperties = [
  'name',
  'email',
  'user',
  'token'
]

async function onClickSaveGit () {
  settingsLogger.log('Saving settings ...')

  const git = gitProperties
    .reduce((git, setting) => {
      git[setting] = document.getElementById(setting).value || ''
      return git
    }, {})
  app.store.set('git', git)

  await app.notify('Settings saved', {phase: 'Github settings', dismiss: true})

  settingsLogger.log('Settings saved')
}

const onClickHowTo = () => {
  app.openExternal('https://help.github.com/articles/creating-a-personal-access-token-for-the-command-line/')
}

gitProperties
  .forEach((setting) => {
    document.getElementById(setting).value = gitSettings[setting] || ''
  })

document
  .getElementById('saveGit')
  .addEventListener('click', onClickSaveGit)

document
  .getElementById('tokenHowTo')
  .addEventListener('click', onClickHowTo)
