// Create service - and now add it to github - or 
// Add a service that exists on github / repo location

// const shell = require('shelljs')
const { exec, execSync, spawnSync } = require('child_process')
const path = require('path')
const pathExists = require('path-exists')
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

const Store = require('electron-store')
const store = new Store()

const { lstatSync, readdirSync } = fs
const isDirectory = source => lstatSync(source).isDirectory()

const makeBackgroundWindow = require('./make-background-window')

// 49152–65535 (215 + 214 to 216 − 1) 


// const NotificationCenter = require('node-notifier').NotificationCenter

// var notifier = new NotificationCenter({
//   withFallback: false, // Use Growl Fallback if <= 10.8
//   customPath: void 0 // Relative/Absolute path to binary if you want to use your own fork of terminal-notifier
// })
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



const services = {}

// Modules to control application life and create native browser window
const {app, BrowserWindow} = require('electron')

console.log('app.getPath', app.getPath('userData'))

app.store = store

const launchApp = () => {


  // Keep a global reference of the window object, if you don't, the window will
  // be closed automatically when the JavaScript object is garbage collected.
  let mainWindow

  function createWindow () {
    notifySticky('Creating window')
    // Create the browser window.
    mainWindow = new BrowserWindow({show: false})
    mainWindow.maximize()
    // and load the index.html of the app.
    mainWindow.loadFile('index.html')
    mainWindow.show()

    // mainWindow.webContents.openDevTools()

    // process.env.XPORT = 5001
    // makeBackgroundWindow()
    // setTimeout(() => {
    //   process.env.XPORT = 5555
    //   makeBackgroundWindow()
    // })

    // Open the DevTools.
    // mainWindow.webContents.openDevTools()

    // Emitted when the window is closed.
    mainWindow.on('closed', function () {
      // Dereference the window object, usually you would store windows
      // in an array if your app supports multi windows, this is the time
      // when you should delete the corresponding element.
      mainWindow = null
    })
  }

  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  notifySticky('Registering ready method')
  app.on('ready', createWindow)

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
  app.launchService = (service) => {
    console.log({service})
    const serviceDetails = services[service]
    if (!serviceDetails.port) {
      serviceDetails.port = portCounter++
      serviceDetails.path = `${process.env.fbServicesPath}/${service}`
      serviceDetails.running = false
    }
    app.clearPort(serviceDetails.port)
    process.env.XPORT = serviceDetails.port
    process.env.SERVICEDATA = serviceDetails.path
    let backgroundWindow = new BrowserWindow({width: 800, height: 600})
    // process.env.SERVICEDATA = '/Users/alexrobinson/Projects/formbuilder/fb-ioj' // process.env.fbServiceStarterPath
    backgroundWindow.loadFile('background.html')
    backgroundWindow.webContents.openDevTools()
    backgroundWindow.on('closed', function () {
      backgroundWindow = null
    })
    serviceDetails.window = backgroundWindow
    // setTimeout(() => {
    //   backgroundWindow.close()
    // }, 15000)
    setTimeout(() => {
      const XPORT = process.env.XPORT
      console.log('opening XPORT', XPORT)
      let backgroundWindow2 = new BrowserWindow({xwidth: 800, xheight: 600})
      backgroundWindow2.loadURL(`http://localhost:${XPORT}`)
      backgroundWindow2.on('closed', function () {
        backgroundWindow2 = null
      })
    }, 6000)
  }

  app.stopService = (service) => {
    const serviceDetails = services[service]
    serviceDetails.window.close()
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

  // In this file you can include the rest of your app's specific main process
  // code. You can also put them in separate files and require them here.
}

let homeDir = ospath.home()
homeDir = path.join(homeDir, 'tmp')
homeDir = app.getPath('documents')

const fbPath = path.join(homeDir, 'formbuilder')
process.env.fbPath = fbPath
// shell.mkdir('-p', fbPath)
execSync(`mkdir -p ${fbPath}`)

const fbEditorPath = path.join(fbPath, '.editor')
process.env.fbEditorPath = fbEditorPath

const fbServicesPath = path.join(fbPath, 'services')
process.env.fbServicesPath = fbServicesPath

execSync(`mkdir -p ${fbServicesPath}`)
const fbServiceStarterPath = path.join(fbServicesPath, 'fb-service-starter')
process.env.fbServiceStarterPath = fbServiceStarterPath

const getDirectories = source =>
  readdirSync(source).map(name => path.join(source, name)).filter(isDirectory).map(dir => path.basename(dir))

let existingServices = getDirectories(fbServicesPath)

existingServices.forEach(service => {
  services[service] = {}
})
app.services = services

const cloneEditor = async () => {
  if (pathExists.sync(fbEditorPath)) {
    return
  }
  notifySticky('Installing editor')
  await git.clone({
    dir: fbEditorPath,
    url: 'https://github.com/ministryofjustice/fb-editor-node',
    singleBranch: true,
    depth: 1
  })
  notifySticky('Installing editor dependencies')
  execSync(`. ${nvsPath}/nvs.sh && nvs add latest && nvs use latest && cd ${fbEditorPath} && npm install`)
  notifySticky('Cloned editor')
}

const cloneService = async () => {
  if (pathExists.sync(fbServiceStarterPath)) {
    return
  }
  notifySticky('Installing service starter')
  await git.clone({
    dir: fbServiceStarterPath,
    url: 'https://github.com/ministryofjustice/fb-service-starter',
    singleBranch: true,
    depth: 1
  })
  notifySticky('Cloned service')
}

const addService = async (serviceName) => {
  const serviceStub = serviceName.replace(/.*\//, '').replace(/\.git$/, '')
  const addServicePath = path.join(fbServicesPath, serviceStub)
  if (pathExists.sync(addServicePath)) {
    return
  }
  const dir = addServicePath
  notifySticky(`Adding ${serviceStub}`)
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
  notifySticky(`Added ${serviceStub}`)
}
app.addService = addService

const createService = async (serviceName, createRepo) => {
  const newServicePath = path.join(fbServicesPath, serviceName)
  if (pathExists.sync(newServicePath)) {
    return
  }
  const dir = newServicePath
  notifySticky('Cloning service starter')
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

  const gitSettings = app.store.get('git')
  const {name, email, user, token} = gitSettings
  await git.commit({
    dir,
    author: {
      name,
      email
    },
    message: 'Created form'
  })
  if (!createRepo) {
    return
  }
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
}
app.createService = createService

const nvsPath = path.join(fbPath, '.nvs')
process.env.nvsPath = nvsPath

const installNVS = async () => {
  if (pathExists.sync(nvsPath)) {
    return
  }
  notifySticky('Installing nvs (Node version manager)')
  await git.clone({
    dir: nvsPath,
    url: 'https://github.com/jasongin/nvs',
    singleBranch: true,
    depth: 1
  })
  notifySticky(`Installed nvs at ${nvsPath}`)
}

const setUp = async () => {
  await installNVS()
  await cloneEditor()
  await cloneService()


  const PORT = 4321
  notifySticky(`Starting editor - PORT=${PORT} SERVICEDATA=${fbServiceStarterPath} npm start`)

  // return new Promise((resolve, reject) => {
    exec(`. ${nvsPath}/nvs.sh && nvs use latest && cd ${fbEditorPath} && PORT=${PORT} SERVICEDATA=${fbServiceStarterPath} npm start`, (err, stdout, stderr) => {})
  //   setTimeout(() => {
  //     opn(`http://localhost:${PORT}`)
  //     resolve()
  //   }, 2000)
  // })
 
  // spawnSync(`. ${nvsPath}/nvs.sh && nvs use latest && cd ${fbEditorPath} && PORT=${PORT} SERVICEDATA=${fbServiceStarterPath} npm start`)


  // exec(`. ${nvsPath}/nvs.sh && nvs add latest && nvs use latest && node -v && node -e 'console.log("nvs node running")' && cd ${fbEditorPath} && npm install`, (err, stdout, stderr) => {
  //   console.log(stdout)
  //   console.log(stderr)
  //   console.log('Actually got past nvs.sh')
  //   const PORT = 4321
  //   notifySticky(`Starting editor - PORT=${PORT} SERVICEDATA=${fbServiceStarterPath} npm start`)
  //   exec(`. ${nvsPath}/nvs.sh && nvs use latest && cd ${fbEditorPath} && PORT=${PORT} SERVICEDATA=${fbServiceStarterPath} npm start`, (err, stdout, stderr) => {})
  //   // notifier.notify('FB Editor started')
  //   opn(`http://localhost:${PORT}`);
  // })
  // notifySticky('Ran nvs.sh')

}

const runApp = async () => {
  try {
    await setUp()
  } catch (e) {
    console.log(e)
  }
  notifySticky('Launching app')
  launchApp()
}

runApp()


// const timeout = (ms) => {
//   return new Promise(resolve => setTimeout(resolve, ms));
// }
// const sleep = async (t = 3000) => {
//   console.log('sleeping...')
//   await timeout(t);
//   console.log('waking up...')
// }