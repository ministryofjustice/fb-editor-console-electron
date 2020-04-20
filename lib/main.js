const {
  app,
  BrowserWindow,
  Menu
} = require('electron')
const { ipcMain } = require('electron-better-ipc')
const logger = require('electron-timber')

const { execSync } = require('child_process')

const condense = require('selective-whitespace')

const request = require('request-promise-native')

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
  if (!Reflect.has(windows, service)) {
    const runServiceWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: true
      }
    })

    runServiceWindow.loadFile('run-service.html')
    Reflect.set(windows, service, runServiceWindow)
  }
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

function listServicesInMainWindow (serviceDetails) {
  const mainWindow = getMainWindow()
  if (mainWindow) {
    const {
      webContents
    } = mainWindow

    const {
      name,
      port
    } = serviceDetails

    webContents.executeJavaScript(`try { listServices('${name}') } catch (e) { console.log('\`listServices\` for service "${name}" on port "${port}" failed') }`)
  }
}

function confirmServiceIsRunning (serviceDetails, i = 0) {
  setTimeout(async () => {
    try {
      await request.get(`http://localhost:${serviceDetails.port}`)

      serviceDetails.status = 'running'

      listServicesInMainWindow(serviceDetails)
    } catch (e) {
      /*
       *  Let's not do this indefinitely
       */
      if (i++ < 1000) confirmServiceIsRunning(serviceDetails, i)
    }
  }, 250)
}

function getPidsForPort (port) {
  /*
   *  For Darwin. Windows is simpler!
   */
  try {
    if (isNaN(Number(port))) throw new Error(`Port "${port}" is not a number`)

    const lsof = execSync(`lsof -i TCP:${port}`).toString().trim().split('\n')
    const row = lsof.shift()

    const cols = condense(row).split(' ')
    const COMMAND = cols.findIndex((item) => item === 'COMMAND')
    const PID = cols.findIndex((item) => item === 'PID')
    const NODE = cols.findIndex((item) => item === 'NODE')
    const NAME = cols.findIndex((item) => item === 'NAME')
    const PORT = new RegExp(`:${port}`)

    return new Set(lsof
      .reduce((accumulator, row) => {
        const cols = condense(row).split(' ')
        const command = cols[COMMAND].toLowerCase()
        const pid = cols[PID]
        const node = cols[NODE].toLowerCase()
        const name = cols[NAME].toLowerCase()

        return (command.includes('node') && node.includes('tcp') && PORT.test(name))
          ? accumulator.concat(pid)
          : accumulator
      }, []))
  } catch (e) {
    return new Set()
  }
}

function hasPort (service) {
  const ports = app.store.get('ports') || {}
  return Reflect.has(ports, service)
}

function getPort (service) {
  const ports = app.store.get('ports') || {}
  return Reflect.get(ports, service)
}

function setPort (service, port) {
  const ports = app.store.get('ports') || {}
  app.store.set('ports', { ...ports, [service]: port })
}

function clearPortFor (service) {
  const ports = app.store.get('ports') || {}
  delete ports[service]
  app.store.set('ports', { ...ports })
}

async function install () {
  await displayNotification('Starting Editor installation ...', { phase: 'Install Editor' })

  await installEditor()

  await displayNotification('Installing dependencies ...', { phase: 'Install Editor' })

  installEditorDependencies()

  await displayNotification('Editor installation finished', { dismiss: true })
}

async function displayNotification (message, options = {}) {
  const notificationWindow = getNotificationWindow()
  if (notificationWindow) {
    await ipcMain.callRenderer(notificationWindow, 'display-notification', { message, ...options })
    notificationWindow.show()
  }
}

async function dismissNotification () {
  const notificationWindow = getNotificationWindow()
  if (notificationWindow) {
    setTimeout(() => { notificationWindow.hide() }, 2000)
    await ipcMain.callRenderer(notificationWindow, 'dismiss-notification')
  }
}

async function executeInstallation (installation) {
  try {
    const installationWindow = getInstallationWindow()
    if (installationWindow) await ipcMain.callRenderer(installationWindow, installation)
  } catch ({ message }) {
    logger.log(`Process "${installation}" failed (${message})`)
  }
}

const updateEditor = () => executeInstallation('update-editor')

const installEditor = () => executeInstallation('install-editor')

const installEditorDependencies = () => executeInstallation('install-editor-dependencies')

module.exports = {
  getNotificationWindow,
  getInstallationWindow,
  getMainWindow,
  createNotificationWindow,
  createInstallationWindow,
  createRunServiceWindow,
  createMainWindow,
  listServicesInMainWindow,
  confirmServiceIsRunning,
  getPidsForPort,
  hasPort,
  getPort,
  setPort,
  clearPortFor,
  install,
  displayNotification,
  dismissNotification,
  executeInstallation,
  updateEditor,
  installEditor,
  installEditorDependencies
}
