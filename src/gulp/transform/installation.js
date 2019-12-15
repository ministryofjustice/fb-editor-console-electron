require('@ministryofjustice/module-alias/register')

const path = require('path')

const {
  readFile,
  writeFile
} = require('sacred-fs')

const {
  currentDir
} = require('~/src/paths')

const {version} = require('~/package')

const JAVASCRIPTS = /(assets\/javascripts\/app)-.*(.js)/
const STYLESHEETS = /(assets\/stylesheets\/installation)-.*(.css)/

const filePath = path.resolve(currentDir, 'index.html')

const getFileData = async (filePath) => readFile(filePath, 'utf8')
const putFileData = async (filePath, fileData) => writeFile(filePath, fileData, 'utf8')

module.exports = async () => putFileData(filePath, (await getFileData(filePath)).replace(JAVASCRIPTS, `$1-${version}$2`).replace(STYLESHEETS, `$1-${version}$2`))
