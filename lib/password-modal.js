const { app } = require('./app')

document.getElementById('submitPassword').addEventListener( "click", e => {
  const {
    windows: {
      passwordModal
    }
  } = app

  passwordModal.hide()
})
