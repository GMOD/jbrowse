const electron = require('electron')
const app = electron.app
const BrowserWindow = electron.BrowserWindow
const Menu = electron.Menu

var menu = require('./menu')
var argv = require('optimist').argv

let mainWindow
app.on('ready', function () {
  mainWindow = new BrowserWindow({
    center: true,
    title: 'JBrowseDesktop',
    width: 1024,
    height: 768,
    icon: require('path').resolve(__dirname, 'icons/jbrowse.png'),
  })
  var queryString = Object.keys(argv)
    .map(key => key + '=' + argv[key])
    .join('&')

  mainWindow.loadURL(
    'file://' +
      require('path').resolve(__dirname, '../index.html?' + queryString),
  )
  Menu.setApplicationMenu(Menu.buildFromTemplate(menu))

  mainWindow.on('closed', function () {
    mainWindow = null
  })
})

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  app.quit()
})
