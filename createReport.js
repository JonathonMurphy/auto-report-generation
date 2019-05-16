#!/usr/bin/env node
'use strict';
// Import Modules
const results = {values:[]},
      fs = require('fs'),
      path = require('path'),
      { promisify } = require('util'),
      childProcess = require('child_process'),
      GoogleSpreadsheet = require('google-spreadsheet'),
      { convertCSVToArray } = require('convert-csv-to-array'),
      converter = require('convert-csv-to-array'),
      regex =/\"/g,
      regexUrl = /\.crdownload/g;
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
async function accessSpreadsheet(entries) {
  const doc = new GoogleSpreadsheet(config.spreadsheetID);
  await promisify(doc.useServiceAccountAuth)(creds);
  const info = await promisify(doc.getInfo)();
  const sheet = info.worksheets[0];
  // Get the cells in the spreadsheet that are to be worked on
  const cells = await promisify(sheet.getCells)({
    'min row': 1,
    'max-row': entries.length,
    'min-col': 1,
    'max-col': entries[0].length,
    'return-empty': true
  });
  console.log('Inputting into Google Sheets...')
  for (let i = 0; i < entries.length; i++) { // Goes down the rows
    for ( let j = 0; j < entries[i].length; j++) { // Goes across the columns
      let k = (i * 7) + j;
      cells[k].value = entries[i][j].replace(regex, '')
    }
  }
  sheet.bulkUpdateCells(cells);
};
/* Uncomment this section when through with tests */
runScript(downloadReport, function (err) {
    if (err) throw err;
    console.log('finished running some-script.js');
});

/* Uncomment this when after you have the google sheets stuff working */
fs.watch(reportsPath, (eventType, filename) => {
  let entries;
  function parseCsv () {
    console.log('Parsing csv file...');
    const dataBuffer = fs.readFileSync(__dirname + '/reports/' + filename.replace(regexUrl, ''));
    const dataString = dataBuffer.toString();
    entries = convertCSVToArray(dataString, {header: true, type: 'array', separator: ','});
    return entries;
  }
  setTimeout(parseCsv, 10000);
  setTimeout(function () {
    accessSpreadsheet(entries);
  }, 15000);
  // fs.createReadStream(__dirname + '/reports/' + filename)
  // .pipe(csv())
  // .on('data', (data) => results.values.push(data))
  // .on('end', () => {
  //   fs.writeFileSync('./csv-parser-output.json', JSON.stringify(results));
  // });
})
