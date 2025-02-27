import '../../css/genome.css'

require([
  'JBrowse/Browser',

  // instruct build/glob-loader.js to insert includes for every bit of JBrowse and plugin code
  //!! glob-loader, please include every JBrowse and plugin module here
], function (Browser) {
  window.Browser = Browser
})
