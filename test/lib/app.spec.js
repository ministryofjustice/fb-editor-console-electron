const proxyquire = require('proxyquire')

const chai = require('chai')

const {
  expect
} = chai

const {
  app,
  remote
} = proxyquire('~/lib/app', {
  electron: {
    remote: {
      app: {}
    }
  }
})

describe('~/fb-editor-console-electron/lib/app', () => {
  describe('Always', () => {
    it('exports the `app` object', () => expect(app).to.be.an('object'))

    it('exports the `remote` object', () => expect(remote).to.be.an('object'))
  })
})
