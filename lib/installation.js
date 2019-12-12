const {app} = require('./lib/app')
const {git} = app
const {execSync} = require('child_process')
const {pathExists, rimraf} = app.utils
const logger = require('electron-timber')
const mainLogger = logger.create({name: 'Main'})

const {ipcRenderer} = require('electron-better-ipc')

const installEditorDependencies = (reinstall) => {
  app.notify(`${reinstall ? 'Reinstalling' : 'Installing'} editor dependencies`)
  try {
    mainLogger.log('Adding Node')
    execSync(`. ${app.paths.nvs}/nvs.sh && nvs add 12.4.0`)
    mainLogger.log('Using Node and npm installing')
    execSync(`. ${app.paths.nvs}/nvs.sh && nvs use 12.4.0 && cd ${app.paths.editor} && npm install`)
    mainLogger.log('Installed everything')
  } catch (e) {
    mainLogger.log('execSync failed')
    mainLogger.log(e)
  }
}
const cloneEditor = async () => {
  if (pathExists.sync(app.paths.editor)) {
    return
  }
  app.notify('Cloning editor', {phase: 'Setting up editor'})
  await git.clone({
    dir: app.paths.editor,
    url: 'https://github.com/ministryofjustice/fb-editor-node',
    singleBranch: true,
    depth: 1
  })
  mainLogger.log('Cloned editor')
  installEditorDependencies()
  app.notify('Installed editor')
}

const updateEditor = async () => {
  app.notify('Fetching updates', {phase: 'Update Editor'})
  try {
    await git.pull({
      dir: app.paths.editor,
      ref: 'master',
      singleBranch: true
    })
  } catch (e) {
    //
  }
  app.notify('Reinstalling editor dependencies')
  installEditorDependencies(true)
  app.notify('Finished updating editor', {dismiss: true})
}

const installNVS = async () => {
  if (pathExists.sync(app.paths.nvs)) {
    return
  }
  app.notify('Installing nvs (Node version manager)')
  await git.clone({
    dir: app.paths.nvs,
    url: 'https://github.com/jasongin/nvs',
    singleBranch: true,
    depth: 1
  })
  app.notify(`Installed nvs at ${app.paths.nvs}`)
}

const reinstallEditor = async () => {
  app.notify('Reinstalling', {phase: 'Reinstalling editor'})
  app.notify('Deleting NVS')
  rimraf.sync(app.paths.nvs)
  app.notify('Deleting editor')
  rimraf.sync(app.paths.editor)
  mainLogger.log('installing dependencies')
  await installDependencies()
  app.notify('Reinstalled editor', {dismiss: true})
}

const installDependencies = async () => {
  mainLogger.log('Installing NVS')
  await installNVS()
  mainLogger.log('Cloning editor')
  await cloneEditor()
}

ipcRenderer.answerMain('updateEditor', async params => {
  await updateEditor()
})

ipcRenderer.answerMain('reinstallEditor', async params => {
  await reinstallEditor()
})

ipcRenderer.answerMain('installEditor', async params => {
  await installDependencies()
  app.notify('Finished installing editor', {dismiss: true})
})

module.exports = {}
