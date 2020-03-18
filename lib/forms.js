const { remote: { app, app: { fileUploadComponentsMap } } } = require('electron')
const { ipcRenderer } = require('electron-better-ipc')
const logger = require('electron-timber')

const formsLogger = logger.create({ name: 'Forms' })

const {
  HAS_FOUND_FILE_UPLOAD,
  HAS_UPDATED_FILE_UPLOAD
} = require('./common/transform/file-upload')

const strings = {
  fileUpload: {
    status: {
      notFound: 'Up to date',
      hasFound: 'Update available',
      hasUpdated: 'Updated'
    }
  },
  status: {
    running: 'Running',
    starting: 'Starting',
    stopped: 'Not running'
  }
}

const userSettings = app.store.get('git') || {}

function hideElement (element) {
  element.style = 'display:none'
}

async function updateFileUploadComponentsInForm (service) {
  formsLogger.log(`Update file upload components in "${service}"`)
  try {
    await app.transformFileUploadComponentsInForm(service)
    await listServices()
  } catch ({ message }) {
    formsLogger.error(message)
  }
}

async function startForm (service) {
  formsLogger.log(`Start "${service}"`)
  try {
    await app.launchService(service)
    await listServices()
  } catch ({ message }) {
    formsLogger.error(message)
  }
}

async function stopForm (service) {
  formsLogger.log(`Stop "${service}"`)
  try {
    await app.stopService(service)
    await listServices()
  } catch ({ message }) {
    formsLogger.error(message)
  }
}

async function openForm (service) {
  formsLogger.log(`Open "${service}"`)
  try {
    await app.openService(service)
    await listServices()
  } catch ({ message }) {
    formsLogger.error(message)
  }
}

async function deleteForm (service) {
  if (confirm(`Are you sure you want to delete ${service}?`)) {
    formsLogger.log(`Delete "${service}"`)
    try {
      await app.deleteService(service)
      await app.displayNotification(`Deleted "${service}"`, { phase: 'Deleting form', dismiss: true })
      await listServices()
    } catch ({ message }) {
      formsLogger.error(message)
    }
  }
}

function reloadPage () {
  document.location.reload()
}

function getServiceStatus (services, service) {
  return (services[service].status || 'stopped').toLowerCase()
}

function isServiceRunning (services, service) {
  return getServiceStatus(services, service) === 'running'
}

function getServiceMessage (services, service) {
  const status = getServiceStatus(services, service)

  return strings.status[status]
}

function getFileUploadClassName (service) {
  switch (fileUploadComponentsMap.get(service)) {
    case HAS_FOUND_FILE_UPLOAD:
      return 'fileUploadStatus--has-found-file-upload'
    case HAS_UPDATED_FILE_UPLOAD:
      return 'fileUploadStatus--has-updated-file-upload'
    default:
      return 'fileUploadStatus--file-upload-not-found'
  }
}

function getServiceClassName (services, service) {
  const status = getServiceStatus(services, service)

  return `formStatus--${status}"`
}

function getFileUploadMessage (service) {
  switch (fileUploadComponentsMap.get(service)) {
    case HAS_FOUND_FILE_UPLOAD:
      return strings.fileUpload.status.hasFound
    case HAS_UPDATED_FILE_UPLOAD:
      return strings.fileUpload.status.hasUpdated
    default:
      return strings.fileUpload.status.notFound
  }
}

function hasFoundFileUploadComponents (service) {
  return fileUploadComponentsMap.get(service) === HAS_FOUND_FILE_UPLOAD
}

function createServiceStatusHtmlForFileUpload (service) {
  if (hasFoundFileUploadComponents(service)) {
    return (`
      <td class="govuk-table__cell">
        <span class="formStatus ${getFileUploadClassName(service)}">${getFileUploadMessage(service)}</span>
      </td>`
    )
  }

  return (`
    <td class="govuk-table__cell">
      <span class="formStatus ${getFileUploadClassName(service)}">${getFileUploadMessage(service)}</span>
    </td>`
  )
}

function createServiceStatusHtmlForAction (services, service) {
  return (`
    <td class="govuk-table__cell">
      <span class="formStatus ${getServiceClassName(services, service)}">${getServiceMessage(services, service)}</span>
    </td>
  `)
}

function createServiceActionHtml (services, service) {
  if (hasFoundFileUploadComponents(service)) {
    return (`
      <td class="govuk-table__cell cell-nowrap">
        <a href="#" class="govuk-link" onclick="updateFileUploadComponentsInForm('${service}')">Update</a>
      </td>`
    )
  }

  if (isServiceRunning(services, service)) {
    return (`
      <td class="govuk-table__cell cell-nowrap">
        <a href="#" class="govuk-link" onclick="stopForm('${service}')">Stop</a>
      </td>`
    )
  }

  return (`
    <td class="govuk-table__cell cell-nowrap">
      <a href="#" class="govuk-link" onclick="startForm('${service}')">Start</a>
    </td>`
  )
}

function reduceServiceList (services) {
  return function createServiceHtml (serviceHtml, service) {
    const isRunning = isServiceRunning(services, service)

    return (
      serviceHtml += `
      <tr class="govuk-table__row">
        <th class="govuk-table__header" scope="row">${service}</th>
        ${createServiceStatusHtmlForFileUpload(service)}
        ${createServiceStatusHtmlForAction(services, service)}
        ${createServiceActionHtml(services, service)}
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

if (userSettings.name) {
  hideElement(document.getElementById('formsInstructions'))
} else {
  hideElement(document.getElementById('servicesInstructions'))
}

module.exports = {
  updateFileUploadComponentsInForm,
  startForm,
  stopForm,
  openForm,
  deleteForm,
  reloadPage,
  listServices
}
