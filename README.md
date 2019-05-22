# Automatic Report Generation

This script pulls a report from SalesForce, and drops it into a Google Sheets with just the touch of a button.

## Setup

* Clone repo
* Run npm install
* Run npm link - might have to run sudo npm link
* Create ./auth/creds.json
⋅⋅* Go to the [Google APIs Console.](https://console.developers.google.com/)
⋅⋅* Create a new project.
⋅⋅* Click Enable APIs and Services. Search for and enable the Google Drive API.
⋅⋅* Create credentials for a CLI Tool to access Application Data and the Google Sheets API.
⋅⋅* Name the service account and grant it a Project Role of Editor.
⋅⋅* Download the JSON file.
⋅⋅* Copy the JSON file to your auth directory and rename it to creds.json
* Rename config.blank.js to config.js
* Setup the config file with the Google Sheet ID, Sheet index, and Salesforce Report URL
* Share the Google Sheet with the email from your creds.json file
* You can now enter 'createReport' from the command line to have your report automatically updated.

## Author

* Jonathon Seth Murphy

## License

This project is licensed under the ISC License
