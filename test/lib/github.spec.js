const timber = require('~/mock/electron-timber')

const proxyquire = require('proxyquire')
const sinon = require('sinon')
const chai = require('chai')

const {
  expect
} = chai

const {
  cloneGitHubRepository,
  initialiseRepository,
  initialiseRepositoryWithRemote
} = proxyquire('~/lib/github', {
  path: {},
  pathExists: {},
  rimraf: {},
  'glob-all': {},
  request: {},
  git: {},
  './common': {
    isDirectory: sinon.stub()
  },
  '~/package': {
    version: 'mock version'
  },
  'electron-timber': timber,
  electron: {
    app: {}
  }
})

describe('~/fb-editor-console-electron/lib/github', () => {
  describe('Always', () => {
    it('exports the `cloneGitHubRepository` function', () => expect(cloneGitHubRepository).to.be.a('function'))

    it('exports the `initialiseRepository` function', () => expect(initialiseRepository).to.be.a('function'))

    it('exports the `initialiseRepositoryWithRemote` function', () => expect(initialiseRepositoryWithRemote).to.be.a('function'))
  })
})
