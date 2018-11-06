const {BrowserWindow} = require('electron')

const makeBackgroundWindow = (PORT, SERVICEDATA) => {
    process.env.XPORT = PORT
    process.env.SERVICEDATA = SERVICEDATA
    let backgroundWindow = new BrowserWindow({width: 800, height: 600})
    // process.env.SERVICEDATA = '/Users/alexrobinson/Projects/formbuilder/fb-ioj' // process.env.fbServiceStarterPath
    backgroundWindow.loadFile('background.html')
    backgroundWindow.webContents.openDevTools()
    backgroundWindow.on('closed', function () {
      backgroundWindow = null
    })
    // setTimeout(() => {
    //   backgroundWindow.close()
    // }, 15000)
    setTimeout(() => {
      const XPORT = process.env.XPORT
      let backgroundWindow2 = new BrowserWindow({width: 800, height: 600})
      backgroundWindow2.loadURL(`http://localhost:${XPORT}`)
      backgroundWindow2.on('closed', function () {
        backgroundWindow2 = null
      })
    }, 3000)
  }

  module.exports = makeBackgroundWindow