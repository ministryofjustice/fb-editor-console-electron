const Module = require('module')
const sinon = require('sinon')

const {
  _resolveFilename: resolveFilename
} = Module

Module._resolveFilename = function (modulePath, ...args) {
  if (modulePath === 'electron') return './test/.mock/electron.js'
  return resolveFilename.call(this, modulePath, ...args)
}

module.exports = {
  remote: {
    app: {
      isReady: sinon.stub().returns(true),
      store: {
        get () { return {} },
        set () { }
      }
    },
    getGlobal: sinon.stub().returns({
      remote: {
        app: {}
      }
    })
  }
}
