const { exec, execSync, spawnSync } = require('child_process')
const path = require('path')
const pathExists = require('path-exists')
const rimraf = require('rimraf')
const ospath = require('ospath')
const npm = require("npm")
const hostile = require('hostile')
const notifier = require('node-notifier')
const glob = require('glob')
const opn = require('opn')
const request = require('request-promise-native')
const fs = require('fs')
const git = require('isomorphic-git')
git.plugins.set('fs', fs)

const ipc = require('electron-better-ipc')

const Store = require('electron-store')
const store = new Store()

const { lstatSync, readdirSync } = fs
const isDirectory = source => lstatSync(source).isDirectory()


let firstInstall = false

// Modules to control application life and create native browser window

const {app, BrowserWindow, Menu} = require('electron')

app.git = git
app.utils = {
  pathExists,
  isDirectory,
  glob,
  request
}
app.windows = {}

// let notificationWindow
let mainWindow

const createNotificationWindow = () => {
  const notificationWindow = new BrowserWindow({
    transparent: true,
    frame: false,
    toolbar: false,
    width: 400,
    height: firstInstall ? 200: 134
  })
  notificationWindow.on('blur', () => {
    notificationWindow.focus()
  })
  notificationWindow.loadFile('notification.html')
  notificationWindow.hide()
  app.windows.notificationWindow = notificationWindow
}

const displayNotification = async (message, options={}) => {
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
  
  console.log('displayNotification', {message})

}
app.notify = displayNotification
app.dismissNotification = () => {
  app.notify({dismiss: true})
}



// 49152–65535 (215 + 214 to 216 − 1) 

const getDirectories = source =>
  readdirSync(source).map(name => path.join(source, name)).filter(isDirectory).map(dir => path.basename(dir))

const services = {}

ipc.answerRenderer('setService', async params => {
  services[params[name]] = params
  console.log('setService', JSON.stringify(params, null, 2))
})

const installEditorDependencies = () => {
  app.notify('Installing editor dependencies')
  execSync(`. ${nvsPath}/nvs.sh && nvs add 10.11 && nvs use 10.11 && cd ${fbEditorPath} && npm install`)
}
const cloneEditor = async () => {
  if (pathExists.sync(fbEditorPath)) {
    return
  }
  app.notify('Cloning editor')
  await git.clone({
    dir: fbEditorPath,
    url: 'https://github.com/ministryofjustice/fb-editor-node',
    singleBranch: true,
    depth: 1
  })
  installEditorDependencies()
  app.notify('Installed editor')
}

const updateEditor = async () => {
  app.notify('Fetching updates', {phase: 'Update Editor'})
  try {
    await git.pull({
      dir: fbEditorPath,
      ref: 'master',
      singleBranch: true
    })
  } catch(e) {
    // 
  }
  app.notify('Reinstalling editor dependencies')
  installEditorDependencies()
  app.notify('Finished updating editor', {dismiss: true})
}

const installNVS = async () => {
  if (pathExists.sync(nvsPath)) {
    return
  }
  app.notify('Installing nvs (Node version manager)')
  await git.clone({
    dir: nvsPath,
    url: 'https://github.com/jasongin/nvs',
    singleBranch: true,
    depth: 1
  })
  app.notify(`Installed nvs at ${nvsPath}`)
}

const reinstallEditor = async () => {
  app.notify('Reinstalling', {phase: 'Reinstalling editor'})
  app.notify('Deleting NVS')
  rimraf.sync(nvsPath)
  app.notify('Deleting editor')
  rimraf.sync(fbEditorPath)
  await installDependencies()
  app.notify(`Reinstalled editor`, {dismiss: true})
}

const installDependencies = async () => {
  await installNVS()
  await cloneEditor()
}

const launchApp = () => {

  app.store = store
  app.services = services
  app.getServices = () => services
  app.setService = (name, params={}) => services[name] = params
  app.updateEditor = updateEditor
  // app.addService = addService
  // app.createService = createService
  app.reinstallEditor = reinstallEditor  

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

    var template = [{
      label: "Application",
      submenu: [
          { label: "About Application", selector: "orderFrontStandardAboutPanel:" },
          { type: "separator" },
          { label: "Quit", accelerator: "Command+Q", click: function() { app.quit() }}
      ]}, {
      label: "Edit",
      submenu: [
          { label: "Undo", accelerator: "CmdOrCtrl+Z", selector: "undo:" },
          { label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", selector: "redo:" },
          { type: "separator" },
          { label: "Cut", accelerator: "CmdOrCtrl+X", selector: "cut:" },
          { label: "Copy", accelerator: "CmdOrCtrl+C", selector: "copy:" },
          { label: "Paste", accelerator: "CmdOrCtrl+V", selector: "paste:" },
          { label: "Select All", accelerator: "CmdOrCtrl+A", selector: "selectAll:" }
      ]}
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));

    mainWindow.on('closed', function () {
      mainWindow = null
    })
  }

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

  let portCounter = 52000 // 49152
  app.launchService = async (service) => {
    const serviceDetails = services[service]
    if (!serviceDetails.port) {
      serviceDetails.port = portCounter++
      serviceDetails.path = `${app.paths.services}/${service}`
      serviceDetails.running = false
    }
    app.clearPort(serviceDetails.port)
    process.env.SERVICEPORT = serviceDetails.port
    process.env.SERVICEDATA = serviceDetails.path
    let runServiceWindow = new BrowserWindow({show: false})
    runServiceWindow.loadFile('run-service.html')
    runServiceWindow.on('closed', function () {
      runServiceWindow = null
    })
    serviceDetails.window = runServiceWindow
  }

  app.stopService = async (service) => {
    const serviceDetails = services[service]
    if (serviceDetails.window) {
      serviceDetails.window.close()
      delete serviceDetails.window
    }
  }

  app.clearPort = (PORT) => {
    try {
      const portPidProcess = execSync(`lsof -i :${PORT} | grep LISTEN`).toString()
      const portPid = portPidProcess.replace(/node\s+(\d+)\s.*/, '$1')
      execSync(`kill -s 9 ${portPid}`)
    } catch (e) {
      // ignore errors
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

const nvsPath = path.join(fbPath, '.nvs')
app.paths.nvs = nvsPath

const fbEditorPath = path.join(fbPath, '.editor')
app.paths.editor = fbEditorPath

const fbServicesPath = path.join(fbPath, 'forms')
app.paths.services = fbServicesPath
execSync(`mkdir -p ${fbServicesPath}`)

let existingServices = getDirectories(app.paths.services)

existingServices.forEach(service => {
  services[service] = {}
})

const setUp = async () => {
  app.notify('Setting up editor', {phase: 'Setting up editor'})
  await installDependencies()
  app.notify('All dependencies successfully installed - launching app', {dismiss: true})
}

const runApp = async () => {
  firstInstall = !(pathExists.sync(nvsPath) && pathExists.sync(fbEditorPath))
  createNotificationWindow()
  if (firstInstall) {
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


// const timeout = (ms) => {
//   return new Promise(resolve => setTimeout(resolve, ms));
// }
// const sleep = async (t = 3000) => {
//   console.log('sleeping...')
//   await timeout(t);
//   console.log('waking up...')
// }