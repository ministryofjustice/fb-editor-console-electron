const {
  app
} = require('electron')

const {
  access,
  constants: {
    F_OK
  },
  readFile,
  writeFile
} = require('sacred-fs')

const logger = require('electron-timber')

const tokenFileLogger = logger.create({ name: 'Token File' })

const {
  encrypt,
  decrypt
} = require('./crypto')

let token

async function hasTokenFile () {
  try {
    await access(app.paths.token, F_OK)

    tokenFileLogger.log('Has a token file')
    return true
  } catch (e) {
    tokenFileLogger.error('Does not have a token file')
    return false
  }
}

async function encryptToken (token, password) {
  try {
    const buffer = Buffer.from(JSON.stringify({ token }))
    await writeFile(app.paths.token, encrypt(buffer, password))
    tokenFileLogger.log('Token encrypted')
  } catch ({ message }) {
    tokenFileLogger.error(message)

    throw new Error('Cannot encrypt token')
  }
}

async function decryptToken (password) {
  try {
    const buffer = await readFile(app.paths.token)
    const {
      token
    } = JSON.parse(decrypt(buffer, password).toString())
    tokenFileLogger.log('Token decrypted')
    return token
  } catch ({ message }) {
    tokenFileLogger.error(message)

    throw new Error('Cannot decrypt token')
  }
}

function hasToken () { return !!token }

function getToken () { return token }

function setToken (v) { token = v }

module.exports = {
  hasTokenFile,
  encryptToken,
  decryptToken,
  hasToken,
  getToken,
  setToken
}
