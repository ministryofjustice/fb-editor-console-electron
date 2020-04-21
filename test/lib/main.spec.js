const betterIpc = require('~/mock/electron-better-ipc')
const timber = require('~/mock/electron-timber')

const proxyquire = require('proxyquire')
const chai = require('chai')

const {
  expect
} = chai

const {
  getNotificationWindow,
  getInstallationWindow,
  getMainWindow,
  createNotificationWindow,
  createInstallationWindow,
  createRunServiceWindow,
  createMainWindow,
  confirmServiceIsRunning,
  getPidsForPort,
  hasPort,
  getPort,
  setPort,
  clearPortFor,
  install,
  displayNotification,
  dismissNotification,
  executeInstallation,
  updateEditor,
  installEditor,
  installEditorDependencies
} = proxyquire('~/lib/main', {
  './template': {},
  './common': {},
  'request-promise-native': {},
  'selective-whitespace': {},
  child_process: {},
  'electron-timber': timber,
  'electron-better-ipc': betterIpc,
  electron: {
    app: {},
    BrowserWindow: {},
    Menu: {}
  }
})

describe('~/fb-editor-console-electron/lib/main', () => {
  describe('Always', () => {
    it('exports the `getNotificationWindow` function', () => expect(getNotificationWindow).to.be.a('function'))

    it('exports the `getInstallationWindow` function', () => expect(getInstallationWindow).to.be.a('function'))

    it('exports the `getMainWindow` function', () => expect(getMainWindow).to.be.a('function'))

    it('exports the `createNotificationWindow` function', () => expect(createNotificationWindow).to.be.a('function'))

    it('exports the `createInstallationWindow` function', () => expect(createInstallationWindow).to.be.a('function'))

    it('exports the `createMainWindow` function', () => expect(createMainWindow).to.be.a('function'))

    it('exports the `createRunServiceWindow` function', () => expect(createRunServiceWindow).to.be.a('function'))

    it('exports the `confirmServiceIsRunning` function', () => expect(confirmServiceIsRunning).to.be.a('function'))

    it('exports the `getPidsForPort` function', () => expect(getPidsForPort).to.be.a('function'))

    it('exports the `hasPort` function', () => expect(hasPort).to.be.a('function'))

    it('exports the `getPort` function', () => expect(getPort).to.be.a('function'))

    it('exports the `setPort` function', () => expect(setPort).to.be.a('function'))

    it('exports the `clearPortFor` function', () => expect(clearPortFor).to.be.a('function'))

    it('exports the `install` function', () => expect(install).to.be.a('function'))

    it('exports the `displayNotification` function', () => expect(displayNotification).to.be.a('function'))

    it('exports the `dismissNotification` function', () => expect(dismissNotification).to.be.a('function'))

    it('exports the `executeInstallation` function', () => expect(executeInstallation).to.be.a('function'))

    it('exports the `updateEditor` function', () => expect(updateEditor).to.be.a('function'))

    it('exports the `installEditor` function', () => expect(installEditor).to.be.a('function'))

    it('exports the `installEditorDependencies` function', () => expect(installEditorDependencies).to.be.a('function'))
  })
})
