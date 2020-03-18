const {
  readdirSync
} = require('fs')

const path = require('path')

const isDirectory = require('./is-directory')

const getServicePath = (services, serviceName) => path.join(services, serviceName)
const getServicePaths = (services) => readdirSync(services).map((serviceName) => getServicePath(services, serviceName)).filter(isDirectory)
const getServiceName = (directory) => path.basename(directory)
const getServiceNames = (services) => getServicePaths(services).map(getServiceName)

module.exports = {
  getServicePath,
  getServicePaths,
  getServiceName,
  getServiceNames
}
