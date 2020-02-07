const {
  app,
  BrowserWindow,
  Menu
} = require('electron')

const request = require('request-promise-native')

const logger = require('electron-timber')

const {
  ipcMain
} = require('electron-better-ipc')

const {
  isOpenTools,
  isProbablyFirstUse
} = require('./common')

const TEMPLATE = require('./template')

function getNotificationWindow () {
  const {
    windows: {
      notificationWindow
    }
  } = app

  return notificationWindow
}

function getInstallationWindow () {
  const {
    windows: {
      installationWindow
    }
  } = app

  return installationWindow
}

function getMainWindow () {
  const {
    windows: {
      mainWindow
    }
  } = app

  return mainWindow
}

function createNotificationWindow () {
  const notificationWindow = new BrowserWindow({
    transparent: true,
    frame: false,
    toolbar: false,
    width: 400,
    height: isProbablyFirstUse(app) ? 200 : 134,
    webPreferences: {
      nodeIntegration: true
    }
  })
  notificationWindow.on('blur', () => notificationWindow.focus())
  notificationWindow.loadFile('notification.html')
  notificationWindow.hide()

  if (isOpenTools()) notificationWindow.webContents.openDevTools()

  app.windows.notificationWindow = notificationWindow
}

function createInstallationWindow () {
  const installationWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: true
    }
  })

  installationWindow.loadFile('installation.html')

  app.windows.installationWindow = installationWindow
}

function createRunServiceWindow (service, windows, { port }) {
  const runServiceWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: true
    }
  })

  runServiceWindow.loadFile('run-service.html')
  runServiceWindow.on('closed', async () => {
    delete windows[service]
    await app.clearPort(port)
  })

  windows[service] = runServiceWindow
}

function createMainWindow () {
  const mainWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: true
    }
  })

  mainWindow.maximize()
  mainWindow.loadFile('index.html')
  mainWindow.show()

  if (isOpenTools()) mainWindow.webContents.openDevTools()

  const menu = Menu.buildFromTemplate(TEMPLATE)
  Menu.setApplicationMenu(menu)

  mainWindow.on('closed', () => { delete app.windows.mainWindow })

  /*
   *  Expose a reference
   */
  app.windows.mainWindow = mainWindow
}

function confirmServiceIsRunning (serviceDetails, i = 0) {
  setTimeout(async () => {
    try {
      await request.get(`http://localhost:${serviceDetails.port}`)

      serviceDetails.status = 'running'
      const {
        name,
        port
      } = serviceDetails

      logger.log(`"${name}" started on port ${port}`)

      const mainWindow = getMainWindow()
      if (mainWindow) mainWindow.webContents.executeJavaScript(`listServices('${name}')`)
    } catch (e) {
      /*
       *  Let's not do this indefinitely
       */
      if (i++ < 1000) confirmServiceIsRunning(serviceDetails, i)
    }
  }, 250)
}

function getPort (service) {
  const ports = app.store.get('ports') || {}
  return ports[service]
}

function setPort (service, port) {
  const ports = app.store.get('ports') || {}
  app.store.set('ports', { ...ports, [service]: port })
}

function clearPort (service) {
  const ports = app.store.get('ports') || {}
  delete ports[service]
  app.store.set('ports', ports)
}

async function runInstallation (installation) {
  try {
    const installationWindow = getInstallationWindow()
    if (installationWindow) await ipcMain.callRenderer(installationWindow, installation)
  } catch ({ message }) {
    logger.log(`Process "${installation}" failed (${message})`)
  }
}

async function install () {
  await displayNotification('Starting Editor installation ...', { phase: 'Install Editor' })

  await installEditor()

  await displayNotification('Installing dependencies ...', { phase: 'Install Editor' })

  installEditorDependencies()

  await displayNotification('Editor installation finished', { dismiss: true })
}

async function displayNotification (message, options = {}) {
  const params = typeof message === 'object' ? message : Object.assign(options, { message })

  const notificationWindow = getNotificationWindow()
  if (notificationWindow) {
    notificationWindow.show()
    await ipcMain.callRenderer(notificationWindow, 'send-notification', params)
  }
}

async function dismissNotification () {
  await displayNotification({ dismiss: true })

  const notificationWindow = getNotificationWindow()
  if (notificationWindow) notificationWindow.hide()
}

const updateEditor = async () => runInstallation('updateEditor')

const reinstallEditor = async () => runInstallation('reinstallEditor')

const installEditor = async () => runInstallation('installEditor')

const installEditorDependencies = () => runInstallation('installEditorDependencies')

module.exports = {
  getNotificationWindow,
  getInstallationWindow,
  getMainWindow,
  createNotificationWindow,
  createInstallationWindow,
  createRunServiceWindow,
  createMainWindow,
  confirmServiceIsRunning,
  getPort,
  setPort,
  clearPort,
  runInstallation,
  install,
  displayNotification,
  dismissNotification,
  updateEditor,
  reinstallEditor,
  installEditor,
  installEditorDependencies
}
