const timber = require('~/mock/electron-timber')

const proxyquire = require('proxyquire')
const sinon = require('sinon')
const chai = require('chai')
const sinonChai = require('sinon-chai')

chai.use(sinonChai)

const {
  expect
} = chai

const mockAccess = sinon.stub()

const {
  hasTokenFile,
  encryptToken,
  decryptToken,
  hasToken,
  getToken,
  setToken
} = proxyquire('~/lib/token-file', {
  'sacred-fs': {
    access: mockAccess,
    constants: {
      F_OK: 'mock okay'
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

  describe('`hasTokenFile()`', () => {
    afterEach(() => {
      mockAccess.resetHistory()
    })

    describe('Always', () => {
      it('invokes `access`', () => {
        hasTokenFile()

        expect(mockAccess).to.be.calledWith('./.token', 'mock okay')
      })
    })

    describe('A token file exists', () => {
      it('returns true', async () => expect(await hasTokenFile()).to.be.true)
    })

    describe('A token file does not exist', () => {
      it('returns false', async () => {
        mockAccess.throws()

        return expect(await hasTokenFile()).to.be.false
      })
    })
  })
})
