const { exec } = require('child_process')
const makeBackgroundWindow = require('./make-background-window')
const {remote} = require('electron')
const {app} = remote

const {nvsPath, fbEditorPath, fbServiceStarterPath} = process.env
const XPORT = 5002
console.log('BACKGOUND?')
// exec(`. ${nvsPath}/nvs.sh && nvs use latest && cd ${fbEditorPath} && PORT=${XPORT} SERVICEDATA=${fbServiceStarterPath} npm start`, (err, stdout, stderr) => {})

module.exports = {
  makeBackgroundWindow,
  remote,
  app
}