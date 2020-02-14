require('~/mock/electron')

process.versions = Object.assign(process.versions, { chrome: 'Mock Chrome' })

module.exports = {
  create () {
    return {
      log () { },
      error () { }
    }
  }
}
