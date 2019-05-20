#!/usr/bin/env node
'use strict';
// TODO: Add error catches in the event auth fails with Okta
console.log('Loading please wait...');
// Module Setup
const puppeteer = require('puppeteer'), // Headless browser
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
let user = '',
    pass = '';
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
// Get two properties from the user: email, password
prompt.get(schema, function (err, result) {
  console.log('Credentials received.');
  user = result.email;
  pass = result.password;
  downloadReport();
});


const downloadReport = async () => {
  // Change headless to false to watch the puppeteer in action
  const browser = await puppeteer.launch({headless:false});
  const okta = await browser.newPage();
  await okta.setViewport({width:1200, height:860});
  // #okta-signin-username
  // #okta-signin-password
  // #okta-signin-submit
  // Send Push
  // .button-primary
  await okta.goto(oktaUrl);
  // Enter username and password into respective fields
  await okta.type('#okta-signin-username', user, 17);
  await okta.type('#okta-signin-password', pass, 17);
  // Login Page
  await Promise.all([
    okta.click('#okta-signin-submit'),
    okta.waitForNavigation({ waitUntil: 'load' })
  ]);
  // Failed login error message
  // <div class="o-form-error-container o-form-has-errors" data-se="o-form-error-container"><div>
  // <div class="okta-form-infobox-error infobox infobox-error" role="alert">      <
  // span class="icon error-16"></span>
  // <p>Sign in failed!</p>
  // </div>  </div></div>
  console.log('Validating credentials.');
  /* Maybe use a then catch block  */
  let checkSignIn = await okta.url();
  if (checkSignIn == 'https://amplify.okta.com/login/login.htm?fromURI=%2Fapp%2FUserHome#') {
    console.error('Incorrect email address or password.');
    prompt.get(schema, function (err, result) {
      console.log('Credentials received.');
      user = result.email;
      pass = result.password;
      downloadReport();
    });
  };
  /* */
  // Send Push page
  await Promise.all([
    okta.click('.button-primary'),
    console.log('Waiting on Okta multi-factor authentication...'),
    okta.waitForNavigation({ waitUntil: 'networkidle0' })
  ]);
  console.log('Authentication recieved.');
  // Get cookies
  const cookies = await okta.cookies();

  // Open new tab, set cookies, and navigate to SalesForce Report
  // Reminder: Must first navigate to the Okta redirect page
  const salesForce = await browser.newPage();
  await salesForce.setViewport({width:1200, height:860});
  await salesForce._client.send('Page.setDownloadBehavior', {behavior: 'allow', downloadPath: reportsPath});
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
};
