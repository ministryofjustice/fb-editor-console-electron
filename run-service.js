const { exec } = require('child_process')
const {app} = require('./app.js')

const {SERVICEDATA, SERVICEPORT} = process.env
const {nvs, editor, logs} = app.paths

// const child = exec(`. ${nvsPath}/nvs.sh && nvs use latest && cd ${fbEditorPath} && PORT=${XPORT} SERVICEDATA=${SERVICEDATA} npm start`, (err, stdout, stderr) => {})
const child = exec(`. ${nvs}/nvs.sh && nvs use 10.11 && cd ${editor} && PORT=${SERVICEPORT} SERVICEDATA='${SERVICEDATA}' LOGDIR='${logs}' npm start`, (err, stdout, stderr) => {
  if (err) {
    console.log('background server failed', err)
  }
})
console.log('pid', child.pid, 'port', SERVICEPORT, 'SERVICEDATA', SERVICEDATA)

module.exports = {}