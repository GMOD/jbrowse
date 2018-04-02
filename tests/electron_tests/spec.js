import test from 'ava';
import {Application} from 'spectron';
import electronPath from 'electron';
import path from 'path';


test.beforeEach(async t => {
  t.context.app = new Application({
      path: electronPath,
      args: [path.join(__dirname, '../..')],
      env: {SPECTRON: '1'},
      requireName: 'electronRequire'
  });

  await t.context.app.start();
});

test.afterEach.always(async t => {
  await t.context.app.stop();
});

test(async t => {
  const app = t.context.app;
  await app.client.waitUntilWindowLoaded();

  const win = app.browserWindow;
  t.is(await app.client.getWindowCount(), 1);
  t.false(await win.isMinimized());
  t.false(await win.isDevToolsOpened());
  t.true(await win.isVisible());

  const {width, height} = await win.getBounds();
  t.true(width > 0);
  t.true(height > 0);
});

test(async t => {
  const app = t.context.app;
  await app.client.waitUntilWindowLoaded();
  var text = await app.client.getText("#welcome");
  t.is(text.substr(0,12), "Your JBrowse");
  await app.client.click("#newOpen");
  await app.client.click("#openFile");
  await app.client.click("#dijit_form_Button_1");
});
test(async t => {
  const app = t.context.app;
  await app.client.waitUntilWindowLoaded();
  var text = await app.client.getText("#previousSessions");
  t.true(t!=null);
  console.error(text);
});

