const pathExists = require('path-exists')

const isProbablyFirstUse = ({ paths: { nvs, editor } } = {}) => !(pathExists.sync(nvs) && pathExists.sync(editor))

module.exports = isProbablyFirstUse
