import test from 'ava';
import {Application} from 'spectron';
import electronPath from 'electron';
import path from 'path';
import os from 'os';
var tmp = require('tmp');
var tmpobj = tmp.dirSync();

test.beforeEach(async t => {
    t.context.app = new Application({
        path: electronPath,
        args: [path.join(__dirname, '../..'), '--electronData', tmpobj.name],
        env: {SPECTRON: '1'},
        requireName: 'electronRequire'
    });

    await t.context.app.start();
});

test.afterEach.always(async t => {
    await t.context.app.stop();
});
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
test('shows window', async t => {
    const app = t.context.app;
    await app.client.waitUntilWindowLoaded();
    app.client.log("browser")

    const win = app.browserWindow;
    t.is(await app.client.getWindowCount(), 1);
    t.false(await win.isMinimized());
    t.false(await win.isDevToolsOpened());
    t.true(await win.isVisible());

    const {width, height} = await win.getBounds();
    t.true(width > 0);
    t.true(height > 0);

    var text = await app.client.getText("#welcome");
    t.is(text.substr(0,12), "Your JBrowse");
    await app.client.click("#newOpen");
    await app.client.click("#openFile");
    await app.client.click("#dijit_form_Button_1_label");
    // debugging commands
    //    var x = await app.client.getMainProcessLogs()
    //    var y = await app.client.getRenderProcessLogs()
    //    console.error(x);
    //    console.error(y);
    await sleep(5000);
    await app.restart()
    await app.client.waitUntilWindowLoaded()
    text = await app.client.getText("#previousSessionsTable");
    t.true(text != null);
    await app.client.click("#previousSessionsTable");
    var tracklabel = app.client.element( "//label[contains(@class,'tracklist-label')]/span[contains(.,'FASTA')]");
    await tracklabel.click();
    var trackPath = "//div[contains(@class,'track-label')][contains(.,'FASTA')]";
    var track = app.client.element(trackPath);
    console.log(track);
});

