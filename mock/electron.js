const Module = require('module')
const sinon = require('sinon')

const {
  _resolveFilename: resolveFilename
} = Module

Module._resolveFilename = function (modulePath, ...args) {
  if (modulePath === 'electron') return './mock/electron.js'
  return resolveFilename.call(this, modulePath, ...args)
}

module.exports = {
  remote: {
    app: {
      isReady: sinon.stub().returns(true),
      store: {
        get: sinon.stub().returns({}),
        set: sinon.stub()
      }
    },
    getGlobal: sinon.stub().returns({
      remote: {
        app: {}
      }
    })
  }
}
