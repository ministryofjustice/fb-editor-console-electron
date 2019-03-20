const {exec, execSync, spawnSync} = require('child_process')
const path = require('path')
const pathExists = require('path-exists')
const rimraf = require('rimraf')
const ospath = require('ospath')
const findProcess = require('find-process')
const npm = require('npm')
const hostile = require('hostile')
const notifier = require('node-notifier')
const glob = require('glob')
const opn = require('opn')
const request = require('request-promise-native')
const fs = require('fs')
const git = require('isomorphic-git')
git.plugins.set('fs', fs)

const logger = require('electron-timber')
const mainLogger = logger.create({name: 'MainBrain'})
mainLogger.log('Main Logger working')
const ipc = require('electron-better-ipc')

const Store = require('electron-store')
const store = new Store()

const {lstatSync, readdirSync} = fs
const isDirectory = source => lstatSync(source).isDirectory()

let firstInstall = false

// Modules to control application life and create native browser window

const {app, BrowserWindow, Menu} = require('electron')

app.git = git
app.utils = {
  pathExists,
  isDirectory,
  glob,
  request,
  rimraf
}
app.windows = {}

// let notificationWindow
let mainWindow

const createNotificationWindow = async () => {
  const notificationWindow = new BrowserWindow({
    transparent: true,
    frame: false,
    toolbar: false,
    width: 400,
    height: firstInstall ? 200 : 134
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
  // try {
  await ipc.callRenderer(notificationWindow, 'send-notification', params)
  // } catch (e) {
  //   //
  // }
  // try {
  // await ipc.callRenderer(notificationWindow, 'send-notification', {message:'gosh', dismiss: true})
  // } catch(e) {}

  mainLogger.log('displayNotification', {message})
}
app.notify = displayNotification
app.dismissNotification = () => {
  app.notify({dismiss: true})
}

const getDirectories = source =>
  readdirSync(source).map(name => path.join(source, name)).filter(isDirectory).map(dir => path.basename(dir))

const services = {}

ipc.answerRenderer('setService', async params => {
  mainLogger.log('Called set service')
  // services[params[name]] = params
  // console.log('setService', JSON.stringify(params, null, 2))
})
ipc.answerRenderer('setServiceProperty', async params => {
  const {service, property, value} = params
  services[service] = services[service] || {}
  services[service][property] = value
})
ipc.answerRenderer('getServices', async () => {
  return services
})

// ipc.answerRenderer('getServiceStatus', async (service) => {
//   return 'running'
//   // const serviceData = services[service] || {}
//   // return serviceData.status || 'stopped'
// })

const runInstallation = async (name) => {
  try {
    await ipc.callRenderer(app.windows.installation, name)
  } catch (e) {
    mainLogger.log(`Installation: ${name} failed`)
  }
}
app.updateEditor = async () => {
  await runInstallation('updateEditor')
}
app.reinstallEditor = async () => {
  await runInstallation('reinstallEditor')
}
app.installEditor = async () => {
  await runInstallation('installEditor')
}

app.store = store
app.services = services
app.setService = (name, params = {}) => {
  services[name] = params
}
app.updateService = (name, params = {}) => {
  services[name] = Object.assign(services[name], params)
}

const launchApp = () => {
  // app.addService = addService
  // app.createService = createService

  function createMainWindow () {
    if (mainWindow) {
      return
    }
    mainWindow = new BrowserWindow({show: false})
    app.windows.mainWindow = mainWindow
    mainWindow.maximize()
    mainWindow.loadFile('index.html')
    mainWindow.show()
    // mainWindow.webContents.openDevTools()

    let template = [{
      label: 'Application',
      submenu: [
        {label: 'About Application', selector: 'orderFrontStandardAboutPanel:'},
        {type: 'separator'},
        {label: 'Quit', accelerator: 'Command+Q', click: function () { app.quit() }}
      ]}, {
      label: 'Edit',
      submenu: [
        {label: 'Undo', accelerator: 'CmdOrCtrl+Z', selector: 'undo:'},
        {label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', selector: 'redo:'},
        {type: 'separator'},
        {label: 'Cut', accelerator: 'CmdOrCtrl+X', selector: 'cut:'},
        {label: 'Copy', accelerator: 'CmdOrCtrl+C', selector: 'copy:'},
        {label: 'Paste', accelerator: 'CmdOrCtrl+V', selector: 'paste:'},
        {label: 'Select All', accelerator: 'CmdOrCtrl+A', selector: 'selectAll:'}
      ]}]

    Menu.setApplicationMenu(Menu.buildFromTemplate(template))

    mainWindow.on('closed', function () {
      mainWindow = null
    })
  }

  app.on('quit', function () {
    mainLogger.log('Form Builder Console quitting')
    Object.keys(services).forEach(service => {
      mainLogger.log(`Making sure ${service} is stopped`)
      app.stopService(service)
    })
  })

  // Quit when all windows are closed.
  app.on('window-all-closed', function () {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })

  app.on('activate', function () {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
      createMainWindow()
    }
  })

  app.launchService = async (service) => {
    const serviceDetails = services[service]
    if (serviceDetails.status === 'starting') {
      return
    }
    serviceDetails.status = 'starting'
    if (!serviceDetails.port) {
      const portSettings = app.store.get('ports') || {}
      serviceDetails.port = portSettings[service]
      const usedPorts = Object.keys(portSettings).map(service => portSettings[service])

      // 49152–65535 (215 + 214 to 216 − 1)
      let portCounter = 52000
      while (!serviceDetails.port) {
        const checkPort = portCounter++
        if (!usedPorts.includes(checkPort)) {
          const portProcess = await app.checkPort(checkPort)
          if (!portProcess.alreadyInUse) {
            serviceDetails.port = checkPort
            portSettings[service] = checkPort
            app.store.set('ports', portSettings)
          }
        }
      }
      serviceDetails.path = `${app.paths.services}/${service}`
    }
    mainLogger.log(`launch ${service} on ${serviceDetails.port}`)
    await app.clearPort(serviceDetails.port)
    process.env.SERVICENAME = service
    process.env.SERVICEPORT = serviceDetails.port
    process.env.SERVICE_PATH = serviceDetails.path
    let runServiceWindow = new BrowserWindow({show: false})
    runServiceWindow.loadFile('run-service.html')
    runServiceWindow.on('closed', async () => {
      runServiceWindow = null
      await app.clearPort(serviceDetails.port)
    })
    serviceDetails.window = runServiceWindow
    mainLogger.log('about to check service')
    const checkService = () => {
      setTimeout(() => {
        request.get(`http://localhost:${serviceDetails.port}`)
          .then((res) => {
            const mainWindow = app.windows.mainWindow
            serviceDetails.status = 'running'
            mainWindow.webContents.executeJavaScript(`listServices('${service}')`)
          })
          .catch(() => {
            checkService()
          })
      }, 250)
    }
    checkService()
  }

  app.stopService = async (service) => {
    const serviceDetails = services[service]
    serviceDetails.status = 'stopped'

    app.clearPort(serviceDetails.port)

    if (serviceDetails.window) {
      try {
        serviceDetails.window.close()
        delete serviceDetails.window
      } catch (e) {
        //
      }
    }
  }

  app.checkPort = async (PORT) => {
    return findProcess('port', PORT)
      .then(list => {
        const portProcess = list[0]
        if (portProcess) {
          if (portProcess.cmd !== 'node bin/start.js') {
            portProcess.alreadyInUse = true
          }
        }
        return portProcess || {}
      })
      .catch(e => {
        //
      })
  }

  app.clearPort = async (PORT) => {
    const portProcess = await app.checkPort(PORT)
    const {pid} = portProcess
    if (pid) {
      // process.kill(pid)
      try {
        execSync(`kill -s 9 ${pid}`)
      } catch (e) {
        //
      }
    }
  }

  app.openService = async (service) => {
    const serviceDetails = services[service]
    opn(`http://localhost:${serviceDetails.port}/admin/flow`)
  }

  app.deleteService = async (serviceName) => {
    await app.stopService(serviceName)
    const deleteServicePath = path.join(app.paths.services, serviceName)
    rimraf.sync(deleteServicePath)
    const portSettings = app.store.get('ports')
    delete portSettings[serviceName]
    app.store.set('ports', portSettings)
    delete services[serviceName]
  }

  app.openExternal = async (url) => {
    opn(url)
  }

  // In this file you can include the rest of your app's specific main process
  // code. You can also put them in separate files and require them here.
  createMainWindow()
}

// Stash all path refs
app.paths = {}

let homeDir = ospath.home()
homeDir = path.join(homeDir, 'documents')
// homeDir = app.getPath('documents')

const fbPath = path.join(homeDir, 'formbuilder')
app.paths.formbuilder = fbPath
execSync(`mkdir -p ${fbPath}`)

const fbLogsPath = path.join(fbPath, 'logs')
app.paths.logs = fbLogsPath
execSync(`mkdir -p ${fbLogsPath}`)

const nvsPath = path.join(fbPath, '.nvs')
app.paths.nvs = nvsPath

const fbEditorPath = path.join(fbPath, '.editor')
app.paths.editor = fbEditorPath

const fbServicesPath = path.join(fbPath, 'forms')
app.paths.services = fbServicesPath
execSync(`mkdir -p ${fbServicesPath}`)

const consoleLogPath = path.join(app.paths.logs, 'fb.console.log')
try {
  fs.unlinkSync(consoleLogPath)
} catch (e) {
  //
}
const consoleLog = fs.createWriteStream(consoleLogPath, {flags: 'a'})

// redirect stdout / stderr
process.__defineGetter__('stdout', () => { return consoleLog })
process.__defineGetter__('stderr', () => { return consoleLog })

let existingServices = getDirectories(app.paths.services)

existingServices.forEach(service => {
  services[service] = {}
})

const setUp = async () => {
  app.notify('Setting up editor', {phase: 'Setting up editor'})
  await app.installEditor()
  app.notify('All dependencies successfully installed - launching app', {dismiss: true})
}

const runApp = async () => {
  firstInstall = !(pathExists.sync(nvsPath) && pathExists.sync(fbEditorPath))
  await createNotificationWindow()

  let installationWindow = new BrowserWindow({show: false})
  installationWindow.loadFile('installation.html')
  app.windows.installation = installationWindow

  if (firstInstall) {
    await sleep(1000)
    try {
      await setUp()
    } catch (e) {
      console.log('Setup went wrong', e)
    }
  }
  console.log('Launching app')
  launchApp()
}

app.on('ready', () => {
  console.log('Running the app')
  runApp()
})

const timeout = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms))
}
const sleep = async (t = 3000) => {
  console.log('sleeping...')
  await timeout(t)
  console.log('waking up...')
}
