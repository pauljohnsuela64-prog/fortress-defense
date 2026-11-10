import type Phaser from 'phaser';
import { CONFIG } from './GameConfig';
import type { GameState } from './GameState';

export function drawActors(graphics: Phaser.GameObjects.Graphics, state: GameState, time: number) {
  graphics.clear();
  for (const tower of state.towers) {
    const { x, y, angle, type, level } = tower;
    const color = CONFIG.towers[type].color;
    graphics.fillStyle(0x102b29);
    graphics.fillCircle(x, y + 3, 23);
    graphics.fillStyle(type === 'cannon' ? 0x8d7254 : type === 'magic' ? 0x61517f : 0x567f55);
    graphics.fillRoundedRect(x - 17, y - 17, 34, 34, type === 'cannon' ? 3 : 10);
    if (level === 3) {
      graphics.lineStyle(3, 0xffdc87);
      graphics.strokeCircle(x, y, 23);
      graphics.fillStyle(0xffdc87);
      graphics.fillTriangle(x - 8, y - 22, x + 8, y - 22, x, y - 29);
    }
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    graphics.lineStyle(type === 'cannon' ? 11 : 3, color);
    if (type === 'magic') {
      graphics.fillStyle(color);
      graphics.fillTriangle(x, y - 19, x - 10, y, x + 10, y);
      graphics.fillTriangle(x, y + 13, x - 10, y, x + 10, y);
      graphics.lineStyle(2, 0xe3d8ff, 0.65);
      graphics.strokeCircle(x, y, 13 + Math.sin(time / 250) * 2);
      for (let i = 0; i < level; i++) {
        const orbit = time / 700 + i * Math.PI * 2 / level;
        graphics.fillCircle(x + Math.cos(orbit) * 20, y + Math.sin(orbit) * 20, 2);
      }
    } else {
      graphics.lineBetween(x, y, x + dx * 27, y + dy * 27);
      if (type === 'archer') {
        graphics.lineBetween(x - dy * 13, y + dx * 13, x + dx * 8, y + dy * 8);
        graphics.lineBetween(x + dy * 13, y - dx * 13, x + dx * 8, y + dy * 8);
        graphics.lineStyle(1, 0xe5eaca);
        graphics.lineBetween(x - dy * 13, y + dx * 13, x + dy * 13, y - dx * 13);
      } else {
        graphics.fillStyle(0xf3d29a);
        graphics.fillCircle(x, y, 9);
      }
    }
    graphics.fillStyle(level === 3 ? 0xffdc87 : color);
    for (let i = 0; i < level; i++) graphics.fillRect(x - (level * 7 - 2) / 2 + i * 7, y + 13, 5, 4);
  }
  for (const enemy of state.enemies) {
    const { x, y, type } = enemy;
    const size = type === 'tank' ? 16 : 12;
    graphics.fillStyle(0x081b19, 0.5);
    graphics.fillEllipse(x, y + 9, size * 2 + 5, 16);
    graphics.fillStyle(CONFIG.enemies[type].color);
    if (type === 'fast') graphics.fillTriangle(x + 14, y, x - 10, y - 10, x - 10, y + 10);
    else if (type === 'tank') {
      graphics.fillRoundedRect(x - size, y - size, size * 2, size * 2, 4);
      graphics.lineStyle(3, 0x526173);
      graphics.strokeRect(x - 9, y - 9, 18, 18);
    } else graphics.fillCircle(x, y, size);
    if (enemy.slowRemaining > 0) {
      graphics.lineStyle(2, 0xc3b1ff);
      graphics.strokeCircle(x, y, size + 4);
    }
    graphics.fillStyle(0x132722);
    graphics.fillRect(x - 16, y - size - 11, 32, 5);
    graphics.fillStyle(0x9fe0a1);
    graphics.fillRect(x - 16, y - size - 11, 32 * enemy.health / enemy.maxHealth, 5);
  }
  for (const shot of state.projectiles) {
    graphics.fillStyle(CONFIG.towers[shot.type].color);
    if (shot.type === 'archer') {
      const angle = Math.atan2(shot.target.y - shot.y, shot.target.x - shot.x);
      graphics.lineStyle(2, 0xdaf1b1);
      graphics.lineBetween(shot.x, shot.y, shot.x - Math.cos(angle) * 10, shot.y - Math.sin(angle) * 10);
    } else {
      graphics.fillCircle(shot.x, shot.y, shot.type === 'cannon' ? 5 : 4);
      if (shot.type === 'magic') {
        graphics.lineStyle(2, 0xc8b5ff, 0.45);
        graphics.strokeCircle(shot.x, shot.y, 7 + Math.sin(time / 70) * 2);
      }
    }
  }
  for (const effect of state.effects) {
    const fade = effect.remaining / CONFIG.explosionDuration;
    const radius = effect.radius * (1 - fade * 0.7);
    graphics.fillStyle(0xffb759, fade * 0.3);
    graphics.fillCircle(effect.x, effect.y, radius);
    graphics.lineStyle(3, 0xffd996, fade);
    graphics.strokeCircle(effect.x, effect.y, radius);
  }
}
