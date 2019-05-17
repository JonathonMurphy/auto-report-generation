#!/usr/bin/env node
'use strict';
console.log('Loading please wait...');
// Module Setup
const puppeteer = require('puppeteer'), // Headless browser
      xorCrypt = require('xor-crypt'), // Password encryption
      chokidar = require('chokidar'), // A better file watcher
      prompt = require('prompt'), // This modules functionality needs to be added in. It will replace the auth files password section.
      path = require('path'),
      fs = require('fs');
// Sets up paths
const oktaAuthPath = path.resolve(__dirname, '../auth/okta.js'),
      reportsPath = path.resolve(__dirname, '../reports/'),
      configPath = path.resolve(__dirname, '../config/config.js');
// Loads auth and config file(s)
const oktaAuth = require(oktaAuthPath),
      config = require(configPath);
// Loads credentials
const user = oktaAuth.username,
      pass = xorCrypt(oktaAuth.password, 7);
// URL Setup
const oktaUrl = 'https://amplify.okta.com/app/UserHome#',
      salesForceUrl = 'https://amplify.okta.com/home/salesforce/0oa1nsexw1ZevYiep2p7/46?fromHome=true', // Talkdesk page. Okta Redirect Page
      salesForceReportUrl = config.salesForceReport;
// Sets up file extension regex
const regex = /\.csv$/g;
let m;


(async () => {
  // Change headless to false to watch the puppeteer in action
  const browser = await puppeteer.launch({headless:true});
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
    okta.waitForNavigation({ waitUntil: 'networkidle0' })
  ]);
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
})();
