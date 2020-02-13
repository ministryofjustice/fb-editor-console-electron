const proxyquire = require('proxyquire')
const chai = require('chai')

const {
  expect
} = chai

const {
  encrypt,
  decrypt
} = proxyquire('~/lib/token-file/crypto', {
  crypto: {}
})

describe('~/fb-editor-console-electron/lib/token-file/crypto', () => {
  describe('Always', () => {
    it('exports the `encrypt` function', () => expect(encrypt).to.be.a('function'))

    it('exports the `decrypt` function', () => expect(decrypt).to.be.a('function'))
  })
})
