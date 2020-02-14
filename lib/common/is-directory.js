const {
  lstatSync
} = require('fs')

const isDirectory = (source) => lstatSync(source).isDirectory()

module.exports = isDirectory
