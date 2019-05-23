const program = require('commander'),
      pkg = require('./package.json'),
      config = require('./config/config.js');

program
  .version(pkg.version, '-v --version')
  .description(pkg.description)
  .usage('[options] [...]')
  .option('-a --all', 'updates all reports with the "runInBulkUpdate" config setting set to true')
  .option('-i --index <indexNumber>', 'updates the report with the corresponding index number')
  .option('-n --name <reportName>', 'updates the report with the corresponding name in the config file')
  .option('-g --group <groupName>', 'updates all reports with specified groupName in the config file')

program.parse(process.argv);
