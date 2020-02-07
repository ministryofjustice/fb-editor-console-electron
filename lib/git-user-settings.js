const { remote: { app } } = require('electron')

const settings = [
  'name',
  'email',
  'user'
]

const reduceUserSettings = (accumulator, [key, value]) => settings.includes(key) ? { ...accumulator, [key]: value } : accumulator

function getGitUserSettings () {
  return Object.entries(app.store.get('git')).reduce(reduceUserSettings, {})
}

function setGitUserSettings (gitSettings) {
  app.store.set('git', Object.entries(gitSettings).reduce(reduceUserSettings, {}))
}

setGitUserSettings(getGitUserSettings())

module.exports = {
  getGitUserSettings,
  setGitUserSettings
}
