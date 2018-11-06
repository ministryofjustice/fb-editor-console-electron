const { exec } = require('child_process')

const {nvsPath, fbEditorPath, SERVICEDATA, XPORT} = process.env
console.log('BACKGOUND?', {nvsPath, fbEditorPath, SERVICEDATA, XPORT})
const child = exec(`. ${nvsPath}/nvs.sh && nvs use latest && cd ${fbEditorPath} && PORT=${XPORT} SERVICEDATA=${SERVICEDATA} npm start`, (err, stdout, stderr) => {})
console.log('pid', child.pid, 'port', XPORT, 'SERVICEDATA', SERVICEDATA)

console.log('BACKGOUND BOYZ!!!')

const doSummat = () => {
  window.alert('woo')
}

module.exports = {
  doSummat
}