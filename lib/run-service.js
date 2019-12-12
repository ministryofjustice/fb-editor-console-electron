const {exec} = require('child_process')
const logger = require('electron-timber')
const {app} = require('./app')

const runLogger = logger.create({name: 'RunService'})

const {
  SERVICE_PATH,
  SERVICEPORT
} = process.env

const {
  nvs,
  editor,
  logs
} = app.paths

const command = `
  . "${nvs}/nvs.sh" && \\
  nvs add 12.4.0 && \\
  nvs use 12.4.0 && \\
  cd "${editor}" && \\
  PORT=${SERVICEPORT} \\
  SERVICE_PATH="${SERVICE_PATH}" \\
  LOGDIR="${logs}" \\
  npm start
`

runLogger.log(command)

const child = exec(command, (e) => {
  if (e) runLogger.log('background server failed', e)
})

runLogger.log('pid', child.pid, 'port', SERVICEPORT, 'SERVICE_PATH', SERVICE_PATH)
