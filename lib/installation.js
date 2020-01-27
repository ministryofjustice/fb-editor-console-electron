const { execSync } = require('child_process')
const { ipcRenderer } = require('electron-better-ipc')

const logger = require('electron-timber')

const { app } = require('./app')
const {
  git,
  utils: {
    pathExists,
    rimraf
  }
} = app

const installationLogger = logger.create({ name: 'Installation' })

installationLogger.log('Installation is awake')

async function installEditor () {
  if (!pathExists.sync(app.paths.editor)) {
    try {
      await git.clone({
        dir: app.paths.editor,
        url: 'https://github.com/ministryofjustice/fb-editor-node',
        singleBranch: true,
        depth: 1
      })
    } catch ({ message }) {
      installationLogger.error(message)
    }
  }
}

async function updateEditor () {
  if (pathExists.sync(app.paths.editor)) {
    try {
      await git.pull({
        dir: app.paths.editor,
        ref: 'master',
        singleBranch: true
      })
    } catch ({ message }) {
      installationLogger.error(message)
    }
  }
}

async function installNVS () {
  if (!pathExists.sync(app.paths.nvs)) {
    try {
      await git.clone({
        dir: app.paths.nvs,
        url: 'https://github.com/jasongin/nvs',
        singleBranch: true,
        depth: 1
      })
    } catch ({ message }) {
      installationLogger.error(message)
    }
  }
}

async function reinstallEditor () {
  await removeDependencies()

  await installDependencies()
}

async function removeDependencies () {
  await app.notify('Removing NVS ...')
  rimraf.sync(app.paths.nvs)
  await app.notify('... Done')

  await app.notify('Removing Editor ...')
  rimraf.sync(app.paths.editor)
  await app.notify('... Done')
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

ipcRenderer.answerMain('updateEditor', async () => {
  await app.notify('Starting Editor update ...', { phase: 'Update Editor' })

  await updateEditor()

  await app.notify('Installing dependencies ...', { phase: 'Update Editor' })

  installEditorDependencies()

  await app.notify('Editor update finished', { dismiss: true })
})

ipcRenderer.answerMain('reinstallEditor', async () => {
  await app.notify('Starting Editor re-installation ...', { phase: 'Re-install Editor' })

  await reinstallEditor()

  await app.notify('Installing dependencies ...', { phase: 'Re-install Editor' })

  installEditorDependencies()

  await app.notify('Editor re-installation finished', { dismiss: true })
})

ipcRenderer.answerMain('installEditor', async () => {
  await app.notify('Starting Editor installation ...', { phase: 'Install Editor' })

  await installDependencies()

  await app.notify('Installing dependencies ...', { phase: 'Install Editor' })

  installEditorDependencies()

  await app.notify('Editor installation finished', { dismiss: true })
})
