const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const Menu = electron.Menu;

var menu = require('./menu');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

    

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', function() {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        center: true,
        title: 'JBrowseDesktop',
        width: 1024,
        height: 768
    });

    // and load the index.html of the app.
    mainWindow.loadURL('file://' + require('path').resolve(__dirname, '..', 'index.html'));
    // Emitted when the window is closed.
    Menu.setApplicationMenu(Menu.buildFromTemplate(menu));

    mainWindow.on('closed', function () {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null;
    });
});

// Quit when all windows are closed.
app.on('window-all-closed', function () {
    app.quit();
});


