const {exec} = require('child_process')
const logger = require('electron-timber')
const {app} = require('./app')

const runLogger = logger.create({name: 'RunService'})

const {
  SERVICE_NAME,
  SERVICE_PATH,
  SERVICE_PORT
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
  PORT=${SERVICE_PORT} \\
  SERVICE_PATH="${SERVICE_PATH}" \\
  LOGDIR="${logs}" \\
  npm start
`

runLogger.log(command)

const {
  pid
} = exec(command, (e) => {
  if (e) {
    runLogger.error('Server failed', e)
  } else {
    runLogger.log('Server started')
  }
})

runLogger.log('pid: ', pid)
runLogger.log(`
  SERVICE_NAME: ${SERVICE_NAME}
  SERVICE_PORT: ${Number(SERVICE_PORT)}
  SERVICE_PATH: ${SERVICE_PATH}
`)
