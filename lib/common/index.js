const {
  getServicePath,
  getServicePaths,
  getServiceName,
  getServiceNames
} = require('./get-services')
const isDirectory = require('./is-directory')
const isLogToFile = require('./is-log-to-file')
const isOpenTools = require('./is-open-tools')
const isProbablyFirstUse = require('./is-probably-first-use')

module.exports = {
  getServicePath,
  getServicePaths,
  getServiceName,
  getServiceNames,
  isDirectory,
  isLogToFile,
  isOpenTools,
  isProbablyFirstUse
}
