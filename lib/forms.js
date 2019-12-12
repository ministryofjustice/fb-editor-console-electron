const {ipcRenderer} = require('electron-better-ipc')
const {app} = require('./app')

function hideElement ($el) {
  $el.style = 'display:none'
}

// let services = app.services
const $services = document.getElementById('services')
const $servicesInstructions = document.getElementById('servicesInstructions')

const gitSettings = app.store.get('git') || {}
if (gitSettings.name) {
  const $formsInstructions = document.getElementById('formsInstructions')
  hideElement($formsInstructions)
} else {
  hideElement($servicesInstructions)
}

async function startForm (service) {
  try {
    await app.launchService(service)
    listServices()
  } catch (e) {
    //
  }
}

async function stopForm (service) {
  try {
    await app.stopService(service)
    listServices()
  } catch (e) {
    //
  }
}

async function restartForm (service) {
  /*
  try {
    await app.restartService(service)
    listServices()
  } catch (e) {
    //
  } */
}

async function openForm (service) {
  try {
    await app.openService(service)
  } catch (e) {
    //
  }
}

async function deleteForm (service) {
  if (!confirm(`Are you sure you want to delete ${service}?`)) {
    return
  }

  try {
    await app.deleteService(service)
    app.notify(`Deleted ${service}`, {phase: 'Deleting form', dismiss: true})
    listServices()
  } catch (e) {
    //
  }
}

async function archiveForm (service) {
  /*
  try {
    await app.archiveService(service)
    listServices()
  } catch (e) {
    //
  } */
}

function reloadPage () {
  document.location.reload()
}

const strings = {
  status: {
    running: 'Running',
    starting: 'Starting',
    stopped: 'Not running'
  }
}

async function listServices (openService) {
  const services = await ipcRenderer.callMain('getServices')
  const serviceList = Object.keys(services)

  if (!serviceList.length) {
    hideElement($services)
    return
  }

  hideElement($servicesInstructions)

  let output = ''
  serviceList.forEach(service => {
    const serviceStatus = services[service].status || 'stopped'
    // await ipcRenderer.callMain('getServiceStatus', service)
    const running = serviceStatus === 'running'
    const status = strings.status[serviceStatus]
    output += `
      <tr class="govuk-table__row">
        <th class="govuk-table__header" scope="row">${service}</th>
        <td class="govuk-table__cell">
        <span class="formStatus formStatus--${serviceStatus}">${status}</span>
        </td>
        <td class="govuk-table__cell cell-nowrap">
        <a href="#" class="govuk-link${running ? ' hidden' : ''}" onclick="startForm('${service}')">Start</a>
        <a href="#" class="govuk-link${!running ? ' hidden' : ''}" onclick="stopForm('${service}')">Stop</a>
        <!-- <a href="#" class="govuk-link${!running ? ' hidden' : ''}" onclick="restartForm('${service}')">Restart</a> -->
        </td>
        <td class="govuk-table__cell"><a href="#" class="govuk-link${!running ? ' invisible' : ''}" onclick="openForm('${service}')">Open in browser</a></td>
        <td class="govuk-table__cell"><a href="#" class="govuk-link" onclick="deleteForm('${service}')">Delete</a></td>
      </tr>
    `
    if (service === openService) {
      setTimeout(() => {
        openForm(service)
      }, 1000)
    }
  })

  $services.innerHTML = output
}

module.exports = {
  startForm,
  stopForm,
  restartForm,
  openForm,
  deleteForm,
  archiveForm,
  reloadPage,
  listServices
}
