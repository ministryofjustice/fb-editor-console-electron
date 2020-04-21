const { remote: { app } } = require('electron')
const { ipcRenderer } = require('electron-better-ipc')
const logger = require('electron-timber')

const { execSync } = require('child_process')
const rimraf = require('rimraf')
const pathExists = require('path-exists')

const simpleGit = require('simple-git')
const git = simpleGit()

const installationLogger = logger.create({ name: 'Installation' })

installationLogger.log('Installation is awake')

async function installEditor () {
  if (!pathExists.sync(app.paths.editor)) {
    installationLogger.log(`Installing editor to ${app.paths.editor}`)
    try {
      await git.clone(
        'https://github.com/ministryofjustice/fb-editor-node',
        app.paths.editor,
        ['--depth', '1']
      )
    } catch ({ message }) {
      installationLogger.error(message)
    }
  }
}

async function installNVS () {
  if (!pathExists.sync(app.paths.nvs)) {
    installationLogger.log(`Installing nvs to ${app.paths.nvs}`)
    try {
      await git.clone(
        'https://github.com/jasongin/nvs',
        app.paths.nvs,
        ['--depth', '1']
      )
    } catch ({ message }) {
      installationLogger.error(message)
    }
  }
}

async function removeDependencies () {
  await app.displayNotification('Removing NVS ...')
  installationLogger.log(`Removing nvs from ${app.paths.nvs}`)
  rimraf.sync(app.paths.nvs)
  await app.displayNotification('... Done')

  await app.displayNotification('Removing Editor ...')
  installationLogger.log(`Removing editor from ${app.paths.editor}`)
  rimraf.sync(app.paths.editor)
  await app.displayNotification('... Done')
}

async function installDependencies () {
  installationLogger.log('Installing NVS ...')
  await installNVS()
  installationLogger.log('... Done')

  installationLogger.log('Installing Editor ...')
  await installEditor()
  installationLogger.log('... Done')
}

function installEditorDependencies () {
  installationLogger.log('Installing Editor dependencies ...')

  try {
    execSync(`
      . "${app.paths.nvs}/nvs.sh" && nvs add 12.4.0
      . "${app.paths.nvs}/nvs.sh" && nvs use 12.4.0 && \\
      cd "${app.paths.editor}" && npm install
    `)
  } catch ({ message }) {
    installationLogger.error(message)
  }

  installationLogger.log('... Done')
}

ipcRenderer.answerMain('update-editor', async () => {
  await app.displayNotification('Starting Editor update ...', { phase: 'Update Editor' })

  await removeDependencies()

  await app.displayNotification('Installing dependencies ...', { phase: 'Update Editor' })
  await installDependencies()

  await app.displayNotification('Installing editor dependencies ...', { phase: 'Update Editor' })
  installEditorDependencies()

  await app.displayNotification('Editor update finished. Restarting', { dismiss: true })

  app.relaunch(5)
  app.exit()
})

ipcRenderer.answerMain('install-editor', async () => {
  await app.displayNotification('Starting Editor installation ...', { phase: 'Install Editor' })

  await installDependencies()

  await app.displayNotification('Installing dependencies ...', { phase: 'Install Editor' })

  installEditorDependencies()

  await app.displayNotification('Editor installation finished', { dismiss: true })
})

ipcRenderer.answerMain('install-editor-dependencies', installEditorDependencies)
