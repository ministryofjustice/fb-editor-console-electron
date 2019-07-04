const {exec} = require('child_process')
const {app} = require('./app.js')

const logger = require('electron-timber')
const runLogger = logger.create({name: 'RunService'})

const {SERVICE_PATH, SERVICEPORT} = process.env
const {nvs, editor, logs} = app.paths

runLogger.log(`. ${nvs}/nvs.sh && nvs use 12.4.0 && cd ${editor} && PORT=${SERVICEPORT} SERVICE_PATH='${SERVICE_PATH}' LOGDIR='${logs}' npm start`)
const child = exec(`. ${nvs}/nvs.sh && nvs use 12.4.0 && cd ${editor} && PORT=${SERVICEPORT} SERVICE_PATH='${SERVICE_PATH}' LOGDIR='${logs}' npm start`, (err, stdout, stderr) => {
  if (err) {
    runLogger.log('background server failed', err)
  }
})
runLogger.log('pid', child.pid, 'port', SERVICEPORT, 'SERVICE_PATH', SERVICE_PATH)

module.exports = {}
