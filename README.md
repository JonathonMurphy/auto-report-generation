# Automatic Report Generation

## No longer in development

¯\\\_(ツ)_/¯

So apparently theres a plugin for Google Sheets called [Data Connector for SalesForce](https://gsuite.google.com/marketplace/app/data_connector_for_salesforce/857627895310) that already does this. I am discontinuing development on this project.

## Description

This script pulls a report from SalesForce, and drops it into a Google Sheets with just the touch of a button.

## Setup

* Clone or Download repo.
* Cd into the Auto-Report-Generation directory
* Run npm install

  * Install [Node](https://nodejs.org/en/download/) if not already installed on your machine.

* Run npm link - might have to run sudo npm link

  * This will allow you to run the application from anywhere on the command line.

* Create ./auth/creds.json

  * Go to the [Google APIs Console](https://console.developers.google.com/).
  * Create a new project.
  * Click Enable APIs and Services. Search for and enable the Google Drive API.
  * Create credentials for a CLI Tool to access Application Data and the Google Sheets API.
  * Name the service account and grant it a Project Role of Editor.
  * Download the JSON file.
  * Copy the JSON file to your auth directory and rename it to creds.json

* Rename config.blank.js to config.js
* Setup the config file with the Google Sheet ID, Sheet index, Salesforce Report URL, etc.
* Share your Google Sheets with the client_email in your ./auth/creds.json file
* You can now enter 'updateReport' from the command line to have your report automatically updated.

## Command Line Flags

*  -v   output the version number
*  -a   updates all reports in the config file
*  -b   updates all reports with the "runInBulkUpdate" config setting set to true
*  -i   updates the report with the corresponding index number
*  -n   updates the report with the corresponding name in the config file
*  -g   updates all reports with specified groupName in the config file
*  -h   output usage information

## Next Milestone

* Add functionality to pull reports from additional sources ie; Talkdesk, Jira, Intercom, etc..

## Author

* Jonathon Seth Murphy

## License

This project is licensed under the MIT License.
