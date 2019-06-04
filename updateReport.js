#!/usr/bin/env node
'use strict';
console.log('Loading please wait...');

// Module Setup
const fs = require('fs'),
      path = require('path'),
      chokidar = require('chokidar'), // A better file watcher
      program = require('commander'), // Command line arguments
      { promisify } = require('util'),
      puppeteer = require('puppeteer'), // Headless browser
      childProcess = require('child_process'),
      { convertCSVToArray } = require('convert-csv-to-array'), // Name says it all really...
      converter = require('convert-csv-to-array');

// Sets up paths
const libPath = path.resolve(__dirname, './lib'),
      reportsPath = path.resolve(__dirname, './reports/');

// Import local files ie: Libraries, Config, etc...
const runScript = require(libPath + '/runChild.js'),
      autoReport = require(libPath + '/autoReport.js'),
      pkg = require(path.resolve(__dirname, './package.json')),
      creds = require(path.resolve(__dirname, './lib/.creds.json')),
      config = require(path.resolve(__dirname, './config/config.new.js'));

// Reggie
const regexTroubleCharacters = /\[|\]|\'|(?<!"),/gi; // Removes [ ] ' and , characters that are within the cells of the csv file

// Puppeteer launch options
const launchOptions = {
        headless: true, // Change headless to false to watch puppeteer in action
        defaultViewport: {
          width:1200,
          height:800
        }
      };

program
  .version(pkg.version, '-v --version')
  .description(pkg.description)
  .usage('[options] [...]')
  .option('-a --all', 'updates all reports in config file')
  .option('-b --bulkUpdate', 'updates all reports with the "runInBulkUpdate" config setting set to true')
  .option('-i --index <indexNumber>', 'updates the report with the corresponding index number')
  .option('-n --reportName <reportName>', 'updates the report with the corresponding name in the config file')
  .option('-g --groupName <groupName>', 'updates all reports with specified groupName in the config file');

program.parse(process.argv);



// async function to update a single report
  // For the -i and -n flags
async function updateSingleReport(option) {
  const browser = await puppeteer.launch(launchOptions);
  await autoReport.oktaAuth(browser);
  await autoReport.downloadSalesForceReport(option, browser, autoReport.cookies, reportsPath);
  const watcher = chokidar.watch(reportsPath + '/' + option.reportName, {
    ignored: /\.crdownload$/,
    ignoreInitial: true,
    persistent: true,
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 100
    }
  });
  // Watches the ./reports directory for the incoming report download
  watcher.on('add', (event, path) => {
    // Parese the csv file into an array of it's values
    console.log('Parsing ' + event);
    const dataBuffer = fs.readFileSync(event);
    const dataString = dataBuffer.toString();
    let entries = convertCSVToArray(dataString.replace(regexTroubleCharacters, ''), {
      header: true,
      type: 'array',
      separator: ','
    });
    entries.length = entries.length - 7; // Removes the garbage at the end of the downloaded report
    // Sends the parsed report through the Google sheets API script
    autoReport.updateSpreadsheet(option, creds, entries);
  });
};

// async function to update mulitple reports at once
  // For the -a -b and -g flags
async function updateMultipleReports(options) {
  const browser = await puppeteer.launch(launchOptions);
  await autoReport.oktaAuth(browser);
  for (let option of options) {
    console.log('Working on report: ' + option.reportName);
    // Watches the ./reports directory
    const watcher = chokidar.watch(reportsPath + '/' + option.reportName, {
      ignored: /\.crdownload$/,
      ignoreInitial: true,
      persistent: true,
      awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100
      }
    });
    watcher.on('add', function (event, path) {
      // Parese the csv file into an array of it's values
      console.log('Parsing ' + event);
      const dataBuffer = fs.readFileSync(event);
      const dataString = dataBuffer.toString();
      let entries = convertCSVToArray(dataString.replace(regexTroubleCharacters, ''), {
        header: true,
        type: 'array',
        separator: ','
      });
      entries.length = entries.length - 7; // Removes the garbage at the end of the downloaded report
      // Sends the parsed report through the Google sheets API script
      autoReport.updateSpreadsheet(option, creds, entries);
    });
    await autoReport.downloadSalesForceReport(option, browser, autoReport.cookies, reportsPath);

  }
};

/** ↓ -a flag section ↓ **/
if (program.all) {
  console.log('Configs file loaded.');
  config.options.forEach((option => {
    console.log('Report name: ' + option.reportName);
  }))
  updateMultipleReports(options, () => {
    browser.close();
    process.exit();
  });
}
/** ↑ -a flag section ↑ **/


/** ↓ -b flag section ↓ **/
  // Filters objects in the config file by the runInBulkUpdate value set to true
if (program.bulkUpdate) {
  const options = config.options.filter(option => option.runInBulkUpdate === true);
  console.log('Configs file loaded.');
  options.forEach((option) => {
    console.log('Report name: ' + option.reportName);
  })
  updateMultipleReports(options, () => {
    browser.close();
    process.exit();
  });
}
/** ↑ -b flag section ↑ **/


/** ↓ -g flag section ↓ **/
  // Filters objects in the config file by the groupName value matching the command line arg
if (program.groupName) {
  const options = config.options.filter(option => option.groupName === program.groupName);
  console.log('Configs file loaded.');
  options.forEach((option) => {
    console.log('Report name: ' + option.reportName);
  })
  updateMultipleReports(options, () => {
    browser.close();
    process.exit();
  });
}
/** ↑ -g flag section ↑ **/


/** ↓ -i flag section ↓ **/
if (program.index) {
  let option = config.options[program.index]
  console.log('Config file loaded.\nReport name: ' + option.reportName);
  updateSingleReport(option, () => {
    browser.close();
    process.exit();
  });
}
/** ↑ -i flag section ↑ **/


/** ↓ -n flag section ↓ **/
  // Finds the object in the config file with the corresponding name to the command line arg
if (program.reportName) {
  const option = config.options.find(option => option.reportName === program.reportName);
  console.log('Config file loaded\nReport name: ' + option.reportName)
  updateSingleReport(option, () => {
    browser.close();
    process.exit();
  });
}
/** ↑ -n flag section ↑ **/
