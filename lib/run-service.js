const {exec} = require('child_process')
const logger = require('electron-timber')
const {app} = require('./app')

const runServiceLogger = logger.create({name: 'RunService'})

const {
  SERVICE_NAME,
  SERVICE_PATH,
  SERVICE_PORT
} = process.env

const {
  paths: {
    nvs,
    editor,
    logs
  }
} = app

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

runServiceLogger.log(`Starting "${SERVICE_NAME}" ...`)

const {pid} = exec(command, (e) => {
  if (e) {
    runServiceLogger.error(`Starting "${SERVICE_NAME}" failed`, e)

    exec(`kill -s 9 ${pid}`, (e) => {
      if (e) {
        runServiceLogger.error(`Killing "${SERVICE_NAME}" in process ${pid} failed`, e)
      }
    })
  }
})

runServiceLogger.log(`     COMMAND:
${command}`)
runServiceLogger.log('         PID: ', pid)
runServiceLogger.log('SERVICE_NAME: ', SERVICE_NAME)
runServiceLogger.log('SERVICE_PORT: ', Number(SERVICE_PORT))
runServiceLogger.log('SERVICE_PATH: ', SERVICE_PATH)
