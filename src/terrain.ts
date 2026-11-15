import type Phaser from 'phaser';
import { CONFIG, PATH, isPath } from './GameConfig';

// Static, deterministic decoration: no textures or randomness are generated during play.
export function drawTerrain(scene: Phaser.Scene) {
  scene.add.text(7, 119, 'INCOMING', { fontFamily: 'system-ui', fontSize: '9px', color: '#34482a', backgroundColor: '#e7d5a5', padding: { x: 4, y: 3 } });
  scene.add.text(PATH[PATH.length - 1].x - 13, PATH[PATH.length - 1].y + 32, 'OAKHEART KEEP', { fontFamily: 'system-ui', fontSize: '9px', color: '#263d2d', fontStyle: 'bold' }).setOrigin(0.5);
  if (scene.textures.exists('woodland-terrain')) {
    scene.add.image(0, 0, 'woodland-terrain').setOrigin(0).setDepth(-1);
    return;
  }
  const g = scene.add.graphics();
  g.fillStyle(0x6f9f48);
  g.fillRect(0, 0, CONFIG.width, CONFIG.height);
  for (let row = 0; row < CONFIG.rows; row++) {
    for (let column = 0; column < CONFIG.columns; column++) {
      const x = column * 60;
      const y = row * 60;
      const seed = column * 31 + row * 17;
      if (isPath(column, row)) {
        g.fillStyle(0xb19465);
        g.fillRect(x, y, 60, 60);
        g.fillStyle(0xcdb783);
        g.fillRect(x + 2, y + 2, 56, 56);
        for (let i = 0; i < 6; i++) {
          const px = x + 5 + (i % 3) * 18 + (seed % 3);
          const py = y + 7 + Math.floor(i / 3) * 25;
          g.fillStyle(i % 2 ? 0xd9c69b : 0xe3d3ad);
          g.fillRoundedRect(px, py, 14 + i % 3, 18, 4);
          g.lineStyle(1, 0xa98f63, 0.5);
          g.lineBetween(px + 2, py + 17, px + 12, py + 17);
        }
        g.lineStyle(3, 0x8c9654);
        if (!isPath(column - 1, row)) g.lineBetween(x + 1, y, x + 1, y + 60);
        if (!isPath(column + 1, row)) g.lineBetween(x + 59, y, x + 59, y + 60);
        if (!isPath(column, row - 1)) g.lineBetween(x, y + 1, x + 60, y + 1);
        if (!isPath(column, row + 1)) g.lineBetween(x, y + 59, x + 60, y + 59);
      } else {
        g.fillStyle((row + column) % 2 ? 0x7fae50 : 0x79a74c);
        g.fillRect(x + 1, y + 1, 58, 58);
        g.fillStyle(0x92b960, 0.35);
        g.fillEllipse(x + 30, y + 31, 45, 38);
        g.lineStyle(1, 0xc4d585, 0.32);
        g.lineBetween(x + 14, y + 19, x + 14, y + 14);
        g.lineBetween(x + 14, y + 14, x + 19, y + 14);
        g.lineBetween(x + 46, y + 41, x + 46, y + 46);
        g.lineBetween(x + 46, y + 46, x + 41, y + 46);
        for (let i = 0; i < 3; i++) {
          const px = x + 5 + (seed + i * 19) % 49;
          const py = y + 5 + (seed * 3 + i * 23) % 49;
          g.lineStyle(1, 0x527d37, 0.55);
          g.lineBetween(px, py, px - 2, py - 4);
          g.lineBetween(px, py, px + 3, py - 3);
        }
        if (seed % 7 === 0) {
          g.fillStyle(0x566a42, 0.3); g.fillEllipse(x + 7, y + 10, 16, 8);
          g.fillStyle(0x9aab83); g.fillRoundedRect(x + 1, y + 1, 12, 8, 3);
          g.fillStyle(0xc5cfab); g.fillEllipse(x + 6, y + 2, 8, 3);
        } else if (seed % 4 === 0) {
          g.fillStyle(seed % 8 ? 0xffeaa0 : 0xe9a4c0);
          g.fillCircle(x + 7, y + 8, 2); g.fillCircle(x + 12, y + 5, 2);
          g.fillStyle(0xfff7cf); g.fillCircle(x + 7, y + 8, 1);
        }
        if ((row === 0 || row === 9) && column % 3 === 1) {
          const tx = x + 6; const ty = y + 10;
          g.fillStyle(0x426c35, 0.35); g.fillEllipse(tx + 3, ty + 7, 23, 12);
          g.fillStyle(0x825532); g.fillRect(tx - 2, ty, 4, 9);
          g.fillStyle(0x35663d); g.fillTriangle(tx - 13, ty + 3, tx + 13, ty + 3, tx, ty - 16);
          g.fillStyle(0x4c8650); g.fillTriangle(tx - 10, ty - 3, tx + 10, ty - 3, tx, ty - 20);
          g.fillStyle(0x75a95a); g.fillTriangle(tx - 6, ty - 10, tx + 7, ty - 10, tx, ty - 23);
        }
      }
    }
  }
  const base = PATH[PATH.length - 1];
  const x = base.x - 13; const y = base.y;
  g.fillStyle(0x344e36, 0.35); g.fillEllipse(x, y + 18, 79, 35);
  g.fillStyle(0x74868b); g.fillRoundedRect(x - 29, y - 23, 58, 49, 4);
  g.fillStyle(0xc9d4ce); g.fillRect(x - 26, y - 25, 52, 43);
  g.lineStyle(1, 0x9dadac);
  for (let i = 0; i < 4; i++) g.lineBetween(x - 26, y - 18 + i * 9, x + 26, y - 18 + i * 9);
  for (const side of [-1, 1]) {
    const tx = x + side * 26;
    g.fillStyle(0x859b9b); g.fillRect(tx - 10, y - 37, 20, 59);
    g.fillStyle(0xd6ded5); g.fillRect(tx - 9, y - 38, 15, 52);
    g.fillStyle(0x3e6c86); g.fillTriangle(tx - 14, y - 38, tx + 14, y - 38, tx, y - 58);
    g.fillStyle(0x71b0b7); g.fillTriangle(tx - 12, y - 39, tx, y - 39, tx, y - 56);
    g.fillStyle(0x455c62); g.fillRoundedRect(tx - 3, y - 28, 6, 12, 3);
  }
  g.fillStyle(0x38474b); g.fillRoundedRect(x - 11, y - 1, 22, 27, 9);
  g.fillStyle(0x805d3f); g.fillRect(x - 8, y + 8, 16, 18);
  g.lineStyle(2, 0xdcbf72); g.lineBetween(x - 7, y + 13, x + 7, y + 13);
  g.fillStyle(0xe7d7a1); g.fillRect(x - 2, y - 64, 3, 30);
  g.fillStyle(0xd46b4c); g.fillTriangle(x + 1, y - 64, x + 20, y - 57, x + 1, y - 49);
  g.generateTexture('woodland-terrain', CONFIG.width, CONFIG.height);
  scene.add.image(0, 0, 'woodland-terrain').setOrigin(0).setDepth(-1);
  g.destroy();
}
