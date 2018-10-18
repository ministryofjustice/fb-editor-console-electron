// const shell = require('shelljs')
const { exec, execSync } = require('child_process')
const path = require('path')
const ospath = require('ospath')
const fs = require('fs')
const npm = require("npm")
const hostile = require('hostile')
const notifier = require('node-notifier')
const opn = require('opn')

// const NotificationCenter = require('node-notifier').NotificationCenter

// var notifier = new NotificationCenter({
//   withFallback: false, // Use Growl Fallback if <= 10.8
//   customPath: void 0 // Relative/Absolute path to binary if you want to use your own fork of terminal-notifier
// })
const notifySticky = (message) => {
  console.log(message)
  return
  notifier.notify({
    title: 'Form Builder',
    message,
    timeout: 2000,
    reply: true
  },
  (error, response, metadata) => {
    console.log(response, metadata)
  })
}

const git = require('isomorphic-git')
git.plugins.set('fs', fs)

const launchApp = () => {

  // Modules to control application life and create native browser window
  const {app, BrowserWindow} = require('electron')

  // Keep a global reference of the window object, if you don't, the window will
  // be closed automatically when the JavaScript object is garbage collected.
  let mainWindow

  function createWindow () {
    // Create the browser window.
    mainWindow = new BrowserWindow({width: 800, height: 600})

    // and load the index.html of the app.
    mainWindow.loadFile('index.html')

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

  // In this file you can include the rest of your app's specific main process
  // code. You can also put them in separate files and require them here.
}

let homeDir = ospath.home()
homeDir = path.join(homeDir, 'tmp')

const fbPath = path.join(homeDir, 'formbuilder')
// shell.mkdir('-p', fbPath)
execSync(`mkdir -p ${fbPath}`)

const fbEditorPath = path.join(fbPath, '.editor')

const fbServicePath = path.join(fbPath, 'services')
execSync(`mkdir -p ${fbServicePath}`)
const fbServiceStarterPath = path.join(fbServicePath, 'fb-service-starter')

const cloneEditor = async () => {
  await git.clone({
    dir: fbEditorPath,
    url: 'https://github.com/ministryofjustice/fb-editor-node',
    singleBranch: true,
    depth: 1
  })
}

const cloneService = async () => {
  await git.clone({
    dir: fbServiceStarterPath,
    url: 'https://github.com/ministryofjustice/fb-service-starter',
    singleBranch: true,
    depth: 1
  })
}

const nvsPath = path.join(fbPath, '.nvs')
const installNVS = async () => {
  console.log('installing nvs')
  await git.clone({
    dir: nvsPath,
    url: 'https://github.com/jasongin/nvs',
    singleBranch: true,
    depth: 1
  })
}

const setUp = async () => {
  await installNVS()
  notifySticky(`installed nvs at ${nvsPath}`)
  await cloneEditor()
  notifySticky('Cloned editor')
  await cloneService()
  notifySticky('Cloned service')
  // sleep()



  exec(`. ${nvsPath}/nvs.sh && nvs add latest && nvs use latest && node -v && node -e 'console.log("nvs node running")' && cd ${fbEditorPath} && npm install`, (err, stdout, stderr) => {
    console.log(stdout)
    console.log(stderr)
    console.log('Actually got past nvs.sh')
    const PORT = 4321
    notifySticky(`Starting editor - PORT=${PORT} SERVICEDATA=${fbServiceStarterPath} npm start`)
    exec(`. ${nvsPath}/nvs.sh && nvs use latest && cd ${fbEditorPath} && PORT=${PORT} SERVICEDATA=${fbServiceStarterPath} npm start`, (err, stdout, stderr) => {})
    // notifier.notify('FB Editor started')
    opn(`http://localhost:${PORT}`);
  })
  notifySticky('Ran nvs.sh')

}

setUp()
launchApp()



// const timeout = (ms) => {
//   return new Promise(resolve => setTimeout(resolve, ms));
// }
// const sleep = async (t = 3000) => {
//   console.log('sleeping...')
//   await timeout(t);
//   console.log('waking up...')
// }