const {
  app
} = require('electron')
const logger = require('electron-timber')

const path = require('path')
const pathExists = require('path-exists')
const rimraf = require('rimraf')

const glob = require('glob-all')
const request = require('request-promise-native')

const git = require('isomorphic-git')
const http = require('isomorphic-git/http/node')
const fs = require('fs')

const githubLogger = logger.create({ name: 'GitHub' })

const {
  isDirectory
} = require('./common')

const { version } = require('../package')

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

async function cloneGitHubRepository (repositoryUrl) {
  const serviceName = repositoryUrl.replace(/.*\//, '').replace(/\.git$/, '')
  const configPath = path.join(app.paths.services, serviceName)

  if (pathExists.sync(configPath)) {
    throw new Error(`"${serviceName}" already exists`)
  }

  await app.displayNotification(`Adding "${serviceName}" ...`, { phase: 'Add an existing form' })

  const url = !repositoryUrl.includes('/')
    ? `https://github.com/ministryofjustice/${repositoryUrl}.git`
    : `${repositoryUrl}.git`

  githubLogger.log(url)

  try {
    await git.clone({
      http,
      fs,
      dir: configPath,
      url,
      singleBranch: true,
      depth: 1
    })
  } catch (e) {
    await app.dismissNotification()

    const { data: { statusCode } = {} } = e

    if (statusCode === 401) {
      /*
       *  Git creates a service directory with a `.git` even though nothing has been cloned
       *
       *  We remove the lot here otherwise it will show up as a service when the user goes back to the index
       */
      rimraf.sync(configPath)

      throw new Error('Either your credentials are incorrect or the repository does not exist')
    }

    const { message } = e

    throw new Error(message)
  }

  app.setService(serviceName)

  await app.displayNotification(`"${serviceName}" added`, { dismiss: true })
}

function addFile (dir) {
  return async (filePath) => {
    try {
      await git.add({
        http,
        fs,
        dir,
        filepath: filePath.replace(dir.concat('/'), '')
      })
    } catch ({ message }) {
      githubLogger.error(message)
    }
  }
}

async function createServiceForm (servicePath, serviceName, userSettings) {
  await git.clone({
    http,
    fs,
    dir: servicePath,
    url: 'https://github.com/ministryofjustice/fb-service-starter.git',
    singleBranch: true,
    depth: 1
  })

  const gitDir = path.join(servicePath, '.git')

  rimraf.sync(gitDir)

  await git.init({ http, fs, dir: servicePath })

  app.setService(serviceName)

  const files = glob.sync(`${servicePath}/**/*`, { dot: true })
    .filter((file) => !isDirectory(file))
    .filter((file) => !file.includes('.git/'))

  await Promise.all(files.map(addFile(servicePath)))

  const {
    name,
    email
  } = userSettings

  await git.commit({
    http,
    fs,
    dir: servicePath,
    author: {
      name,
      email
    },
    message: `Form "${serviceName}" created`
  })
}

async function initialiseRepository (formName, userSettings) {
  githubLogger.log(`Initialising "${formName}" repository`)

  const serviceName = formName.replace(/\s/g, '-')
  const servicePath = path.join(app.paths.services, serviceName)

  /*
   *  Repository exists locally
   */
  if (pathExists.sync(servicePath)) throw new Error(`"${serviceName}" already exists`)

  await app.displayNotification(`Creating "${serviceName}" ...`, { phase: 'Create a form' })

  await createServiceForm(servicePath, serviceName, userSettings)

  await app.displayNotification(`"${serviceName}" created`, { dismiss: true })

  githubLogger.log(`Repository "${formName}" initialised`)
}

async function initialiseRepositoryWithRemote (formName, userSettings, token) {
  githubLogger.log(`Initialising "${formName}" repository with remote`) // NEVER log `token`

  const serviceName = formName.replace(/\s/g, '-')
  const servicePath = path.join(app.paths.services, serviceName)

  /*
   *  Repository exists locally
   */
  if (pathExists.sync(servicePath)) throw new Error(`"${serviceName}" already exists`)

  await app.displayNotification(`Creating "${serviceName}" repository ...`, { phase: 'Create a form' })

  await createServiceForm(servicePath, serviceName, userSettings)

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
        'User-Agent': `Form Builder ${version}`,
        Authorization: `token ${token}`
      },
      json
    })
  } catch (e) {
    await app.dismissNotification()

    throw new Error(createErrorMessage(e, serviceName))
  }

  const {
    user
  } = userSettings

  try {
    await git.addRemote({
      http,
      fs,
      dir: servicePath,
      remote: 'origin',
      url: `https://github.com/${user}/${serviceName}.git`
    })
  } catch (e) {
    await app.dismissNotification()

    throw new Error(createErrorMessage(e, serviceName))
  }

  try {
    await git.push({
      http, // required
      fs, // required
      dir: servicePath,
      remote: 'origin',
      ref: 'master',
      onAuth () {
        return {
          username: token // Yes, indeed
        }
      }
    })
  } catch (e) {
    await app.dismissNotification()

    throw new Error(createErrorMessage(e, serviceName))
  }

  await app.displayNotification(`Repository "${serviceName}" created`, { dismiss: true })

  githubLogger.log(`Repository "${formName}" initialised with remote`)
}

module.exports = {
  cloneGitHubRepository,
  initialiseRepository,
  initialiseRepositoryWithRemote
}
