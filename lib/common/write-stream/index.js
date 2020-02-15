const stripAnsi = require('strip-ansi')
const {
  createWriteStream
} = require('fs')

const isLogToFile = require('../is-log-to-file')

function getOutWriteStream (outStreamPath) {
  const outStream = createWriteStream(outStreamPath, { flags: 'a' })

  if (isLogToFile()) {
    const {
      write
    } = outStream

    outStream.write = (value) => write.call(outStream, stripAnsi(value))
  }

  return outStream
}

function getErrWriteStream (errStreamPath) {
  const errStream = createWriteStream(errStreamPath, { flags: 'a' })

  if (isLogToFile()) {
    const {
      write
    } = errStream

    errStream.write = (value) => write.call(errStream, stripAnsi(value))
  }

  return errStream
}

module.exports = {
  getOutWriteStream,
  getErrWriteStream
}
