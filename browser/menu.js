var app = require('electron').app;
var BrowserWindow = require('electron').BrowserWindow;

var menu = module.exports = [];
var isDarwin = process.platform === 'darwin';

menu.push(
	{
		label: '&File',
		submenu: [
			{
				label: '&Quit',
				accelerator: 'CmdOrCtrl+Q',
				click: function () {
					app.quit();
				}
			}
		]
	}
);

menu.push(
    {
        label: '&Debug',
        submenu: [
            {
                label: '&Reload',
                accelerator: 'CmdOrCtrl+R',
                click: function () {
                    BrowserWindow.getFocusedWindow().webContents.reloadIgnoringCache();
                }
            },
            {
                label: 'Toggle &Developer Tools',
                accelerator: isDarwin ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
                click: function () {
                    BrowserWindow.getFocusedWindow().toggleDevTools();
                }
            }
        ]
    }
);

menu.push(
  {
    label: 'Edit',
    submenu: [
      {
        label: 'Undo',
        accelerator: 'Command+Z',
        selector: 'undo:'
      },
      {
        label: 'Redo',
        accelerator: 'Shift+Command+Z',
        selector: 'redo:'
      },
      {
        type: 'separator'
      },
      {
        label: 'Cut',
        accelerator: 'Command+X',
        selector: 'cut:'
      },
      {
        label: 'Copy',
        accelerator: 'Command+C',
        selector: 'copy:'
      },
      {
        label: 'Paste',
        accelerator: 'Command+V',
        selector: 'paste:'
      },
      {
        label: 'Select All',
        accelerator: 'Command+A',
        selector: 'selectAll:'
      },
    ]
  }
);
