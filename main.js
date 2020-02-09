require('@ministryofjustice/module-alias/register')

const { execSync } = require('child_process')
const path = require('path')
const rimraf = require('rimraf')
const ospath = require('ospath')
const findProcess = require('find-process')
const open = require('open')
const fs = require('fs')
const git = require('isomorphic-git')

const {
  app
} = require('electron')

const logger = require('electron-timber')

const {
  ipcMain
} = require('electron-better-ipc')

const Store = require('electron-store')

const {
  getDirectories,
  isLogToFile,
  isProbablyFirstUse
} = require('./lib/common')

const {
  getOutWriteStream,
  getErrWriteStream
} = require('./lib/common/write-stream')

const {
  hasTokenFile,
  hasToken,
  getToken,
  setToken,
  encryptToken,
  decryptToken
} = require('./lib/token-file')

const store = new Store()

logger.setDefaults({ logLevel: 'info' })

git.plugins.set('fs', fs)

const windows = {}
const services = {}
const serviceWindows = {}
const paths = {}

const {
  getMainWindow,
  createNotificationWindow,
  createInstallationWindow,
  createRunServiceWindow,
  createMainWindow,
  getPidsForPort,
  hasPort,
  getPort,
  setPort,
  clearPort,
  confirmServiceIsRunning,
  install,
  updateEditor,
  reinstallEditor,
  installEditor,
  installEditorDependencies,
  displayNotification,
  dismissNotification
} = require('./lib/main')

ipcMain.handle('has-token-file', async () => hasTokenFile())

ipcMain.handle('encrypt-token', async (event, token, password) => encryptToken(token, password))

ipcMain.handle('decrypt-token', async (event, password) => decryptToken(password))

ipcMain.handle('has-token', async () => hasToken())

ipcMain.handle('get-token', () => getToken())

ipcMain.handle('set-token', (event, token) => setToken(token))

ipcMain.on('go-to-password', () => {
  const mainWindow = getMainWindow()
  if (mainWindow) mainWindow.loadFile('password.html')
})

ipcMain.on('go-to-settings', (event, param) => {
  const mainWindow = getMainWindow()
  if (mainWindow) {
    mainWindow.loadFile('settings.html')
    if (param) {
      const { webContents } = mainWindow
      webContents.once('dom-ready', () => ipcMain.callRenderer(mainWindow, 'select-tab', param))
    }
  }
})

ipcMain.on('go-to-create', () => {
  const mainWindow = getMainWindow()
  if (mainWindow) mainWindow.loadFile('create.html')
})

ipcMain.answerRenderer('update-editor', updateEditor)

ipcMain.answerRenderer('reinstall-editor', reinstallEditor)

ipcMain.answerRenderer('install-editor', installEditor)

ipcMain.answerRenderer('install-editor-dependencies', installEditorDependencies)

async function clearPorts () {
  const ports = store.get('ports') || {}

  await Promise.all(
    Object
      .entries(ports)
      .map(async ([service, port]) => {
        logger.log(`Clearing port "${port}" for service "${service}" ...`)

        await app.clearPort(port)
        clearPort(service)

        logger.log(`Port "${port}" for service "${service}" cleared`)
      })
  )

  store.set('ports', {})
}

async function clearServices () {
  await Promise.all(
    Object
      .entries(services)
      .filter(([service, { status = 'stopped' }]) => status === 'running')
      .map(async ([service, { port }]) => {
        logger.log(`Clearing service "${service}" on port "${port}" ...`)

        await app.stopService(service)
        delete services[service]

        logger.log(`Service "${service}" on port "${port}" cleared`)
      })
  )
}

function portsInUse () {
  return Object.values(store.get('ports') || {})
}

async function launchApp () {
  app.on('quit', () => { logger.log('Goodbye!') })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })

  app.on('activate', () => {
    const mainWindow = getMainWindow()
    if (!mainWindow) createMainWindow()
  })

  app.launchService = async (service) => {
    const serviceDetails = services[service]

    if (serviceDetails.status === 'starting') {
      return
    }

    serviceDetails.status = 'starting'

    let [
      port = 52000
    ] = portsInUse().sort()

    if (!hasPort(service)) {
      while (!getPort(service)) {
        /*
         *  Execute the asyncronous process,
         *  then syncronously get the list of ports in use
         */
        if (await app.isPortInUse(port) || portsInUse().includes(port)) port++
        else setPort(service, port)
      }

      const path = `${app.paths.services}/${service}`

      serviceDetails.name = service
      serviceDetails.port = port
      serviceDetails.path = path

      logger.log(`Starting "${service}" on port ${port}`)

      process.env.SERVICE_NAME = service
      process.env.SERVICE_PORT = port
      process.env.SERVICE_PATH = path

      createRunServiceWindow(service, serviceWindows, serviceDetails)
      confirmServiceIsRunning(serviceDetails)
    }
  }

  app.stopService = async (service) => {
    const serviceDetails = services[service]
    serviceDetails.status = 'stopped'

    const { port } = serviceDetails
    await app.clearPort(port)

    clearPort(service)

    const serviceWindow = serviceWindows[service]

    if (serviceWindow) {
      try {
        serviceWindow.close()
      } catch ({ message = '' }) {
        if (!(message.toLowerCase() === 'object has been destroyed')) logger.error(message)
      }

      delete serviceWindows[service]
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
      /*
       *  Execute syncronously during quit ...
       */
      getPidsForPort(port)
        .forEach((pid) => {
          /*
           *  ... but push the call to the end of the event queue
           */
          setImmediate(async () => {
            logger.log(`Killing process "${pid}" ...`)

            execSync(`kill -s KILL ${pid} 2> /dev/null`)

            logger.log(`Process "${pid}" killed`)
          })
        })
    } catch (e) {
      /*
       *  Execute asyncronously during launch ...
       */
      const [
        {
          pid
        } = {}
      ] = await findProcess('port', port) || []

      if (pid) execSync(`kill -s KILL ${pid} 2> /dev/null`)
    }
  }

  app.openService = async (service) => {
    const { name, port } = services[service]

    logger.log(`Opening service "${name}" on port "${port}" ...`)

    await open(`http://localhost:${port}/admin/flow`)

    logger.log(`Service "${name}" on port "${port}" open`)
  }

  app.deleteService = async (serviceName) => {
    await app.stopService(serviceName)

    const servicePath = path.join(app.paths.services, serviceName)

    rimraf.sync(servicePath)

    const ports = store.get('ports') || {}

    delete ports[serviceName]
    delete services[serviceName]

    store.set('ports', ports)
  }

  app.openExternal = (url) => open(url) // promise

  await clearPorts()

  const mainWindow = getMainWindow()
  if (!mainWindow) createMainWindow()
}

async function initialise () {
  createNotificationWindow()

  createInstallationWindow()

  if (isProbablyFirstUse(app)) {
    await sleep(1000)
    try {
      await install()
    } catch ({ message }) {
      logger.error(`Installation failed (${message})`)
    }
  }

  await launchApp()
}

const sleep = (t = 3000) => new Promise(resolve => { setTimeout(resolve, t) })

app.git = git
app.store = store
app.windows = windows
app.services = services
app.paths = paths

// https://github.com/electron/electron/issues/18397
app.allowRendererProcessReuse = true

app.on('ready', async () => {
  logger.log('Hello!')

  try {
    await initialise()
  } catch ({ message }) {
    logger.error(`Initialisation failed (${message})`)
  }

  logger.log('Ready!')
})

app.displayNotification = displayNotification
app.dismissNotification = dismissNotification

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

  const tokenPath = path.join(formBuilderPath, '.token')
  app.paths.token = tokenPath

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

getDirectories(app.paths.services)
  .forEach((service) => {
    services[service] = {}
  })

logger.log('Waking up ...')

process.on('exit', async () => {
  await clearServices()

  store.delete('ports')
})
