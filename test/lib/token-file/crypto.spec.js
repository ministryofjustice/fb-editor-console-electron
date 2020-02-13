const proxyquire = require('proxyquire')
const sinon = require('sinon')
const chai = require('chai')
const sinonChai = require('sinon-chai')
chai.use(sinonChai)

const {
  expect
} = chai

const mockCipher = {
  update: sinon.stub(),
  final: sinon.stub()
}

// const mockSubstr = sinon.stub()

const mockDigest = {
  substr: sinon.stub() // .returns(mockSubstr)
}

const mockUpdate = {
  digest: sinon.stub().returns(mockDigest)
}

const mockHash = {
  update: sinon.stub().returns(mockUpdate)
}

const mockCrypto = {
  randomBytes: sinon.stub(),
  createCipheriv: sinon.stub().returns(mockCipher),
  createHash: sinon.stub().returns(mockHash)
}

const {
  encrypt,
  decrypt
} = proxyquire('~/lib/token-file/crypto', {
  crypto: mockCrypto
})

describe('~/fb-editor-console-electron/lib/token-file/crypto', () => {
  describe('Always', () => {
    it('exports the `encrypt` function', () => expect(encrypt).to.be.a('function'))

    it('exports the `decrypt` function', () => expect(decrypt).to.be.a('function'))
  })

  describe('`encrypt()`', () => {
    const mockBuffer = {}
    const mockReturnValue = {}
    const mockConcat = sinon.stub().returns(mockReturnValue)
    let returnValue

    beforeEach(() => {
      global.Buffer = {
        concat: mockConcat
      }

      mockCrypto.randomBytes.returns('mock iv')
      mockDigest.substr.returns('mock hash key')
      mockCipher.update.returns('mock cipher update')
      mockCipher.final.returns('mock cipher final')
    })

    afterEach(() => {
      delete global.Buffer

      mockCrypto.randomBytes.resetHistory()
      mockCrypto.createCipheriv.resetHistory()
      mockCrypto.createHash.resetHistory()
      mockHash.update.resetHistory()
      mockUpdate.digest.resetHistory()
      mockDigest.substr.resetHistory()
      mockCipher.update.resetHistory()
      mockCipher.final.resetHistory()
    })

    describe('Always', () => {
      beforeEach(() => {
        returnValue = encrypt(mockBuffer, 'mock key')
      })

      it('gets the hash key', () => {
        expect(mockCrypto.createHash).to.have.been.calledWith('sha256')
        expect(mockHash.update).to.have.been.calledWith('mock key')
        expect(mockUpdate.digest).to.have.been.calledWith('base64')
        expect(mockDigest.substr).to.have.been.calledWith(0, 32)
      })

      it('creates an initialisation vector', () => {
        expect(mockCrypto.randomBytes).to.be.calledWith(16)
      })

      it('returns a Buffer', () => {
        expect(mockConcat).to.have.been.calledWith(['mock iv', 'mock cipher update', 'mock cipher final'])

        expect(returnValue).to.equal(mockReturnValue)
      })
    })

    describe('With an algorithm', () => {
      beforeEach(() => {
        returnValue = encrypt(mockBuffer, 'mock key', 'mock algorithm')
      })

      it('creates a cipher initialisation vector', () => {
        expect(mockCrypto.createCipheriv).to.be.calledWith('mock algorithm', 'mock hash key', 'mock iv')
      })
    })

    describe('Without an algorithm', () => {
      beforeEach(() => {
        returnValue = encrypt(mockBuffer, 'mock key')
      })

      it('creates a cipher initialisation vector with the default algorithm', () => {
        expect(mockCrypto.createCipheriv).to.be.calledWith('aes-256-ctr', 'mock hash key', 'mock iv')
      })
    })
  })
})
