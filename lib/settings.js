      const {app} = require('./app.js')

      const gitSettings = app.store.get('git') || {}
      const gitProperties = ['name', 'email', 'user', 'token']

      gitProperties.forEach(setting => {
        const $setting = document.getElementById(setting)
        $setting.value = gitSettings[setting] || ''
      })

      const $saveGit = document.getElementById('saveGit')
      $saveGit.addEventListener('click', () => {
        const git = {}
        gitProperties.forEach(setting => {
          const $setting = document.getElementById(setting)
          git[setting] = $setting.value || ''
        })
        app.store.set('git', git)
        app.notify('Saved settings', {phase: 'Github settings', dismiss: true})
      })

      const $tokenHowTo = document.getElementById('tokenHowTo')
      $tokenHowTo.addEventListener('click', () => {
        app.openExternal('https://help.github.com/articles/creating-a-personal-access-token-for-the-command-line/')
      })
