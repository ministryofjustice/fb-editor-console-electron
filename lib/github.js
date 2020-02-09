const { remote: { app } } = require('electron')
const { execSync } = require('child_process')
const path = require('path')
const pathExists = require('path-exists')

const glob = require('glob')
const request = require('request-promise-native')
const logger = require('electron-timber')

const githubLogger = logger.create({ name: 'GitHub' })

const {
  isDirectory
} = require('./common')

const {
  git
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

async function addService (serviceName) {
  const serviceStub = serviceName.replace(/.*\//, '').replace(/\.git$/, '')
  const addServicePath = path.join(app.paths.services, serviceStub)

  if (pathExists.sync(addServicePath)) {
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

async function createService (serviceName, createRepo) {
  serviceName = serviceName.replace(/\s/g, '-')

  if (createRepo) {
    githubLogger.log(serviceName)

    const {
      windows: {
        passwordModal
      }
    } = app

    passwordModal.show()

    return
  }

  const token = 'bloop' // decrypt(readFileSync(app.paths.token), 'Password').toString()

  const servicePath = path.join(app.paths.services, serviceName)

  /*
   *  Repository exists locally
   */
  if (pathExists.sync(servicePath)) throw new Error(`"${serviceName}" already exists`)

  await app.displayNotification(`Creating ${serviceName}`, { phase: 'Create form' })

  const dir = servicePath

  await app.displayNotification('Cloning `fb-service-starter` repo')

  await git.clone({
    dir,
    url: 'https://github.com/ministryofjustice/fb-service-starter',
    singleBranch: true,
    depth: 1
  })

  const gitDir = path.join(servicePath, '.git')

  execSync(`rm -rf ${gitDir}`)

  await git.init({ dir })

  app.setService(serviceName)

  const files = glob.sync(`${dir}/**/*`, { dot: true })
    .filter(file => !isDirectory(file))
    .filter(file => !file.includes('.git/'))

  await app.displayNotification(`Adding "${dir}"`)

  async function addFile (filepath) {
    filepath = filepath.replace(`${dir}/`, '')
    try {
      await git.add({
        dir,
        filepath
      })
    } catch ({ message }) {
      githubLogger.error(message)
    }
  }

  await Promise.all(files.map(addFile))

  const {
    name,
    email,
    user
  } = app.store.get('git')

  await git.commit({
    dir,
    author: {
      name,
      email
    },
    message: 'Created form'
  })

  await app.displayNotification(`Created "${serviceName}"`)

  if (!createRepo) {
    app.dismissNotification()
    return
  }

  await app.displayNotification(`Creating "${serviceName}" repository`)

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

  await app.displayNotification(`Created "${serviceName}" repository`, { dismiss: true })
}

module.exports = {
  addService,
  createService
}
