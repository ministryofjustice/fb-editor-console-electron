      const {app} = require('./app')
      const {git} = app
      const path = require('path')
      const ipc = require('electron-better-ipc')

      const addError = (errorMessage) => {
        document.querySelector('.govuk-error-summary').classList.remove('js-hidden')
        document.querySelector('.govuk-form-group-target').classList.add('govuk-form-group--error')
        document.querySelector('.govuk-input-target').classList.add('govuk-input--error')
        document.querySelector('#errorMessage').innerHTML = errorMessage
        document.querySelector('.govuk-error-message').innerHTML = errorMessage
      }
      const removeError = () => {
        document.querySelector('.govuk-error-summary').classList.add('js-hidden')
        document.querySelector('.govuk-form-group-target').classList.remove('govuk-form-group--error')
        document.querySelector('.govuk-input-target').classList.remove('govuk-input--error')
      }

      const $input = document.querySelector('.govuk-input-target')
      $input.addEventListener('focus', removeError)
      $input.addEventListener('keypress', (e) => {
        if (!e.key.match(/[a-z0-9-_]/i)) {
          e.preventDefault()
        }
      })

      const addService = async (serviceName) => {
        const serviceStub = serviceName.replace(/.*\//, '').replace(/\.git$/, '')
        const addServicePath = path.join(app.paths.services, serviceStub)
        if (app.utils.pathExists.sync(addServicePath)) {
          throw `${serviceStub} already exists`
        }
        app.notify(`Adding ${serviceStub}`, {phase: 'Add existing form'})
        const dir = addServicePath
        let url = serviceName
        if (!serviceName.includes('/')) {
          url = `https://github.com/ministryofjustice/${serviceName}`
        }
        try {
          await git.clone({
            dir,
            url,
            singleBranch: true,
            depth: 1
          })
        } catch (e) {
          app.dismissNotification()
          let errorMessage
          if (e.data && e.data.statusCode === 401) {
            errorMessage = 'Either your credentials are incorrect or the repository does not exist'
          } else {
            errorMessage = JSON.stringify(e)
          }
          throw errorMessage
        }
        app.setService(serviceStub)
        app.notify(`Added ${serviceStub}`, {dismiss: true})
      }

      const $addForm = document.getElementById('addForm')
      $addForm.addEventListener('click', () => {
        const $repoaddress = document.getElementById('repoaddress')
        const repoaddress = $repoaddress.value
        if (repoaddress) {

          addService(repoaddress).then(() => {
            document.location.href = 'index.html'
          }).catch(e => {
            addError(e)
          })
        } else {
          addError('Enter the repository URL')
        }
      })
