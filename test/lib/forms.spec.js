const betterIpc = require('~/mock/electron-better-ipc')
const timber = require('~/mock/electron-timber')

const proxyquire = require('proxyquire')
const sinon = require('sinon')
const chai = require('chai')

const {
  expect
} = chai

global.document = {
  getElementById: sinon.stub().returns({})
}

const {
  startForm,
  stopForm,
  openForm,
  deleteForm,
  reloadPage,
  listServices
} = proxyquire('~/lib/forms', {
  'electron-better-ipc': betterIpc,
  'electron-timber': timber,
  electron: {
    remote: {
      app: {
        store: {
          get: sinon.stub().returns({}),
          set: sinon.stub()
        }
      }
    }
  }
})

describe('~/fb-editor-console-electron/lib/forms', () => {
  before(() => {
    global.document = {
      getElementById: sinon.stub().returns({})
    }
  })

  after(() => {
    delete global.document
  })

  describe('Always', () => {
    it('exports the `startForm` function', () => expect(startForm).to.be.a('function'))

    it('exports the `stopForm` function', () => expect(stopForm).to.be.a('function'))

    it('exports the `openForm` function', () => expect(openForm).to.be.a('function'))

    it('exports the `deleteForm` function', () => expect(deleteForm).to.be.a('function'))

    it('exports the `reloadPage` function', () => expect(reloadPage).to.be.a('function'))

    it('exports the `listServices` function', () => expect(listServices).to.be.a('function'))
  })
})
