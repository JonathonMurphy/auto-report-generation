module.exports = {

  reportName: '', // Optional // No spaces in the report name

  groupName: '', // Optional // Enables a set of reports to be updated outside the bulk update

  platform: '', // Optional // for now, will be required in future updates 

  runInBulkUpdate: false, // Required // Boolean to determine if this should be run with the --update-all flag
                /*                         -->                     This part                 <--        */
    /* https://docs.google.com/spreadsheets/d/ 1E4DtmmUMnf0NCqKJJLJUAlLi23-E7EpkSrtQ7uLKjWU /edit#gid=0 */
  spreadsheetID: '', // Required //ID for the spreadsheet you want the data entered into

  /*  Index starts at 0, so the first tab on your spreadsheet is 0, the second tab is 1, so forth and so on */
  pageIndex: '', // Required // page index for that spreadsheet if it has multiple pages/tabs/sheets

  /* The SalesForce report URL should look something like this https://amplify.my.salesforce.com/00O2H000006xuaL */
  salesForceReport: '' // Required // URL for the SalesForce report that you want to download
}
