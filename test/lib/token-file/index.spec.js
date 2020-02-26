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
const mockEncrypt = sinon.stub()
const mockDecrypt = sinon.stub()

const mockWriteFile = sinon.stub()
const mockReadFile = sinon.stub()

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
    readFile: mockReadFile,
    writeFile: mockWriteFile
  },
  electron: {
    app: {
      paths: {
        token: 'mock token path'
      }
    }
  },
  'electron-timber': timber,
  './crypto': {
    encrypt: mockEncrypt,
    decrypt: mockDecrypt
  }
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

        expect(mockAccess).to.be.calledWith('mock token path', 'mock okay')
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

  describe('`encryptToken()`', () => {
    const mockStringify = sinon.stub()
    const mockFrom = sinon.stub()
    const mockBuffer = {}

    const J = global.JSON
    const B = global.Buffer

    beforeEach(async () => {
      mockEncrypt.returns('mock encrypted token')
      mockStringify.returns('mock json')
      mockFrom.returns(mockBuffer)

      global.JSON = {
        stringify: mockStringify
      }

      global.Buffer = {
        from: mockFrom
      }

      await encryptToken('mock token', 'mock password')
    })

    afterEach(() => {
      delete global.JSON
      global.JSON = J

      delete global.Buffer
      global.Buffer = B
    })

    it('assigns the token to the `token` field of an object and serialises it to JSON', () => {
      expect(mockStringify).to.be.calledWith({ token: 'mock token' })
    })

    it('creates a buffer from the JSON', () => {
      expect(mockFrom).to.be.calledWith('mock json')
    })

    it('encrypts the token buffer', () => {
      expect(mockEncrypt).to.be.calledWith(mockBuffer, 'mock password')
    })

    it('writes the token file', () => {
      expect(mockWriteFile).to.be.calledWith('mock token path', 'mock encrypted token')
    })
  })

  describe('`decryptToken()`', () => {
    const mockReadFileBuffer = {}
    const mockDecryptBuffer = {
      toString: sinon.stub().returns('mock json')
    }
    const mockParse = sinon.stub()
    const mockFrom = sinon.stub()
    let returnValue

    const J = global.JSON
    const B = global.Buffer

    beforeEach(async () => {
      mockReadFile.returns(mockReadFileBuffer)
      mockDecrypt.returns(mockDecryptBuffer)
      mockParse.returns({ token: 'mock token' })

      global.JSON = {
        parse: mockParse
      }

      global.Buffer = {
        from: mockFrom
      }

      returnValue = await decryptToken('mock password')
    })

    afterEach(() => {
      delete global.JSON
      global.JSON = J

      delete global.Buffer
      global.Buffer = B
    })

    it('reads the token file', () => {
      expect(mockReadFile).to.be.calledWith('mock token path')
    })

    it('decrypts the file buffer', () => {
      expect(mockDecrypt).to.be.calledWith(mockReadFileBuffer, 'mock password')
    })

    it('deserialises the JSON to an object and destructures the `token` field', () => expect(mockParse).to.be.calledWith('mock json'))

    it('returns the token', () => expect(returnValue).to.equal('mock token'))
  })
})
