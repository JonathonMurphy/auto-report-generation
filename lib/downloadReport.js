#!/usr/bin/env node
'use strict';
console.log('Loading please wait...');
// Module Setup
const puppeteer = require('puppeteer'), // Headless browser
      { promisify } = require('util'),
      chokidar = require('chokidar'), // A better file watcher
      prompt = require('prompt'), // Prompts for users Okta credentials
      path = require('path'),
      fs = require('fs');
// Sets up paths
const reportsPath = path.resolve(__dirname, '../reports/'),
      configPath = path.resolve(__dirname, '../config/config.js');
// Loads auth and config file(s)
const config = require(configPath);
// Loads credentials
let user = '', // Enter you email here to hardcode Okta login credentials
    pass = ''; // Enter you password here to hardcode Okta login credentials
// URL Setup
const oktaUrl = 'https://amplify.okta.com/app/UserHome#',
      salesForceUrl = 'https://amplify.okta.com/home/salesforce/0oa1nsexw1ZevYiep2p7/46?fromHome=true', // Talkdesk page. Okta Redirect Page
      salesForceReportUrl = config.salesForceReport;
// Sets up file extension regex
const regex = /\.csv$/g;
let m;
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

(async () => {
  // Change headless to false to watch the puppeteer in action
  const browser = await puppeteer.launch({headless:true});
  const okta = await browser.newPage();
  await okta.setViewport({width:1200, height:860});



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
      // Failed login error message
        // <div class="okta-form-infobox-error infobox infobox-error" role="alert">
      okta.waitForSelector('.okta-form-infobox-error', { // May need to change this as this will be set off every time after the inital failure
        visible: true,
        timeout: 2000
      })
      .then(() => {
        console.error('Invalid email address or password');
        login();
      })
      .catch(() => {
        prompt.stop();
        console.log('Credentials accepted.');
      }),
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

  // Open new tab, set cookies, and navigate to SalesForce Report
    // Reminder: Must first navigate to the Okta redirect page
  const salesForce = await browser.newPage();
  await salesForce.setViewport({width:1200, height:860});
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
    salesForce.goto(salesForceReportUrl),
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
  // Checks that download is complete
  chokidar.watch('reports/', {
    ignored: /\.crdownload$/,
    ignoreInitial: true,
    persistent: true
  }).on('add', (event, path) => {
    console.log('Finished downloading ./' + event);
    browser.close();
    process.exit();
  });
})();
