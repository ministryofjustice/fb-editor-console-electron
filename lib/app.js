const { remote } = require('electron')
const { app, BrowserWindow } = remote

module.exports = {
  remote,
  app,
  BrowserWindow
}
