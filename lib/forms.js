const {ipcRenderer} = require('electron-better-ipc')
const logger = require('electron-timber')
const {app} = require('./app')

const formsLogger = logger.create({name: 'Forms'})

function hideElement (element) {
  element.style = 'display:none'
}

const gitSettings = app.store.get('git') || {}

if (gitSettings.name) {
  hideElement(document.getElementById('formsInstructions'))
} else {
  hideElement(document.getElementById('servicesInstructions'))
}

async function startForm (service) {
  try {
    await app.launchService(service)
    await listServices()
  } catch (e) {
    formsLogger.error(e)
  }
}

async function stopForm (service) {
  try {
    await app.stopService(service)
    await listServices()
  } catch (e) {
    formsLogger.error(e)
  }
}

async function openForm (service) {
  try {
    await app.openService(service)
    await listServices()
  } catch (e) {
    formsLogger.error(e)
  }
}

async function deleteForm (service) {
  if (confirm(`Are you sure you want to delete ${service}?`)) {
    try {
      await app.deleteService(service)
      app.notify(`Deleted ${service}`, {phase: 'Deleting form', dismiss: true})
      await listServices()
    } catch (e) {
      formsLogger.error(e)
    }
  }
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

function reduceServiceList (services) {
  return function createServiceHtml (serviceHtml, service) {
    const serviceStatus = services[service].status || 'stopped'
    const statusMessage = strings.status[serviceStatus]
    const isRunning = serviceStatus === 'running'

    return (
      serviceHtml += `
      <tr class="govuk-table__row">
        <th class="govuk-table__header" scope="row">${service}</th>
        <td class="govuk-table__cell">
          <span class="formStatus formStatus--${serviceStatus}">${statusMessage}</span>
        </td>
        <td class="govuk-table__cell cell-nowrap">
          <a href="#" class="govuk-link${isRunning ? ' hidden' : ''}" onclick="startForm('${service}')">Start</a>
          <a href="#" class="govuk-link${isRunning ? '' : ' hidden'}" onclick="stopForm('${service}')">Stop</a>
        </td>
        <td class="govuk-table__cell">
          <a href="#" class="govuk-link${isRunning ? '' : ' invisible'}" onclick="openForm('${service}')">Open in browser</a>
        </td>
        <td class="govuk-table__cell">
          <a href="#" class="govuk-link" onclick="deleteForm('${service}')">Delete</a>
        </td>
      </tr>
    `)
  }
}

async function listServices (openService) {
  const services = await ipcRenderer.callMain('getServices')
  const serviceList = Object.keys(services)

  if (!serviceList.length) {
    hideElement(document.getElementById('services'))
    return
  }

  hideElement(document.getElementById('servicesInstructions'))

  serviceList.forEach((service) => {
    if (service === openService) {
      setTimeout(() => {
        openForm(service)
      }, 1000)
    }
  })

  const serviceHtml = serviceList.reduce(reduceServiceList(services), '')

  document.getElementById('services').innerHTML = serviceHtml
}

module.exports = {
  startForm,
  stopForm,
  openForm,
  deleteForm,
  reloadPage,
  listServices
}
