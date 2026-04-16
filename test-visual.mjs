import { chromium } from 'playwright';

const SCREENSHOTS_DIR = '/Users/nybllc/Doom/screenshots';
const URL = 'http://localhost:5173';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  const logs = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => logs.push(`[PAGE_ERROR] ${err.message}`));

  console.log('Opening game...');
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Screenshot 1: Start screen
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/01_start_screen.png` });
  console.log('Screenshot 1: Start screen');

  // Force UI into game mode and reposition camera to see the level
  await page.evaluate(() => {
    document.getElementById('start-overlay').style.display = 'none';
    document.getElementById('crosshair').style.display = 'block';
    document.getElementById('hud').style.display = 'flex';
    document.getElementById('weapon-container').style.display = 'block';
  });
  await page.waitForTimeout(300);

  // Screenshot 2: Default spawn view
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/02_spawn_view.png` });
  console.log('Screenshot 2: Spawn view');

  // Move camera to center of the level, looking down a corridor
  // Use THREE.js camera directly via window/module scope
  const moved = await page.evaluate(() => {
    // Access the Three.js scene through the canvas
    const canvas = document.querySelector('#game-container canvas');
    if (!canvas) return 'no canvas';

    // Access the renderer's internal scene - we need to get the camera
    // Since main.js uses module scope, we can't directly access it
    // Instead, inject a global reference from main.js
    // For now, try accessing via Three.js renderer info
    return 'canvas found, camera not directly accessible from page context';
  });
  console.log('Camera move:', moved);

  // Alternative: expose camera globally for testing
  // Let's modify the approach - take screenshots from different angles
  // by injecting a script that moves the camera

  // Screenshot 3: Try to see the full scene by modifying camera via module
  await page.evaluate(() => {
    // We can dispatch keyboard events to trigger movement
    // Simulate pressing W for a bit to move the player forward
    const event = new KeyboardEvent('keydown', { code: 'KeyW', bubbles: true });
    document.dispatchEvent(event);
  });
  await page.waitForTimeout(2000); // Let the game loop move the player
  await page.evaluate(() => {
    document.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW', bubbles: true }));
  });
  await page.waitForTimeout(200);

  // Screenshot 3: After moving forward
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/03_moved_forward.png` });
  console.log('Screenshot 3: After moving forward');

  // Turn right and move to see enemies
  await page.evaluate(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD', bubbles: true }));
  });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    document.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyD', bubbles: true }));
  });
  await page.waitForTimeout(200);

  // Screenshot 4: After strafing
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/04_strafed.png` });
  console.log('Screenshot 4: After strafing');

  // Get game state info
  const info = await page.evaluate(() => {
    const health = document.getElementById('health-value')?.textContent;
    const ammo = document.getElementById('ammo-value')?.textContent;
    const score = document.getElementById('score-value')?.textContent;
    const canvas = document.querySelector('#game-container canvas');
    return { health, ammo, score, canvasSize: canvas ? `${canvas.width}x${canvas.height}` : 'none' };
  });
  console.log('Game state:', JSON.stringify(info));

  // Print console logs (filter out noisy WebGL messages)
  console.log('\n--- Browser Console (filtered) ---');
  for (const log of logs) {
    if (log.includes('GPU stall') || log.includes('CONTEXT_LOST') || log.includes('Context Lost') || log.includes('Context Restored')) continue;
    console.log(log);
  }

  await browser.close();
}

run().catch(err => { console.error('Script error:', err.message); process.exit(1); });
