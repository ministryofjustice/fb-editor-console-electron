const path = require('path')

const {
  readFile,
  writeFile
} = require('sacred-fs')

const {
  currentDir
} = require('~/build/paths')

const { version } = require('~/package')

const JAVASCRIPTS = /(assets\/javascripts\/app-).*(.js)/g
const STYLESHEETS = /(assets\/stylesheets\/settings-).*(.css)/g

const filePath = path.resolve(currentDir, 'settings.html')

const getFileData = async (filePath) => readFile(filePath, 'utf8')
const setFileData = async (filePath, fileData) => writeFile(filePath, fileData, 'utf8')

module.exports = async () => setFileData(filePath, (await getFileData(filePath)).replace(JAVASCRIPTS, `$1${version}$2`).replace(STYLESHEETS, `$1${version}$2`))
