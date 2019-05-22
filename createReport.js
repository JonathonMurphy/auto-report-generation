#!/usr/bin/env node
'use strict';
// Import Modules
const fs = require('fs'),
      path = require('path'),
      chokidar = require('chokidar'), // A better file watcher
      { promisify } = require('util'),
      childProcess = require('child_process'),
      GoogleSpreadsheet = require('google-spreadsheet'), // Google spreadsheet API wrapper
      { convertCSVToArray } = require('convert-csv-to-array'), // Name says it all really...
      converter = require('convert-csv-to-array'),
      regexTroubleCharacters =/\[|\]|\'|(?<!"),/gi, // Removes [ ] ' and , characters that are within the cells of the csv file
      regexDoubleQuotes = /\"/g; // Removes the double quotes from around the values in the resulting array
// Sets up paths
const libPath = path.resolve(__dirname, './lib'),
      reportsPath = path.resolve(__dirname, './reports/'),
      credPath = path.resolve(__dirname, './auth/creds.json'),
      configPath = path.resolve(__dirname, './config/config.js');
// Import local files ie: Libraries, Config, etc...
const creds = require(credPath),
      config = require(configPath),
      runScript = require(libPath + '/runChild.js'),
      downloadReport = libPath + '/downloadReport.js';
// Fun stuff
async function updateSpreadsheet(entries) {
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
// Run downloadReport as a child process.
// Downloads the SalesForce report specified
// in ./config/config.js
runScript(downloadReport, function (err) {
    if (err) throw err;
});

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
  updateSpreadsheet(entries);
})
