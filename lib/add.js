const { remote: { app } } = require('electron')
const path = require('path')
const { git } = app

function addError (errorMessage) {
  document.querySelector('.govuk-error-summary').classList.remove('js-hidden')
  document.querySelector('.govuk-form-group-target').classList.add('govuk-form-group--error')
  document.querySelector('.govuk-input-target').classList.add('govuk-input--error')
  document.querySelector('#errorMessage').innerHTML = errorMessage
  document.querySelector('.govuk-error-message').innerHTML = errorMessage
}

function removeError () {
  document.querySelector('.govuk-error-summary').classList.add('js-hidden')
  document.querySelector('.govuk-form-group-target').classList.remove('govuk-form-group--error')
  document.querySelector('.govuk-input-target').classList.remove('govuk-input--error')
}

async function addService (serviceName) {
  const serviceStub = serviceName.replace(/.*\//, '').replace(/\.git$/, '')
  const addServicePath = path.join(app.paths.services, serviceStub)

  if (app.utils.pathExists.sync(addServicePath)) {
    throw new Error(`${serviceStub} already exists`)
  }

  await app.displayNotification(`Adding ${serviceStub}`, { phase: 'Add existing form' })

  const dir = addServicePath
  const url = !serviceName.includes('/')
    ? `https://github.com/ministryofjustice/${serviceName}`
    : serviceName

  try {
    await git.clone({
      dir,
      url,
      singleBranch: true,
      depth: 1
    })
  } catch (e) {
    app.dismissNotification()

    const errorMessage = e.data && e.data.statusCode === 401
      ? 'Either your credentials are incorrect or the repository does not exist'
      : JSON.stringify(e)

    throw errorMessage
  }

  app.setService(serviceStub)

  await app.displayNotification(`Added ${serviceStub}`, { dismiss: true })
}

const onFocus = () => removeError()
function onKeyPress (e) {
  if (!e.key.match(/[a-z0-9-_]/i)) {
    e.preventDefault()
  }
}

function onClick () {
  const value = document.getElementById('repoaddress').value
  if (value) {
    addService(value)
      .then(() => {
        document.location.href = 'index.html'
      })
      .catch((e) => {
        addError(e)
      })
  } else {
    addError('Enter the repository URL')
  }
}

document.querySelector('.govuk-input-target').addEventListener('focus', onFocus)
document.querySelector('.govuk-input-target').addEventListener('keypress', onKeyPress)
document.getElementById('addForm').addEventListener('click', onClick)
