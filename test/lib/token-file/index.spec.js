const timber = require('~/mock/electron-timber')

const proxyquire = require('proxyquire')
const chai = require('chai')

const {
  expect
} = chai

const {
  hasTokenFile,
  encryptToken,
  decryptToken,
  hasToken,
  getToken,
  setToken
} = proxyquire('~/lib/token-file', {
  'sacred-fs': {
    access: {},
    constants: {
      F_OK: 0
    },
    readFile: {},
    writeFile: {}
  },
  'electron-timber': timber,
  './crypto': {}
})

describe('~/fb-editor-console-electron/lib/token-file', () => {
  describe('Always', () => {
    it('exports the `hasTokenFile` function', () => expect(hasTokenFile).to.be.a('function'))

    it('exports the `encryptToken` function', () => expect(encryptToken).to.be.a('function'))

    it('exports the `decryptToken` function', () => expect(decryptToken).to.be.a('function'))

    it('exports the `hasToken` function', () => expect(hasToken).to.be.a('function'))

    it('exports the `getToken` function', () => expect(getToken).to.be.a('function'))

    it('exports the `setToken` function', () => expect(setToken).to.be.a('function'))
  })
})
