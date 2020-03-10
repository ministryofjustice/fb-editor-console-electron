const stripAnsi = require('strip-ansi')
const {
  createWriteStream
} = require('fs')

const isLogToFile = require('../is-log-to-file')

function getWriteStream (filePath) {
  const writeStream = createWriteStream(filePath, { flags: 'a' })

  if (isLogToFile()) {
    const {
      write
    } = writeStream

    writeStream.write = (value) => write.call(writeStream, stripAnsi(value))
  }

  return writeStream
}

module.exports = {
  getWriteStream
}
