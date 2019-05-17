const chokidar = require('chokidar');

(async () => {
  chokidar.watch('reports/', {
    ignored: /\.crdownload$/,
    persistent: true
  }).on('add', (event, path) => {
    console.log('Finished downloading ./' + event);
  });
})();
