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
  getPort,
  setPort,
  clearPort,
  confirmServiceIsRunning,
  install,
  displayNotification,
  dismissNotification
} = require('./lib/main')

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

  store.set('ports', {})
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

    const ports = store.get('ports') || {}
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

    createRunServiceWindow(service, serviceWindows, serviceDetails)
    confirmServiceIsRunning(serviceDetails)
  }

  app.stopService = async (service) => {
    const serviceDetails = services[service]
    serviceDetails.status = 'stopped'

    await app.clearPort(serviceDetails.port)

    clearPort(service)

    const serviceWindow = serviceWindows[service]

    if (serviceWindow) {
      try {
        serviceWindow.close()
        delete serviceWindows[service]
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

    const ports = store.get('ports')

    delete ports[serviceName]
    delete services[serviceName]

    store.set('ports', ports)
  }

  app.openExternal = async (url) => {
    open(url)
  }

  // In this file you can include the rest of your app's specific main process
  // code. You can also put them in separate files and require them here.

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

  launchApp()
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

logger.log('Waking up ...')

const existingServices = getDirectories(app.paths.services)

existingServices.forEach((service) => {
  services[service] = {}
})

process.on('exit', exit)
