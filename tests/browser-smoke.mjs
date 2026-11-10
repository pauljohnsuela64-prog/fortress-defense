// Run against `npm run preview` with Chrome installed; no browser-test dependency needed.
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const artifacts = resolve('.browser-check');
await mkdir(artifacts, { recursive: true });
const browser = spawn(process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=9223', `--user-data-dir=${artifacts}/profile`, 'about:blank',
], { windowsHide: true, stdio: 'ignore' });
let launchError;
browser.on('error', error => { launchError = error; });
let socket;
try {
  let target;
  for (let attempt = 0; attempt < 50; attempt++) {
    if (launchError) throw launchError;
    try {
      const targets = await (await fetch('http://127.0.0.1:9223/json')).json();
      target = targets.find(item => item.type === 'page');
      if (target) break;
    } catch { /* Browser may still be starting. */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(target, 'Chrome debugging endpoint did not start');
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let sequence = 0;
  const pending = new Map();
  const errors = [];
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
    if (message.id) {
      const request = pending.get(message.id);
      if (!request) return;
      clearTimeout(request.timer);
      pending.delete(message.id);
      if (message.error) request.reject(new Error(message.error.message));
      else request.resolve(message.result);
    }
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 10000);
    pending.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    assert.ok(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://127.0.0.1:4173/' });
  for (let attempt = 0; attempt < 50; attempt++) {
    if (await evaluate("!!document.querySelector('canvas') && document.querySelector('#message').textContent.includes('Build towers')")) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  const hud = () => evaluate("document.querySelector('#hud').textContent");
  assert.match(await hud(), /Gold 180.*Lives 10.*Wave 0/);
  const clickTile = async (column, row) => {
    const rect = await evaluate("JSON.stringify(document.querySelector('canvas').getBoundingClientRect().toJSON())");
    const bounds = JSON.parse(rect);
    const point = { x: bounds.x + (column + 0.5) * bounds.width / 16, y: bounds.y + (row + 0.5) * bounds.height / 10 };
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point });
  };
  await clickTile(0, 2);
  assert.match(await hud(), /Gold 180/);
  await clickTile(2, 3);
  assert.match(await hud(), /Gold 120/);
  await clickTile(2, 3);
  assert.match(await hud(), /Gold 120/);
  await clickTile(4, 5);
  await clickTile(6, 3);
  assert.match(await hud(), /Gold 0/);
  await clickTile(8, 3);
  assert.match(await hud(), /Gold 0/);
  await evaluate("document.querySelector('#start-wave').click()");
  assert.equal(await evaluate("document.querySelector('#start-wave').disabled"), true);
  await new Promise(resolve => setTimeout(resolve, 4000));
  assert.match(await hud(), /Wave 1/);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile(`${artifacts}/desktop.png`, Buffer.from(shot.data, 'base64'));
  for (let restart = 0; restart < 3; restart++) {
    await evaluate("document.querySelector('#restart').click()");
    await new Promise(resolve => setTimeout(resolve, 150));
    assert.match(await hud(), /Gold 180.*Lives 10.*Wave 0/);
  }
  await clickTile(1, 1);
  assert.match(await hud(), /Gold 120/);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight' });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight' });
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter' });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter' });
  assert.match(await hud(), /Gold 60/);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await new Promise(resolve => setTimeout(resolve, 250));
  assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true);
  const mobile = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile(`${artifacts}/mobile.png`, Buffer.from(mobile.data, 'base64'));
  assert.deepEqual(errors, []);
  console.log('Browser smoke passed: placement, economy, waves, repeated restart, keyboard, mobile layout; no runtime exceptions.');
} finally {
  socket?.close();
  browser.kill();
}
