const { execSync } = require('child_process')
const path = require('path')
const pathExists = require('path-exists')
const rimraf = require('rimraf')
const ospath = require('ospath')
const findProcess = require('find-process')
const glob = require('glob')
const open = require('open')
const request = require('request-promise-native')
const fs = require('fs')
const git = require('isomorphic-git')
const logger = require('electron-timber')
const stripAnsi = require('strip-ansi')
const yargsParser = require('yargs-parser')

const args = new Map(Object.entries(yargsParser(process.argv.slice(2))))

logger.setDefaults({ logLevel: 'info' })

git.plugins.set('fs', fs)

const {
  ipcMain
} = require('electron-better-ipc')

const Store = require('electron-store')
const store = new Store()

const {
  lstatSync,
  readdirSync
} = fs

const {
  app,
  BrowserWindow,
  Menu
} = require('electron')

const TEMPLATE = [
  {
    label: 'Application',
    submenu: [
      { label: 'About Application', selector: 'orderFrontStandardAboutPanel:' },
      { type: 'separator' },
      { label: 'Quit', accelerator: 'Command+Q', click: () => { app.quit() } }
    ]
  },
  {
    label: 'Edit',
    submenu: [
      { label: 'Undo', accelerator: 'CmdOrCtrl+Z', selector: 'undo:' },
      { label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', selector: 'redo:' },
      { type: 'separator' },
      { label: 'Cut', accelerator: 'CmdOrCtrl+X', selector: 'cut:' },
      { label: 'Copy', accelerator: 'CmdOrCtrl+C', selector: 'copy:' },
      { label: 'Paste', accelerator: 'CmdOrCtrl+V', selector: 'paste:' },
      { label: 'Select All', accelerator: 'CmdOrCtrl+A', selector: 'selectAll:' }
    ]
  }
]

const services = {}

const isDirectory = (source) => lstatSync(source).isDirectory()

const isLogToFile = () => args.get('logToFile') || false
const isOpenTools = () => args.get('openTools') || false

function getOutWriteStream (outStreamPath) {
  const outStream = fs.createWriteStream(outStreamPath, { flags: 'a' })

  if (isLogToFile()) {
    const {
      write
    } = outStream

    outStream.write = (value) => write.call(outStream, stripAnsi(value))
  }

  return outStream
}

function getErrWriteStream (errStreamPath) {
  const errStream = fs.createWriteStream(errStreamPath, { flags: 'a' })

  if (isLogToFile()) {
    const {
      write
    } = errStream

    errStream.write = (value) => write.call(errStream, stripAnsi(value))
  }

  return errStream
}

const getDirectories = (source) => readdirSync(source).map((name) => path.join(source, name)).filter(isDirectory).map((directory) => path.basename(directory))

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

function createNotificationWindow () {
  const notificationWindow = new BrowserWindow({
    transparent: true,
    frame: false,
    toolbar: false,
    width: 400,
    height: isProbablyFirstUse() ? 200 : 134,
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

function createRunServiceWindow (serviceDetails) {
  const runServiceWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: true
    }
  })

  runServiceWindow.loadFile('run-service.html')
  runServiceWindow.on('closed', async () => {
    delete serviceDetails.window
    await app.clearPort(serviceDetails.port)
  })

  serviceDetails.window = runServiceWindow

  confirmServiceIsRunning(serviceDetails)
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
  } catch (e) {
    logger.log(`Process "${installation}" failed`)
  }
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

        logger.log(`"${name}" started on port ${port}`)
        if (app.windows.mainWindow) app.windows.mainWindow.webContents.executeJavaScript(`listServices('${name}')`)
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
      .filter(([service, { status = 'stopped' }]) => status === 'running')
      .map(async ([service]) => {
        await app.stopService(service)
        delete services[service]
      })
  )

  app.store.set('ports', {})
}

const quit = () => logger.log('Goodbye!')

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
    if (!app.windows.mainWindow) createMainWindow()
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

    logger.log(`Starting "${service}" on port ${port}`)

    process.env.SERVICE_NAME = service
    process.env.SERVICE_PORT = port
    process.env.SERVICE_PATH = path

    createRunServiceWindow(serviceDetails)
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
      } catch ({ message }) {
        logger.error(message)
      }
    }
  }

  app.isPortInUse = async (port) => {
    try {
      const [
        portProcess
      ] = await findProcess('port', port) || []

      return !!portProcess
    } catch ({ message }) {
      logger.error(message)
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
    } catch ({ message }) {
      logger.error(message)
    }
  }

  app.openService = async (service) => {
    const serviceDetails = services[service]
    open(`http://localhost:${serviceDetails.port}/admin/flow`)
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
    open(url)
  }

  // In this file you can include the rest of your app's specific main process
  // code. You can also put them in separate files and require them here.
  if (!app.windows.mainWindow) createMainWindow()
}

async function install () {
  await app.notify('Starting Editor installation ...', { phase: 'Install Editor' })

  await app.installEditor()

  await app.notify('Installing dependencies ...', { phase: 'Install Editor' })

  app.installEditorDependencies()

  await app.notify('Editor installation finished', { dismiss: true })
}

const isProbablyFirstUse = () => !(pathExists.sync(app.paths.nvs) && pathExists.sync(app.paths.editor))

async function initialise () {
  createNotificationWindow()

  createInstallationWindow()

  if (isProbablyFirstUse()) {
    await sleep(1000)
    try {
      await install()
    } catch (e) {
      logger.error('Installation failed')
    }
  }

  launchApp()
}

const sleep = (t = 3000) => new Promise(resolve => { setTimeout(resolve, t) })

app.git = git
app.utils = {
  pathExists,
  isDirectory,
  glob,
  request,
  rimraf
}
app.windows = {}
app.store = store
app.services = services
app.paths = {}

app.on('ready', async () => {
  logger.log('Hello!')

  try {
    await initialise()
  } catch (e) {
    logger.error('Initialisation failed')
  }

  logger.log('Ready!')
})

app.notify = async function displayNotification (message, options = {}) {
  const params = typeof message === 'object' ? message : Object.assign(options, { message })

  const notificationWindow = getNotificationWindow()
  if (notificationWindow) {
    notificationWindow.show()
    await ipcMain.callRenderer(notificationWindow, 'send-notification', params)
  }
}

app.dismissNotification = async function dismissNotification () {
  await app.notify({ dismiss: true })

  const notificationWindow = getNotificationWindow()
  if (notificationWindow) notificationWindow.hide()
}

app.updateEditor = async () => runInstallation('updateEditor')

app.reinstallEditor = async () => runInstallation('reinstallEditor')

app.installEditor = async () => runInstallation('installEditor')

app.setService = (name, params = {}) => {
  services[name] = params
}

app.updateService = (name, params = {}) => {
  services[name] = Object.assign(services[name], params)
}

ipcMain.answerRenderer('setService', () => logger.log('Set service'))

ipcMain.answerRenderer('setServiceProperty', async ({ service, property, value }) => {
  services[service] = services[service] || {}
  services[service][property] = value
})

ipcMain.answerRenderer('getServices', () => services)

{
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
}

if (app.isPackaged || isLogToFile()) {
  const outStreamPath = path.join(app.paths.logs, 'form-builder.out.log')
  const errStreamPath = path.join(app.paths.logs, 'form-builder.err.log')

  try {
    fs.unlinkSync(outStreamPath)
  } catch (e) {
    const { code } = e
    if (code !== 'ENOENT') throw e
  }

  try {
    fs.unlinkSync(errStreamPath)
  } catch (e) {
    const { code } = e
    if (code !== 'ENOENT') throw e
  }

  const outStream = getOutWriteStream(outStreamPath)
  const errStream = getErrWriteStream(errStreamPath)

  /*
   *  Bind console to `outStream` and `errStream`
   */
  global.console = new console.Console(outStream, errStream)

  /*
   *  Redirect `stdout` and `stderr`` to streams
   */
  process.__defineGetter__('stdout', () => outStream)
  process.__defineGetter__('stderr', () => errStream)
}

logger.log('Waking up ...')

const existingServices = getDirectories(app.paths.services)

existingServices.forEach((service) => {
  services[service] = {}
})

process.on('exit', exit)
