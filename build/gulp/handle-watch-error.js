const path = require('path')

const {
  currentDir
} = require('~/build/paths')

module.exports = function ({
  code = 'No error code defined',
  message = 'No error message defined',
  filename: f,
  path: p
} = {}) {
  switch (code) {
    case 'EPERM':
      console.info(`A watched file or directory has invalid permissions: '${path.relative(currentDir, f || p)}'`)
      break
    case 'ENOENT':
      console.info(`A watched file or directory has been deleted: '${path.relative(currentDir, f || p)}'`)
      break
    default:
      console.error(`Watch error. ${code}: ${message}.`)
      break
  }
}
