const { exec } = require('child_process')
const {app} = require('./app.js')

const {SERVICEDATA, SERVICEPORT} = process.env
const {nvs, editor} = app.paths
console.log('BACKGOUND?', {nvs, editor, SERVICEDATA, SERVICEPORT})
// const child = exec(`. ${nvsPath}/nvs.sh && nvs use latest && cd ${fbEditorPath} && PORT=${XPORT} SERVICEDATA=${SERVICEDATA} npm start`, (err, stdout, stderr) => {})
const child = exec(`. ${nvs}/nvs.sh && nvs use 10.11 && cd ${editor} && PORT=${SERVICEPORT} SERVICEDATA=${SERVICEDATA} npm start`, (err, stdout, stderr) => {
  if (err) {
    console.log('background server failed', err)
  }
})
console.log('pid', child.pid, 'port', SERVICEPORT, 'SERVICEDATA', SERVICEDATA)

console.log('BACKGOUND BOYZ!!!')

const doSummat = () => {
  window.alert('woo')
}

module.exports = {
  doSummat
}