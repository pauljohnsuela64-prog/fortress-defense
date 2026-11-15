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
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
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
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    const nativeFrame = window.requestAnimationFrame.bind(window);
    let lastFrame, lastTime = 0, offset = 0, pumping = false;
    window.requestAnimationFrame = callback => pumping ? 0 : nativeFrame(time => {
      lastFrame = callback; lastTime = time + offset; callback(lastTime);
    });
    // Advance the actual Phaser frame callback, with unchanged 60Hz simulation steps.
    window.__pumpFrames = count => {
      pumping = true;
      try { for (let i = 0; i < count; i++) { lastTime += 1000 / 60; offset += 1000 / 60; lastFrame(lastTime); } }
      finally { pumping = false; }
    };
    window.__audioSmoke = { contexts: 0, starts: 0, live: 0, peak: 0 };
    const NativeAudioContext = window.AudioContext;
    window.AudioContext = class extends NativeAudioContext {
      constructor(...args) { super(...args); window.__audioSmoke.contexts++; }
      createOscillator() {
        const oscillator = super.createOscillator();
        const start = oscillator.start.bind(oscillator);
        const disconnect = oscillator.disconnect.bind(oscillator);
        let counted = false;
        const release = () => {
          if (counted) { counted = false; window.__audioSmoke.live--; }
        };
        oscillator.start = (...args) => {
          const result = start(...args);
          counted = true;
          window.__audioSmoke.starts++; window.__audioSmoke.live++;
          window.__audioSmoke.peak = Math.max(window.__audioSmoke.peak, window.__audioSmoke.live);
          return result;
        };
        // Restart disconnects voices before the browser delivers their ended events.
        oscillator.disconnect = (...args) => { const result = disconnect(...args); release(); return result; };
        oscillator.addEventListener('ended', release, { once: true });
        return oscillator;
      }
    };
  ` });
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://127.0.0.1:4173/' });
  for (let attempt = 0; attempt < 50; attempt++) {
    if (await evaluate("!!document.querySelector('canvas') && document.querySelector('#message').textContent.includes('Build towers')")) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  const hud = () => evaluate("document.querySelector('#hud').textContent");
  assert.deepEqual(errors, [], 'Game startup must not throw');
  assert.match(await hud(), /Gold 210.*Lives 10.*Wave 0/);
  const clickTile = async (column, row) => {
    const rect = await evaluate("JSON.stringify(document.querySelector('canvas').getBoundingClientRect().toJSON())");
    const bounds = JSON.parse(rect);
    const point = { x: bounds.x + (column + 0.5) * bounds.width / 16, y: bounds.y + (row + 0.5) * bounds.height / 10 };
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point });
  };
  const choose = type => evaluate(`document.querySelector('[data-tower="${type}"]').click()`);
  const panel = () => evaluate("document.querySelector('#upgrade-title').textContent");
  const upgrade = () => evaluate("document.querySelector('#upgrade-button').click()");
  const restart = async () => {
    await evaluate("document.querySelector('#restart').click()");
    await new Promise(resolve => setTimeout(resolve, 150));
    assert.match(await hud(), /Gold 210.*Lives 10.*Wave 0/);
    assert.equal(await panel(), 'Inspect a tower');
    assert.equal(await evaluate("document.querySelector('[data-tower=archer]').getAttribute('aria-pressed')"), 'true');
  };
  await clickTile(0, 2);
  assert.match(await hud(), /Gold 210/);
  await clickTile(2, 3);
  assert.match(await hud(), /Gold 170/);
  await new Promise(resolve => setTimeout(resolve, 100));
  await evaluate("document.querySelector('#mute').click()");
  assert.equal(await evaluate("document.querySelector('#mute').getAttribute('aria-pressed')"), 'true');
  await evaluate("const slider = document.querySelector('#volume'); slider.value = '20'; slider.dispatchEvent(new Event('input', { bubbles: true }));");
  assert.equal(await evaluate("document.querySelector('#volume').getAttribute('aria-valuetext')"), '20 percent');
  const mutedStarts = await evaluate('window.__audioSmoke.starts');
  await clickTile(2, 3);
  assert.match(await hud(), /Gold 170/);
  assert.match(await panel(), /Archer Tower.*Level 1/);
  assert.match(await evaluate("document.querySelector('#upgrade-stats').textContent"), /Damage14Attack speed2.86\/sRange150/);
  await upgrade();
  assert.match(await hud(), /Gold 125/);
  assert.equal(await evaluate('window.__audioSmoke.starts'), mutedStarts, 'Muted actions must not create audio voices');
  await evaluate("document.querySelector('#mute').click()");
  assert.equal(await evaluate("document.querySelector('#mute').getAttribute('aria-pressed')"), 'false');
  assert.match(await panel(), /Level 2/);
  await upgrade();
  assert.match(await hud(), /Gold 50/);
  assert.match(await panel(), /Level 3/);
  const upgraded = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile(`${artifacts}/upgrade.png`, Buffer.from(upgraded.data, 'base64'));
  assert.equal(await evaluate("document.querySelector('#upgrade-button').disabled"), true);
  await upgrade();
  assert.match(await hud(), /Gold 50/);
  await choose('cannon');
  await clickTile(4, 5);
  assert.match(await hud(), /Gold 50/);
  assert.match(await evaluate("document.querySelector('#message').textContent"), /need 100 gold/);
  await restart();
  await choose('cannon');
  await clickTile(4, 5);
  await clickTile(4, 5);
  assert.match(await panel(), /Cannon Tower.*Level 1/);
  await upgrade();
  assert.match(await hud(), /Gold 20/);
  assert.match(await panel(), /Level 2/);
  assert.equal(await evaluate("document.querySelector('#upgrade-button').disabled"), true);
  await upgrade();
  assert.match(await hud(), /Gold 20/);
  await restart();
  await clickTile(2, 3);
  await choose('cannon');
  await clickTile(4, 5);
  await choose('magic');
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
  for (let count = 0; count < 3; count++) await restart();
  assert.equal(await evaluate('window.__audioSmoke.contexts'), 1, 'Restart must reuse one audio context');
  assert.equal(await evaluate('window.__audioSmoke.live'), 0, 'Restart must stop old voices');
  assert.ok(await evaluate('window.__audioSmoke.starts > 0'), 'Original audio must actually play');
  assert.equal(await evaluate("document.querySelector('#volume').value"), '20', 'Restart must preserve volume');
  await clickTile(1, 1);
  assert.match(await hud(), /Gold 170/);
  await clickTile(1, 1);
  assert.match(await panel(), /Archer Tower.*Level 1/);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight' });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight' });
  assert.equal(await panel(), 'Inspect a tower', 'Moving the keyboard cursor must exit tower inspection');
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter' });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter' });
  assert.match(await hud(), /Gold 130/);
  await restart();
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true });
  await new Promise(resolve => setTimeout(resolve, 250));
  const tap = async (selector, column, row) => {
    const rect = await evaluate(`(() => { const element = document.querySelector('${selector}'); element.scrollIntoView({ block: 'center' }); return element.getBoundingClientRect().toJSON(); })()`);
    const point = column === undefined ? { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
      : { x: rect.x + (column + 0.5) * rect.width / 16, y: rect.y + (row + 0.5) * rect.height / 10 };
    await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...point, radiusX: 2, radiusY: 2 }] });
    await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await new Promise(resolve => setTimeout(resolve, 100));
  };
  await tap('[data-tower=magic]');
  assert.equal(await evaluate("document.querySelector('[data-tower=magic]').getAttribute('aria-pressed')"), 'true');
  await tap('canvas', 6, 3);
  assert.match(await hud(), /Gold 140/);
  await tap('canvas', 6, 3);
  assert.match(await panel(), /Magic Tower.*Level 1/);
  await tap('#upgrade-button');
  assert.match(await panel(), /Magic Tower.*Level 2/);
  assert.match(await hud(), /Gold 75/);
  assert.equal(await evaluate("document.querySelector('#upgrade-button').disabled"), true);
  assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true);
  await evaluate('window.scrollTo(0, 0)');
  const metrics = await send('Page.getLayoutMetrics');
  const content = metrics.cssContentSize;
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: Math.ceil(content.height), deviceScaleFactor: 1, mobile: true });
  const mobile = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile(`${artifacts}/mobile.png`, Buffer.from(mobile.data, 'base64'));
  for (const width of [320, 390, 768, 1280]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 900 });
    await new Promise(resolve => setTimeout(resolve, 150));
    assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true, `Overflow at ${width}px`);
    await evaluate('window.scrollTo(0, 0)');
    const layout = await send('Page.getLayoutMetrics');
    const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true,
      clip: { x: 0, y: 0, width, height: Math.ceil(layout.cssContentSize.height), scale: 1 } });
    await writeFile(`${artifacts}/layout-${width}.png`, Buffer.from(screenshot.data, 'base64'));
  }
  assert.ok(await evaluate('window.__audioSmoke.peak <= 12'), 'Audio voice limit exceeded');
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await restart();
  assert.equal(await evaluate("document.querySelector('#battle-result').hidden"), true);
  const finishWave = async () => {
    for (let i = 0; i < 40; i++) {
      await evaluate('window.__pumpFrames(300)');
      if (await evaluate("!document.querySelector('#battle-result').hidden || !document.querySelector('#start-wave').disabled")) return;
    }
    assert.fail('Wave failed to finish within 200 simulated seconds');
  };
  const resultScreenshot = async (name, width) => {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: true });
    await new Promise(resolve => setTimeout(resolve, 150));
    await evaluate('window.scrollTo(0, 0)');
    assert.equal(await evaluate(`(() => {
      const stage = document.querySelector('.stage').getBoundingClientRect();
      const button = document.querySelector('#result-restart').getBoundingClientRect();
      return button.bottom <= stage.bottom && button.top >= stage.top && button.left >= stage.left && button.right <= stage.right;
    })()`), true, 'Result restart control must fit inside the battlefield');
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    await writeFile(`${artifacts}/${name}-${width}.png`, Buffer.from(shot.data, 'base64'));
  };
  for (let wave = 0; wave < 2; wave++) {
    await evaluate("document.querySelector('#start-wave').click()");
    await finishWave();
  }
  assert.equal(await evaluate("document.querySelector('#battle-result').dataset.outcome"), 'defeat');
  assert.equal(await evaluate("document.querySelector('#start-wave').textContent"), 'Battle finished');
  assert.equal(await evaluate('document.activeElement.id'), 'result-restart');
  await resultScreenshot('defeat', 320);
  await evaluate("document.querySelector('#result-restart').click()");
  await new Promise(resolve => setTimeout(resolve, 150));
  assert.match(await hud(), /Gold 210.*Lives 10.*Wave 0/);
  assert.equal(await evaluate("document.querySelector('#battle-result').hidden"), true);
  await choose('archer'); await clickTile(2, 3);
  await choose('cannon'); await clickTile(4, 5);
  await choose('magic'); await clickTile(6, 3);
  for (let wave = 0; wave < 5; wave++) {
    if (wave > 0) {
      for (const [column, row] of [[2, 3], [4, 5], [6, 3]]) { await clickTile(column, row); await upgrade(); }
      if (wave === 3) { await choose('cannon'); await clickTile(10, 5); }
    }
    await evaluate("document.querySelector('#start-wave').click()");
    await finishWave();
  }
  assert.equal(await evaluate("document.querySelector('#battle-result').dataset.outcome"), 'victory');
  await resultScreenshot('victory', 390);
  await evaluate("document.querySelector('#result-restart').click()");
  await new Promise(resolve => setTimeout(resolve, 150));
  assert.match(await hud(), /Gold 210.*Lives 10.*Wave 0/);
  await send('Page.addScriptToEvaluateOnNewDocument', { source: "window.AudioContext = class { constructor() { throw new Error('test: device unavailable'); } };" });
  await send('Page.reload');
  await new Promise(resolve => setTimeout(resolve, 700));
  await clickTile(2, 3);
  assert.match(await hud(), /Gold 170/, 'Unavailable sound must not block purchases');
  await evaluate("document.querySelector('#start-wave').click()");
  assert.match(await hud(), /Wave 1/);
  assert.deepEqual(errors, []);
  console.log('Browser smoke passed: purchases/upgrades, keyboard/touch, restart, real victory/defeat and mobile result controls, audio mute/volume/voice cleanup/device failure, reduced motion, 320/390/768/1280px screenshots; no runtime exceptions.');
} finally {
  socket?.close();
  browser.kill();
}
