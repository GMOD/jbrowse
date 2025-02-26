import 'babel-polyfill'

require([
  'JBrowse/Browser',
  'css!../../css/genome.css',

  // instruct build/glob-loader.js to insert includes for every bit of JBrowse and plugin code
  //!! glob-loader, please include every JBrowse and plugin module here
], function (Browser) {
  window.Browser = Browser
})
