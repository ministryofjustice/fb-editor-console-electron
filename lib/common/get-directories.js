const {
  readdirSync
} = require('fs')

const path = require('path')

const isDirectory = require('./is-directory')

const getDirectories = (source) => readdirSync(source).map((name) => path.join(source, name)).filter(isDirectory).map((directory) => path.basename(directory))

module.exports = getDirectories
