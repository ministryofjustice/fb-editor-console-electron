const {app} = require('./app.js')

const gitSettings = app.store.get('git') || {}
const gitProperties = [
  'name',
  'email',
  'user',
  'token'
]

gitProperties
  .forEach((setting) => {
    document.getElementById(setting).value = gitSettings[setting] || ''
  })

document
  .getElementById('saveGit')
  .addEventListener('click', () => {
    const git = gitProperties
      .reduce((git, setting) => {
        git[setting] = document.getElementById(setting).value || ''
        return git
      }, {})
    app.store.set('git', git)

    app.notify('Saved settings', {phase: 'Github settings', dismiss: true})
  })

document
  .getElementById('tokenHowTo')
  .addEventListener('click', () => {
    app.openExternal('https://help.github.com/articles/creating-a-personal-access-token-for-the-command-line/')
  })
