const { remote: { app } } = require('electron')
const logger = require('electron-timber')

const { execSync } = require('child_process')

const runServiceLogger = logger.create({ name: 'RunService' })

runServiceLogger.log('Run Service is awake')

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

try {
  execSync(command)

  runServiceLogger.log(`     COMMAND:
  ${command}`)
  runServiceLogger.log('SERVICE_NAME: ', SERVICE_NAME)
  runServiceLogger.log('SERVICE_PORT: ', Number(SERVICE_PORT))
  runServiceLogger.log('SERVICE_PATH: ', SERVICE_PATH)

  runServiceLogger.log(`"${SERVICE_NAME}" started`)
} catch (e) {
  runServiceLogger.error(`"${SERVICE_NAME}" failed`)
}
