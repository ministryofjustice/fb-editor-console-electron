const {execSync} = require('child_process')
const path = require('path')
const pathExists = require('path-exists')
const rimraf = require('rimraf')
const ospath = require('ospath')
const findProcess = require('find-process')
const glob = require('glob')
const opn = require('opn')
const request = require('request-promise-native')
const fs = require('fs')
const git = require('isomorphic-git')

git.plugins.set('fs', fs)

const logger = require('electron-timber')
const {ipcMain} = require('electron-better-ipc')

const Store = require('electron-store')
const store = new Store()

const {lstatSync, readdirSync} = fs
const isDirectory = source => lstatSync(source).isDirectory()

const mainLogger = logger.create({name: 'Main'})

mainLogger.log('Waking up ...')

const {
  app,
  BrowserWindow,
  Menu
} = require('electron')

app.git = git
app.utils = {
  pathExists,
  isDirectory,
  glob,
  request,
  rimraf
}
app.windows = {}

let mainWindow

const createNotificationWindow = async () => {
  const notificationWindow = new BrowserWindow({
    transparent: true,
    frame: false,
    toolbar: false,
    width: 400,
    height: isProbablyFirstUse() ? 200 : 134
  })
  notificationWindow.on('blur', () => {
    notificationWindow.focus()
  })
  notificationWindow.loadFile('notification.html')
  notificationWindow.hide()
  app.windows.notificationWindow = notificationWindow
}

const displayNotification = async (message, options = {}) => {
  const params = typeof message === 'object' ? message : Object.assign(options, {message})
  const notificationWindow = app.windows.notificationWindow
  await ipcMain.callRenderer(notificationWindow, 'send-notification', params)
  mainLogger.log('displayNotification', {message})
}

app.notify = displayNotification
app.dismissNotification = () => {
  app.notify({dismiss: true})
}

const getDirectories = source => readdirSync(source).map(name => path.join(source, name)).filter(isDirectory).map(dir => path.basename(dir))

const services = {}

ipcMain.answerRenderer('setService', async () => {
  mainLogger.log('Called set service')
})

ipcMain.answerRenderer('setServiceProperty', async ({service, property, value}) => {
  services[service] = services[service] || {}
  services[service][property] = value
})

ipcMain.answerRenderer('getServices', async () => services)

const runInstallation = async (name) => {
  try {
    await ipcMain.callRenderer(app.windows.installation, name)
  } catch (e) {
    mainLogger.log(`Installation: ${name} failed`)
  }
}

app.updateEditor = async () => runInstallation('updateEditor')

app.reinstallEditor = async () => runInstallation('reinstallEditor')

app.installEditor = async () => runInstallation('installEditor')

app.store = store
app.services = services

app.setService = (name, params = {}) => {
  services[name] = params
}

app.updateService = (name, params = {}) => {
  services[name] = Object.assign(services[name], params)
}

const TEMPLATE = [
  {
    label: 'Application',
    submenu: [
      {label: 'About Application', selector: 'orderFrontStandardAboutPanel:'},
      {type: 'separator'},
      {label: 'Quit', accelerator: 'Command+Q', click: () => { app.quit() }}
    ]
  },
  {
    label: 'Edit',
    submenu: [
      {label: 'Undo', accelerator: 'CmdOrCtrl+Z', selector: 'undo:'},
      {label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', selector: 'redo:'},
      {type: 'separator'},
      {label: 'Cut', accelerator: 'CmdOrCtrl+X', selector: 'cut:'},
      {label: 'Copy', accelerator: 'CmdOrCtrl+C', selector: 'copy:'},
      {label: 'Paste', accelerator: 'CmdOrCtrl+V', selector: 'paste:'},
      {label: 'Select All', accelerator: 'CmdOrCtrl+A', selector: 'selectAll:'}
    ]
  }
]

function createMainWindow () {
  mainWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: true
    }
  })

  mainWindow.maximize()
  mainWindow.loadFile('index.html')
  mainWindow.show()

  mainWindow.webContents.openDevTools()

  const menu = Menu.buildFromTemplate(TEMPLATE)
  Menu.setApplicationMenu(menu)

  mainWindow.on('closed', () => { mainWindow = null })

  /*
   *  Expose a reference
   */
  app.windows.mainWindow = mainWindow
}

function getPort (service) {
  const ports = app.store.get('ports') || {}
  return ports[service]
}

function setPort (service, port) {
  const ports = app.store.get('ports') || {}
  app.store.set('ports', {...ports, [service]: port})
}

function clearPort (service) {
  const ports = app.store.get('ports') || {}
  delete ports[service]
  app.store.set('ports', ports)
}

function confirmServiceIsRunning (serviceDetails, i = 0) {
  setTimeout(() => {
    request.get(`http://localhost:${serviceDetails.port}`)
      .then(() => {
        serviceDetails.status = 'running'
        const {
          name,
          port
        } = serviceDetails

        mainLogger.log(`"${name}" started on port ${port}`)
        if (mainWindow) mainWindow.webContents.executeJavaScript(`listServices('${name}')`)
      })
      .catch(() => {
        /*
         *  Let's not do this indefinitely
         */
        if (i++ < 1000) confirmServiceIsRunning(serviceDetails, i)
      })
  }, 250)
}

async function beforeQuit () {
  await Promise.all(
    Object
      .entries(services)
      .filter(([service, {status = 'stopped'}]) => status === 'running')
      .map(async ([service]) => {
        await app.stopService(service)
        delete services[service]
      })
  )

  app.store.set('ports', {})
}

const quit = () => mainLogger.log('Goodbye!')

const exit = async () => beforeQuit()

function launchApp () {
  app.on('before-quit', beforeQuit)

  app.on('quit', quit)

  app.on('window-all-closed', () => {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') app.quit()
  })

  app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (!mainWindow) createMainWindow()
  })

  app.launchService = async (service) => {
    const serviceDetails = services[service]

    if (serviceDetails.status === 'starting') {
      return
    }

    serviceDetails.status = 'starting'

    const ports = app.store.get('ports') || {}
    const usedPorts = Object.values(ports)

    let port = 52000
    while (!getPort(service)) {
      if (usedPorts.includes(port) || await app.isPortInUse(port)) port++
      else setPort(service, port)
    }

    const path = `${app.paths.services}/${service}`

    serviceDetails.name = service
    serviceDetails.port = port // getPort(service)
    serviceDetails.path = path

    mainLogger.log(`Starting "${service}" on port ${port}`)

    process.env.SERVICE_NAME = service
    process.env.SERVICE_PORT = port
    process.env.SERVICE_PATH = path

    let browserWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: true
      }
    })

    browserWindow.loadFile('run-service.html')
    browserWindow.on('closed', async () => {
      browserWindow = null
      await app.clearPort(serviceDetails.port)
    })

    serviceDetails.window = browserWindow

    confirmServiceIsRunning(serviceDetails)
  }

  app.stopService = async (service) => {
    const serviceDetails = services[service]
    serviceDetails.status = 'stopped'

    await app.clearPort(serviceDetails.port)

    clearPort(service)

    if (serviceDetails.window) {
      try {
        serviceDetails.window.close()
        delete serviceDetails.window
      } catch ({message}) {
        mainLogger.error(message)
      }
    }
  }

  app.isPortInUse = async (port) => {
    try {
      const [
        portProcess
      ] = await findProcess('port', port) || []

      return !!portProcess
    } catch ({message}) {
      mainLogger.error(message)
    }
  }

  app.clearPort = async (port) => {
    try {
      const [
        {
          pid
        } = {}
      ] = await findProcess('port', port) || []

      if (pid) execSync(`kill -s 9 ${pid}`)
    } catch ({message}) {
      mainLogger.error(message)
    }
  }

  app.openService = async (service) => {
    const serviceDetails = services[service]
    opn(`http://localhost:${serviceDetails.port}/admin/flow`)
  }

  app.deleteService = async (serviceName) => {
    await app.stopService(serviceName)

    const servicePath = path.join(app.paths.services, serviceName)

    rimraf.sync(servicePath)

    const ports = app.store.get('ports')

    delete ports[serviceName]
    delete services[serviceName]

    app.store.set('ports', ports)
  }

  app.openExternal = async (url) => {
    opn(url)
  }

  // In this file you can include the rest of your app's specific main process
  // code. You can also put them in separate files and require them here.
  if (!mainWindow) createMainWindow()
}

// Stash all path refs
app.paths = {}

const homeDir = path.join(ospath.home(), 'documents')

const formBuilderPath = path.join(homeDir, 'formbuilder')
app.paths.formbuilder = formBuilderPath

const logPath = path.join(formBuilderPath, 'logs')
app.paths.logs = logPath

const nvsPath = path.join(formBuilderPath, '.nvs')
app.paths.nvs = nvsPath

const editorPath = path.join(formBuilderPath, '.editor')
app.paths.editor = editorPath

const servicesPath = path.join(formBuilderPath, 'forms')
app.paths.services = servicesPath

execSync(`mkdir -p ${formBuilderPath}`)
execSync(`mkdir -p ${logPath}`)
execSync(`mkdir -p ${servicesPath}`)

const consoleLogPath = path.join(app.paths.logs, 'fb.console.log')
const consoleErrPath = path.join(app.paths.logs, 'fb.console.error')

try {
  fs.unlinkSync(consoleLogPath)
} catch (e) {
  //
}

try {
  fs.unlinkSync(consoleErrPath)
} catch (e) {
  //
}

const consoleLog = fs.createWriteStream(consoleLogPath, {flags: 'a'})
const consoleErr = fs.createWriteStream(consoleErrPath, {flags: 'a'})

// redirect stdout / stderr
process.__defineGetter__('stdout', () => { return consoleLog })
process.__defineGetter__('stderr', () => { return consoleErr })

const existingServices = getDirectories(app.paths.services)

existingServices.forEach((service) => {
  services[service] = {}
})

async function install () {
  app.notify('Starting Editor installation ...', {phase: 'Install Editor'})

  await app.installEditor()

  app.notify('Installing dependencies ...', {phase: 'Install Editor'})

  app.installEditorDependencies()

  app.notify('Editor installation finished', {dismiss: true})
}

const isProbablyFirstUse = () => !(pathExists.sync(nvsPath) && pathExists.sync(editorPath))

async function initialise () {
  await createNotificationWindow()

  const installationWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: true
    }
  })

  installationWindow.loadFile('installation.html')

  app.windows.installation = installationWindow

  if (isProbablyFirstUse()) {
    await sleep(1000)
    try {
      await install()
    } catch (e) {
      mainLogger.error('Installation failed')
    }
  }

  launchApp()
}

app.on('ready', async () => {
  mainLogger.log('Hello!')

  try {
    await initialise()
  } catch (e) {
    mainLogger.error('Initialisation failed')
  }

  mainLogger.log('Ready!')
})

const sleep = (t = 3000) => new Promise(resolve => { setTimeout(resolve, t) })

process.on('exit', exit)
