await promisify(watcher.on)('add')
  .then((event, path) => {
    // Parese the csv file into an array of it's values
    console.log('Parsing ' + event + ' for report ' + option.reportName);
    const dataBuffer = fs.readFileSync(event);
    const dataString = dataBuffer.toString();
    let entries = convertCSVToArray(dataString.replace(regexTroubleCharacters, ''), {
      header: true,
      type: 'array',
      separator: ','
    });
    entries.length = entries.length - 7; // Removes the garbage at the end of the generated report from SF
  })
  .catch((err) => {
    throw err;
  })


watcher.on('add', async function (event, path) {
  // Parese the csv file into an array of it's values
  console.log('Parsing ' + event + ' for report ' + option.reportName);
  const dataBuffer = fs.readFileSync(event);
  const dataString = dataBuffer.toString();
  let entries = convertCSVToArray(dataString.replace(regexTroubleCharacters, ''), {
    header: true,
    type: 'array',
    separator: ','
  });
  entries.length = entries.length - 7; // Removes the garbage at the end of the report
  // Sends the parsed report through the Google sheets API script
  await autoReport.updateSpreadsheet(option, creds, entries);
})
