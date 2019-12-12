const {execSync} = require('child_process')
const path = require('path')
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

const $input = document.querySelector('.govuk-input-target')
$input.addEventListener('focus', removeError)
$input.addEventListener('keypress', (e) => {
  if (!e.key.match(/[a-z0-9-_]/i)) {
    e.preventDefault()
  }
})

async function createService (serviceName, createRepo) {
  serviceName = serviceName.replace(/\s/g, '-')
  const newServicePath = path.join(app.paths.services, serviceName)

  /*
   *  Repository exists locally
   */
  if (pathExists.sync(newServicePath)) throw new Error(`"${serviceName}" already exists`)

  app.notify(`Creating ${serviceName}`, {phase: 'Create form'})

  const dir = newServicePath

  app.notify('Cloning fb-service-starter repo')

  await git.clone({
    dir,
    url: 'https://github.com/ministryofjustice/fb-service-starter',
    singleBranch: true,
    depth: 1
  })

  const gitDir = path.join(newServicePath, '.git')
  execSync(`rm -rf ${gitDir}`)

  await git.init({dir})

  app.setService(serviceName)

  const files = glob.sync(`${dir}/**/*`, {dot: true})
    .filter(file => !isDirectory(file))
    .filter(file => !file.includes('.git/'))

  app.notify(`About to add ${dir}`)

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
  const {name, email, user, token} = gitSettings

  await git.commit({
    dir,
    author: {
      name,
      email
    },
    message: 'Created form'
  })

  app.notify(`Created ${serviceName}`)

  if (!createRepo) {
    app.dismissNotification()
    return
  }

  app.notify(`Creating ${serviceName} repository`)

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

  app.notify(`Created ${serviceName} repository`, {dismiss: true})
}

const $createForm = document.getElementById('createForm')
const $createRepo = document.getElementById('createrepo')
const $createRepoGroup = document.querySelector('.createrepo-group')
const $gitInstructions = document.getElementById('gitInstructions')
$createForm.addEventListener('click', () => {
  const $formname = document.getElementById('formname')
  const formname = $formname.value
  if (formname) {
    const createRepo = $createRepo.checked
    createService(formname, createRepo)
      .then(() => {
        document.location.href = 'index.html'
      })
      .catch(err => {
        addError(err)
      })
  } else {
    addError('Enter a name for the new form')
  }
})

const gitStore = app.store.get('git') || {}
const gitSettings = ['name', 'email', 'user', 'token']
let gitRequirementsMet = true
gitSettings.forEach(setting => {
  if (!gitStore[setting]) {
    gitRequirementsMet = false
  }
})

function hideElement (element) {
  element.style = 'display:none'
}

if (gitRequirementsMet) {
  hideElement($gitInstructions)
} else {
  hideElement($createRepoGroup)
}
