const {execSync} = require('child_process')
const path = require('path')
// const logger = require('electron-timber')
const {app} = require('./app')
const {
  git,
  utils: {
    pathExists,
    isDirectory,
    glob,
    request
  }
} = app

const gitStore = app.store.get('git') || {}

const gitSettings = [
  'name',
  'email',
  'user',
  'token'
]

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

async function createService (serviceName, createRepo) {
  serviceName = serviceName.replace(/\s/g, '-')

  const servicePath = path.join(app.paths.services, serviceName)

  /*
   *  Repository exists locally
   */
  if (pathExists.sync(servicePath)) throw new Error(`"${serviceName}" already exists`)

  await app.notify(`Creating ${serviceName}`, {phase: 'Create form'})

  const dir = servicePath

  await app.notify('Cloning `fb-service-starter` repo')

  await git.clone({
    dir,
    url: 'https://github.com/ministryofjustice/fb-service-starter',
    singleBranch: true,
    depth: 1
  })

  const gitDir = path.join(servicePath, '.git')

  execSync(`rm -rf ${gitDir}`)

  await git.init({dir})

  app.setService(serviceName)

  const files = glob.sync(`${dir}/**/*`, {dot: true})
    .filter(file => !isDirectory(file))
    .filter(file => !file.includes('.git/'))

  await app.notify(`Adding "${dir}"`)

  async function addFile (filepath) {
    filepath = filepath.replace(`${dir}/`, '')
    try {
      await git.add({
        dir,
        filepath
      })
    } catch (e) {
      // ignore attempts to add ignored files
    }
  }

  await Promise.all(files.map(addFile))

  const gitSettings = app.store.get('git')
  const {
    name,
    email,
    user,
    token
  } = gitSettings

  await git.commit({
    dir,
    author: {
      name,
      email
    },
    message: 'Created form'
  })

  await app.notify(`Created "${serviceName}"`)

  if (!createRepo) {
    app.dismissNotification()
    return
  }

  await app.notify(`Creating "${serviceName}" repository`)

  const url = 'https://api.github.com/user/repos'
  const json = {
    name: serviceName,
    auto_init: false,
    private: false
  }

  try {
    await request.post({
      url,
      headers: {
        'User-Agent': 'Form Builder v0.1.0',
        Authorization: `token ${token}`
      },
      json
    })
  } catch (e) {
    app.dismissNotification()

    throw new Error(createErrorMessage(e, serviceName))
  }

  try {
    await git.addRemote({
      dir,
      remote: 'origin',
      url: `https://github.com/${user}/${serviceName}.git`
    })
  } catch (e) {
    app.dismissNotification()

    throw new Error(createErrorMessage(e, serviceName))
  }

  try {
    await git.push({
      dir,
      remote: 'origin',
      ref: 'master',
      token
    })
  } catch (e) {
    app.dismissNotification()

    throw new Error(createErrorMessage(e, serviceName))
  }

  await app.notify(`Created "${serviceName}" repository`, {dismiss: true})
}

function getErrorMessage (statusCode, statusMessage) {
  return statusCode
    ? `"Settings" configuration error (${statusCode} ${statusMessage})`
    : `"Settings" configuration error (${statusMessage})`
}

function getErrorMessageForStatusCodeError ({
  response: {
    statusCode,
    statusMessage = 'No error message defined'
  } = {}
}, serviceName) {
  return statusCode === 422
  /*
   *  Repository exists remotely
   */
    ? `"${serviceName}" already exists (${statusCode} ${statusMessage})`
    : getErrorMessage(statusCode, statusMessage)
}

function getErrorForHTTPError ({
  data: {
    statusCode,
    statusMessage = 'No error message defined'
  } = {}
}) {
  return getErrorMessage(statusCode, statusMessage)
}

function getErrorMessageForNameExistsError ({
  errors: [
    {
      message = 'No error message defined'
    } = {}
  ] = []
}, serviceName) {
  return message === 'name already exists on this account'
    ? `"${serviceName}" already exists`
    : message
}

function createErrorMessage (e, serviceName) {
  let errorMessage

  const {
    name = 'Unknown Error name'
  } = e

  if (name === 'StatusCodeError') {
    errorMessage = getErrorMessageForStatusCodeError(e, serviceName)
  } else {
    const {
      code = 'Unknown Error code'
    } = e

    if (code === 'HTTPError') {
      errorMessage = getErrorForHTTPError(e, serviceName)
    } else {
      const {
        error
      } = e

      if (error) {
        errorMessage = getErrorMessageForNameExistsError(error, serviceName)
      } else {
        const {
          message = 'No error message defined'
        } = e

        errorMessage = `${code} ${message}`
      }
    }
  }

  return errorMessage
}

const onFocus = () => removeError()
function onKeyPress (e) {
  if (!e.key.match(/[a-z0-9-_]/i)) {
    e.preventDefault()
  }
}

function onClick () {
  const value = document.getElementById('formname').value
  if (value) {
    const {
      checked: createRepo
    } = document.getElementById('createrepo')

    return createService(value, createRepo)
      .then(() => {
        document.location.href = 'index.html'
      })
      .catch(err => {
        addError(err)
      })
  } else {
    addError('Enter a name for the new form')
  }
}

document.querySelector('.govuk-input-target').addEventListener('focus', onFocus)
document.querySelector('.govuk-input-target').addEventListener('keypress', onKeyPress)
document.getElementById('createForm').addEventListener('click', onClick)

function hideElement (element) {
  element.style = 'display:none'
}

if (gitSettings.every((setting) => gitStore[setting])) {
  hideElement(document.getElementById('gitInstructions'))
} else {
  hideElement(document.querySelector('.createrepo-group'))
}
