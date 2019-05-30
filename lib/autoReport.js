#!/usr/bin/env node
'use strict';
const fs = require('fs'),
      prompt = require('prompt'), // Prompts for users Okta credentials
      { promisify } = require('util'),
      puppeteer = require('puppeteer'), // Headless browser
      GoogleSpreadsheet = require('google-spreadsheet'); // Google spreadsheet API wrapper


async function oktaAuth (browser) {
  console.log('Starting oktaAuth script');
  const oktaUrl = 'https://amplify.okta.com/app/UserHome#';
  // Loads credentials
  let user = '', // Enter you email here to hardcode Okta login credentials
      pass = ''; // Enter you password here to hardcode Okta login credentials
  // Prompt schema
  const schema = {
    properties: {
      email: {
        description: 'Email',
        type: 'string',
        message: 'Enter your Amplify email address',
        required: true
      },
      password: {
        description: 'Password',
        type: 'string',
        message: 'Enter your Okta password',
        hidden: true,
        required: true
      }
    }
  };
  // Start the prompt
  prompt.start();
  const okta = await browser.newPage();
  await okta.goto(oktaUrl);
  const usernameForm = await okta.$('#okta-signin-username'),
        passwordForm = await okta.$('#okta-signin-password');
  async function login() {
    // Async implementation of the prompt module

    /* Comment out this section to remove credentials request */
    // \/
    await promisify(prompt.get)(schema)
    .then(result => {
      console.log('Credentials received.');
      user = result.email;
      pass = result.password;
    })
    .catch(err => {
      throw err;
    });
    // /\
    /* Comment out this section to remove credentials request */

    // Clears previouly entered credentials
    await usernameForm.click({clickCount: 3});
    await usernameForm.press('Backspace');
    await passwordForm.click({clickCount: 3});
    await passwordForm.press('Backspace');
    // Login Page
    // Enter username and password into respective fields
      // #okta-signin-username
      // #okta-signin-password
    await okta.type('#okta-signin-username', user, 17);
    await okta.type('#okta-signin-password', pass, 17);
    console.log('Validating credentials...');
    await Promise.all([
      // #okta-signin-submit
      okta.click('#okta-signin-submit'),
      // Error catching section for when the authentiation fails.
      okta.waitForResponse('https://amplify.okta.com/api/v1/authn')
      .then(response => {
        if (response.status() === 401) {
          console.error('Invalid email address or password');
          login();
        } else {
          prompt.stop();
          console.log('Credentials accepted.');
        }
      })
      .catch(),
      okta.waitForNavigation({timeout: 0, waitUntil: 'networkidle0'})
      .then()
      .catch()
    ])
  };
  await login();
  // Send Push page
    // "Send Push"
      // button .button-primary
  console.log('Waiting on Okta multi-factor authentication...');
  await Promise.all([
    okta.waitForSelector('[class="button button-primary"]', {visible: true}),
    okta.waitFor(1500),
    okta.click('[class="button button-primary"]'),
    okta.waitForNavigation({timeout: 0, waitUntil: 'networkidle0'})
  ])
  .then(() => {
    console.log('Authentication recieved.');
  })
  .catch();
  // Get cookies
  const cookies = await okta.cookies();
  module.exports.cookies = cookies;
  };

async function downloadSalesForceReport (config, browser, cookies, reportsPath) {
  // Open new tab, set cookies, and navigate to SalesForce Report
    // Reminder: Must first navigate to the Okta redirect page
  const salesForceUrl = 'https://amplify.okta.com/home/salesforce/0oa1nsexw1ZevYiep2p7/46?fromHome=true'; // Talkdesk page. Okta Redirect Page
  const salesForce = await browser.newPage();
  await salesForce._client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: reportsPath
  });
  await salesForce.setCookie(...cookies);
  await Promise.all([
    salesForce.goto(salesForceUrl),
    salesForce.waitForNavigation({ waitUntil: 'networkidle0' })
  ]);
  await Promise.all([
    salesForce.goto(config.salesForceReport),
    salesForce.waitForNavigation({ waitUntil: 'networkidle0' })
  ]);
// Export Report
  // Export Details button
    // <input value="Export Details" class="btn" name="csvsetup" title="Export Details" type="submit">
  await Promise.all([
    salesForce.click('[value="Export Details"]'),
    salesForce.waitForNavigation({ waitUntil: 'networkidle0' })
  ]);
  // Format Option Dropdown
    // <select id="xf" name="xf">
    // <option value="localecsv">Comma Delimited .csv</option>
    // <option value="xls" selected="selected">Excel Format .xls</option>
    // </select>
  await salesForce.select('#xf', '[value="localecsv"]'); // Error: Node is either not visible or not an HTMLelement
  // Second Export button on following page
    //  <input value="Export" class="btn" name="export" title="Export" type="submit">
  // Downloads report.
  console.log('Downloading report.');
  await salesForce.click('[value="Export"]');
};

async function updateSpreadsheet(config, browser, creds, entries) {
  const regexDoubleQuotes = /\"/g; // Removes the double quotes from around the values in the resulting array
  // Grabs the apllicable Google sheet. Pulls from ./config/config.js
  const doc = new GoogleSpreadsheet(config.spreadsheetID);
  await promisify(doc.useServiceAccountAuth)(creds);
  const info = await promisify(doc.getInfo)();
  const sheet = info.worksheets[config.pageIndex];
  // Get the cells from the sheet that have data in them
  const oldCells = await promisify(sheet.getCells)({
    'min row': 1,
    'max-row': sheet.rowCount,
    'min-col': 1,
    'max-col': sheet.colCount,
    'return-empty': false
  });
  console.log('Removing stale data from sheet.')
  for (let i = 0; i < oldCells.length; i++) {
    // Removes the old data
    oldCells[i].value = '';
  };
  sheet.bulkUpdateCells(oldCells);
  // Get the cells in the spreadsheet that are to be worked on
  // TODO: Get the first empty row of the spread sheet / override
  // all contect that is currently in the selected sheet.page
  const cells = await promisify(sheet.getCells)({
    'min row': 1,
    'max-row': entries.length,
    'min-col': 1,
    'max-col': entries[0].length,
    'return-empty': true
  });
  // Loops through all the cells and assigns the data from the
  // Salesforce report in sequential order
  console.log('Inputting into Google Sheets...')
  for (let i = 0; i < entries.length; i++) { // Goes down the rows
    for ( let j = 0; j < entries[i].length; j++) { // Goes across the columns
      let k = (i * entries[i].length) + j;
      cells[k].value = entries[i][j].replace(regexDoubleQuotes, '');
    }
  }
  sheet.bulkUpdateCells(cells, function () {
    process.exit();
  });
};

module.exports.oktaAuth = oktaAuth;
module.exports.downloadSalesForceReport = downloadSalesForceReport;
module.exports.updateSpreadsheet = updateSpreadsheet;
