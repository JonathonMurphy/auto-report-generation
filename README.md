# Automatic Report Generation

This script pulls a report from SalesForce, and drops it into a Google Sheets with just the touch of a button.

## Setup

* Clone repo
* Run npm install
* Run npm link - might have to run sudo npm link
* Create ./auth/creds.json
* Setup the config file with the Google Sheet ID, Sheet index, and Salesforce Report URL
* Share Google Sheet with the email from your creds.json file
* You can now enter 'createReport' from the command line to have your report automatically updated.

## Author

* Jonathon Seth Murphy

## License

This project is licensed under the ISC License
