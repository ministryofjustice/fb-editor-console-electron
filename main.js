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

const ipc = require('electron-better-ipc');


const Store = require('electron-store')
const store = new Store()

const { lstatSync, readdirSync } = fs
const isDirectory = source => lstatSync(source).isDirectory()

// const makeBackgroundWindow = require('./make-background-window')

let firstInstall = false

// Modules to control application life and create native browser window

const {app, BrowserWindow, Menu} = require('electron')

let notificationWindow
let mainWindow

const displayNotification = async (message, options={}) => {
  if (!notificationWindow) {
    notificationWindow = new BrowserWindow({
      xparent: options.parent ||  mainWindow,
      xmodal: true,
      transparent: true,
      frame: false,
      toolbar: false,
      width: 400,
      height: firstInstall ? 200: 154
    })
    notificationWindow.on('blur', () => {
      notificationWindow.focus()
    })
    notificationWindow.loadFile('notification.html')
    
  }
  if (!message) {
    notificationWindow.hide()
    return
  }
  notificationWindow.show()
  try {
    const disableHeader = !!mainWindow
    const params = Object.assign(options, {message, disableHeader})
    await ipc.callRenderer(notificationWindow, 'send-notification', params)
  } catch (e) {
    //
  }
  
  console.log('displayNotification', {message})
  // const executeMessageScript = notificationWindow.webContents.executeJavaScript
  // if (mainWindow) {
  //   notificationWindow.webContents.executeJavaScript('disableHeader()')
  // }
  // if (options.phase) {
  //   notificationWindow.webContents.executeJavaScript(`updatePhase("${options.phase}")`)
  // }
  // notificationWindow.webContents.executeJavaScript(`updateMessage("${message}")`)
  if (options.dismiss) {
    dismissNotification()
  }
}

const dismissNotification = (delay=2000) => {
  if (notificationWindow) {
    setTimeout(() => {
      notificationWindow.hide()
    }, delay)
  }
}

// 49152–65535 (215 + 214 to 216 − 1) 


const notifySticky = (message) => {
  console.log(message)
  // return
  notifier.notify({
    title: 'Form Builder',
    message,
    timeout: 20,
    xreply: true
  },
  (error, response, metadata) => {
    // console.log(response, metadata)
  })
}

const getDirectories = source =>
  readdirSync(source).map(name => path.join(source, name)).filter(isDirectory).map(dir => path.basename(dir))

const services = {}


const installEditorDependencies = () => {
  displayNotification('Installing editor dependencies')
  execSync(`. ${nvsPath}/nvs.sh && nvs add 10.11 && nvs use 10.11 && cd ${fbEditorPath} && npm install`)
}
const cloneEditor = async () => {
  if (pathExists.sync(fbEditorPath)) {
    return
  }
  displayNotification('Cloning editor')
  await git.clone({
    dir: fbEditorPath,
    url: 'https://github.com/ministryofjustice/fb-editor-node',
    singleBranch: true,
    depth: 1
  })
  installEditorDependencies()
  displayNotification('Installed editor')
}

const updateEditor = async () => {
  displayNotification('Fetching updates', {phase: 'Update Editor'})
  try {
    await git.pull({
      dir: fbEditorPath,
      ref: 'master',
      singleBranch: true
    })
  } catch(e) {
    // 
  }
  displayNotification('Reinstalling editor dependencies')
  installEditorDependencies()
  displayNotification('Finished updating editor')
  dismissNotification()
}

const addService = async (serviceName) => {
  displayNotification(`Adding ${serviceName}`, {phase: 'Add existing form'})
  const serviceStub = serviceName.replace(/.*\//, '').replace(/\.git$/, '')
  const addServicePath = path.join(fbServicesPath, serviceStub)
  if (pathExists.sync(addServicePath)) {
    return
  }
  const dir = addServicePath
  let url = serviceName
  if (!serviceName.includes('/')) {
    url = `https://github.com/ministryofjustice/${serviceName}`
  }
  await git.clone({
    dir,
    url,
    singleBranch: true,
    depth: 1
  })
  services[serviceStub] = {}
  displayNotification(`Added ${serviceStub}`)
  dismissNotification()
}

const createService = async (serviceName, createRepo) => {
  displayNotification(`Creating ${serviceName}`, {phase: 'Create form'})
  const newServicePath = path.join(fbServicesPath, serviceName)
  if (pathExists.sync(newServicePath)) {
    return
  }
  const dir = newServicePath
  displayNotification('Cloning fb-service-starter repo')
  await git.clone({
    dir,
    url: 'https://github.com/ministryofjustice/fb-service-starter',
    singleBranch: true,
    depth: 1
  })
  const gitDir = path.join(newServicePath, '.git')
  execSync(`rm -rf ${gitDir}`)
  await git.init({dir})
  services[serviceName] = {}
  const files = glob.sync(`${dir}/**/*`, {dot:true})
    .filter(file => !isDirectory(file))
    .filter(file => !file.includes('.git/'))

  const addFile = async (filepath) => {
    filepath = filepath.replace(dir + '/', '')
    try {
      await git.add({
        dir,
        filepath
      })
    } catch (e) {
      // ignore attempts to add ignored files
    }
  }
  await Promise.all(files.map(addFile))

  const gitSettings = store.get('git')
  const {name, email, user, token} = gitSettings
  await git.commit({
    dir,
    author: {
      name,
      email
    },
    message: 'Created form'
  })
  displayNotification(`Created ${serviceName}`)
  if (!createRepo) {
    dismissNotification()
    return
  }
  displayNotification(`Creating ${serviceName} repository`)
  let url = 'https://api.github.com/user/repos'
  const json = {
    name: serviceName,
    auto_init: false,
    private: false
  }
  await request.post({
    url,
    headers: {
      'User-Agent': 'Form Builder v0.1.0',
      'Authorization': `token ${token}`
    },
    json
  })
  await git.addRemote({
    dir,
    remote: 'origin',
    url: `https://github.com/${user}/${serviceName}.git`
  })
  await git.push({
    dir,
    remote: 'origin',
    ref: 'master',
    token,
  })
  displayNotification(`Created ${serviceName} repository`)
  dismissNotification()
}

const installNVS = async () => {
  if (pathExists.sync(nvsPath)) {
    return
  }
  displayNotification('Installing nvs (Node version manager)')
  await git.clone({
    dir: nvsPath,
    url: 'https://github.com/jasongin/nvs',
    singleBranch: true,
    depth: 1
  })
  displayNotification(`Installed nvs at ${nvsPath}`)
}

const reinstallEditor = async () => {
  displayNotification('Reinstalling', {phase: 'Reinstalling editor'})
  displayNotification('Deleting NVS')
  rimraf.sync(nvsPath)
  displayNotification('Deleting editor')
  rimraf.sync(fbEditorPath)
  await installDependencies()
  displayNotification(`Reinstalled editor`)
  dismissNotification()
}

const installDependencies = async () => {
  await installNVS()
  await cloneEditor()
}

const launchApp = () => {

  app.store = store
  app.services = services
  app.updateEditor = updateEditor
  app.addService = addService
  app.createService = createService
  app.reinstallEditor = reinstallEditor
  app.displayNotification = displayNotification

  function createWindow () {
    if (mainWindow) {
      return
    }
    mainWindow = new BrowserWindow({show: false})
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
      createWindow()
    }
  })

  let portCounter = 52000 // 49152
  app.launchService = async (service) => {
    const serviceDetails = services[service]
    if (!serviceDetails.port) {
      serviceDetails.port = portCounter++
      serviceDetails.path = `${process.env.fbServicesPath}/${service}`
      serviceDetails.running = false
    }
    app.clearPort(serviceDetails.port)
    process.env.XPORT = serviceDetails.port
    process.env.SERVICEDATA = serviceDetails.path
    let backgroundWindow = new BrowserWindow({show: false})
    backgroundWindow.loadFile('background.html')
    backgroundWindow.on('closed', function () {
      backgroundWindow = null
    })
    serviceDetails.window = backgroundWindow
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
    const deleteServicePath = path.join(fbServicesPath, serviceName)
    rimraf.sync(deleteServicePath)
    delete services[serviceName]
  }

  app.openExternal = async (url) => {
    opn(url)
  }

  // In this file you can include the rest of your app's specific main process
  // code. You can also put them in separate files and require them here.
  createWindow()
}

let homeDir = ospath.home()
homeDir = path.join(homeDir, 'documents')
// homeDir = app.getPath('documents')

const fbPath = path.join(homeDir, 'formbuilder')
process.env.fbPath = fbPath
// shell.mkdir('-p', fbPath)
execSync(`mkdir -p ${fbPath}`)

const nvsPath = path.join(fbPath, '.nvs')
process.env.nvsPath = nvsPath

const fbEditorPath = path.join(fbPath, '.editor')
process.env.fbEditorPath = fbEditorPath

const fbServicesPath = path.join(fbPath, 'services')
process.env.fbServicesPath = fbServicesPath

execSync(`mkdir -p ${fbServicesPath}`)
const fbServiceStarterPath = path.join(fbServicesPath, 'fb-service-starter')
process.env.fbServiceStarterPath = fbServiceStarterPath

let existingServices = getDirectories(fbServicesPath)

existingServices.forEach(service => {
  services[service] = {}
})

const setUp = async () => {
  displayNotification('Setting up editor', {phase: 'Setting up editor'})
  await installDependencies()
  displayNotification('All dependencies successfully installed - launching app')
  dismissNotification()
}

const runApp = async () => {
  firstInstall = !(pathExists.sync(nvsPath) && pathExists.sync(fbEditorPath))
  displayNotification()
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