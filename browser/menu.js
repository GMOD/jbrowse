var app = require('app');
var BrowserWindow = require('browser-window');

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
                    BrowserWindow.getFocusedWindow().reloadIgnoringCache();
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
