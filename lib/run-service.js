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

runLogger.log(`Starting "${SERVICE_NAME}" ...`)

const {pid} = exec(command, (e) => {
  if (e) {
    runLogger.error(`Starting "${SERVICE_NAME}" failed`, e)

    exec(`kill -s 9 ${pid}`, (e) => {
      if (e) {
        runLogger.error(`Killing "${SERVICE_NAME}" in process ${pid} failed`, e)
      }
    })
  }
})

runLogger.log(`     COMMAND:
${command}`)
runLogger.log('         PID: ', pid)
runLogger.log('SERVICE_NAME: ', SERVICE_NAME)
runLogger.log('SERVICE_PORT: ', Number(SERVICE_PORT))
runLogger.log('SERVICE_PATH: ', SERVICE_PATH)
