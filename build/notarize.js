const {
  notarize
} = require('electron-notarize')

const {
  env: {
    ELECTRON_NOTARIZE_PRIMARY_BUNDLE_ID,
    ELECTRON_NOTARIZE_USERNAME,
    ELECTRON_NOTARIZE_PASSWORD
  }
} = process

exports.default = async function (context) {
  const {
    electronPlatformName
  } = context

  if (electronPlatformName === 'darwin') {
    const {
      appOutDir,
      packager: {
        appInfo: {
          productFilename
        }
      }
    } = context

    return notarize({
      appBundleId: ELECTRON_NOTARIZE_PRIMARY_BUNDLE_ID,
      appPath: `${appOutDir}/${productFilename}.app`,
      appleId: ELECTRON_NOTARIZE_USERNAME,
      appleIdPassword: ELECTRON_NOTARIZE_PASSWORD
    })
  }
}
