#!/usr/bin/env node
'use strict';
console.log('Loading please wait...');

// Module Setup
const fs = require('fs'),
      path = require('path'),
      chokidar = require('chokidar'), // A better file watcher
      program = require('commander'), // Command line arguments
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
      creds = require(path.resolve(__dirname, './auth/creds.json')),
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

/** ↓ -a flag section ↓ **/
if (program.all) {
  config.options.forEach((option => {
    console.log(option)
  }))
}
/** ↑ -a flag section ↑ **/


/** ↓ -b flag section ↓ **/
  // Filters objects in the config file by the runInBulkUpdate value set to true
if (program.bulkUpdate) {
  const options = config.options.filter(option => option.runInBulkUpdate === true);
  options.forEach((option) => {
    console.log(option)
  })
}
/** ↑ -b flag section ↑ **/


/** ↓ -i flag section ↓ **/
if (program.index) {
  let option = config.options[program.index]
  console.log('config file loaded: ' + option.reportName);
  (async () => {
    const browser = await puppeteer.launch(launchOptions);
    await autoReport.oktaAuth(browser);
    await autoReport.downloadSalesForceReport(option, browser, autoReport.cookies, reportsPath);
    // Watches the ./reports directory for the incoming report download
    chokidar.watch(reportsPath, {
      ignored: /\.crdownload$/,
      ignoreInitial: true,
      persistent: true
    }).on('all', (event, path) => {
      // Parese the csv file into an array of it's values
      console.log('Parsing ' + path);
      const dataBuffer = fs.readFileSync(path);
      const dataString = dataBuffer.toString();
      let entries = convertCSVToArray(dataString.replace(regexTroubleCharacters, ''), {header: true, type: 'array', separator: ','});
      entries.length = entries.length - 7; // Removes the garbage at the end of the generated report from SF
      // Sends the parsed report through the Google sheets API script
      autoReport.updateSpreadsheet(option, browser, creds, entries);
    })
  })();
}
/** ↑ -i flag section ↑ **/


/** ↓ -n flag section ↓ **/
  // Finds the object in the config file with the corresponding name to the command line arg
if (program.reportName) {
  const option = config.options.find(option => option.reportName === program.reportName);
  console.log(option)
}
/** ↑ -n flag section ↑ **/


/** ↓ -g flag section ↓ **/
  // Filters objects in the config file by the groupName value matching the command line arg
if (program.groupName) {
  const options = config.options.filter(option => option.groupName === program.groupName);
  options.forEach((option) => {
    console.log(option)
  })
}
/** ↑ -g flag section ↑ **/
