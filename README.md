# Automatic Report Generation

This script pulls a report from SalesForce, and drops it into a Google Sheets with just the touch of a button.

## Setup

* Clone repo
* npm install
* Create ./auth/creds.json
* Setup the config file with the Google Sheet ID and Salesforce Report URL
* Share Google Sheet with the email from your creds.json file
* Run node createReport.js
* Setup cronjobs to automatically update your data every X amount of time

## Author

* Jonathon Seth Murphy

## License

This project is licensed under the ISC License
