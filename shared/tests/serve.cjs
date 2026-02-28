/**
 * Minimal static HTTP server for Playwright tests.
 * Serves the shared/ directory at localhost:3099.
 * Zero dependencies — uses only Node.js built-ins.
 *
 * Usage: node shared/tests/serve.cjs
 */
'use strict';

var http = require('http');
var fs = require('fs');
var path = require('path');

var PORT = 3099;
var ROOT = path.join(__dirname, '..');

var MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
};

http.createServer(function (req, res) {
  var url = req.url.split('?')[0];
  // Serve tests/ directory files under /tests/ path
  var filePath = path.join(ROOT, url === '/' ? 'tests/test-harness.html' : url);
  var ext = path.extname(filePath);

  fs.readFile(filePath, function (err, data) {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found: ' + url);
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, function () {
  console.log('Serving shared/ at http://localhost:' + PORT);
});
