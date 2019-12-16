# fb-editor-console-electron

## Form Builder Console

![Console app](images/console.png)

**Form Builder Console** is an Electron app for users to run `Form Builder Editor` locally.

(It's currently built for Mac OS X only. [Let us know](mailto:form-builder-team@digital.justice.gov.uk) if you would use it for a different OS.)

## Installation

The preferred way to install is through the MoJ's `Self Service` application.

Alternatively:

- Download the latest release
- Double-click the zip file to expand the app
- Move the `Form Builder Console` app to the `Applications` directory

[Releases are available to download from GitHub.](https://github.com/ministryofjustice/fb-editor-console-electron/releases)

## Usage

Double-click the app's icon. The first time it is run the app will install the Editor and its dependencies.

[Installation problems?](#installation-problems)

## Creating forms and committing changes

Forms are created as Git repositories which are cloned to your file system. The repositories contain JSON files which are updated as you make changes to the form in Editor.

(In Mac OS you can find the repositories in `/Users/$USER/Documents/formbuilder/forms`.)

**Form Builder Console** does not currently provide a way to _commit_ or _push_ those changes - you must use your own Git client.


## Installation problems

If you encounter a dialog window like this:

<img src="images/installation-blocked.png" alt="Running Console app blocked" width="300" style="max-width: 100%;">

- Open `System Preferences` and navigate to the `Security and Privacy` preferences pane
- Click on `Open Anyway`

<img src="images/security-pref-pane--open-anyway.jpg" alt="Open anyway from Security Preference Pane" width="600" style="max-width: 100%;">

The app is unsigned.

## License

[MIT](LICENSE)
