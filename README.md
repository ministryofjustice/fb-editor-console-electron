# fb-editor-console-electron

## Form Builder Console

Desktop application that allows users to run `Form Builder Editor` locally.

**NB. Currently Mac OS X only**


## Installation

The preferred way to install is through the MoJ's `Self Service` application.

Alternatively:

- download the latest release
- double-click the zip file to expand the app
- move the app (`Form Builder Console`) to the `Applications` directory

[Download](https://github.com/ministryofjustice/fb-editor-console-electron/releases)

## Usage

Double-click the app's icon.

The first time the Console app is run it will install the Editor and its dependencies

## Location of files

Form Builder Console creates a `formbuilder` directory in the user’s documents directory.

Within the `formbuilder` directory, it creates a `forms` directory.

On Mac OS X, the forms are located at `/Users/$USER/Documents/formbuilder/forms`

### Committing changes

The Console app does not currently provide a way to automatically commit and/or push your changes - you must use your own Git client.


## Building and publishing forms

Read about the `Form Builder Editor` and `Form Builder Publisher`

[User guide](https://fb-user-guide-dev.apps.cloud-platform-live-0.k8s.integration.dsd.io/)

## License

[MIT](LICENSE)
