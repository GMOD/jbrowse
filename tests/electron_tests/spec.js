import test from 'ava'
import { Application } from 'spectron'
import electronPath from 'electron'
import path from 'path'
import os from 'os'
var tmp = require('tmp')
var tmpobj = tmp.dirSync()

test.beforeEach(async t => {
  t.context.app = new Application({
    path: electronPath,
    args: [path.join(__dirname, '../..'), '--electronData', tmpobj.name],
    env: { SPECTRON: '1' },
    requireName: 'electronRequire',
  })
  await t.context.app.start()
})

test.afterEach.always(async t => {
  await t.context.app.stop()
})
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
test('shows window', async t => {
  const app = t.context.app
  await app.client.waitUntilWindowLoaded()
  app.client.log('browser')

  const win = app.browserWindow
  t.is(await app.client.getWindowCount(), 1)
  t.false(await win.isMinimized())
  t.false(await win.isDevToolsOpened())
  t.true(await win.isVisible())

  const { width, height } = await win.getBounds()
  t.true(width > 0)
  t.true(height > 0)

  var text = await app.client.getText('#welcome')
  t.is(text.substr(0, 7), 'Welcome')
  await app.client.click('#newOpen')
  await sleep(5000)
  await app.client.element('//textarea').click()
  await sleep(5000)
  await app.client.keys(process.cwd() + '/docs/tutorial/data_files/volvox.fa')
  await sleep(5000)
  await app.client.element('//span[text()="Open"]').click()
  await sleep(5000)

  // debugging commands
  // var x = await app.client.getMainProcessLogs()
  // var y = await app.client.getRenderProcessLogs()
  // console.error(x);
  // console.error(y);

  await app.restart()
  await app.client.waitUntilWindowLoaded()
  text = await app.client.getText('#previousSessionsTable')
  t.true(text != null)
  var session = await app.client
    .element('//*[@id="previousSessionsTable"]/tr/td[1]/a')
    .click()
  await sleep(5000)

  var trackPath = await app.client.element(
    '//div[contains(@class,"track-label")]',
  )
  t.true(trackPath.value == null)
  var tracklabel = await app.client
    .element('//label[contains(@class, "tracklist-label")]/span')
    .click()
  trackPath = await app.client.element('//div[contains(@class,"track-label")]')
  t.true(trackPath.value != null)
})
