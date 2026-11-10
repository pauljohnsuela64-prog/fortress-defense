import type Phaser from 'phaser';
import { CONFIG } from './GameConfig';
import type { GameState } from './GameState';
import type { BattleFeedback } from './BattleFeedback';

export function drawActors(g: Phaser.GameObjects.Graphics, state: GameState, time: number, feedback: BattleFeedback, reducedMotion = false) {
  g.clear();
  const clock = reducedMotion ? 0 : time;
  for (const tower of state.towers) {
    const { x, y, angle, type, level } = tower;
    const pulse = reducedMotion ? 0 : feedback.towerPulse(tower) / 0.18;
    const dx = Math.cos(angle); const dy = Math.sin(angle);
    g.fillStyle(0x254531, 0.3); g.fillEllipse(x + 3, y + 14, 49, 24);
    if (type === 'archer') {
      g.fillStyle(0x725033); g.fillRect(x - 16, y - 8, 32, 30);
      g.fillStyle(0xa67c49); g.fillRect(x - 14, y - 10, 28, 25);
      g.lineStyle(2, 0xd6b579);
      g.lineBetween(x - 13, y + 15, x + 13, y - 7); g.lineBetween(x + 13, y + 15, x - 13, y - 7);
      g.fillStyle(0x62462d); g.fillRoundedRect(x - 21, y - 20, 42, 18, 3);
      g.fillStyle(0xd3ad6b); g.fillRoundedRect(x - 21, y - 23, 42, 16, 3);
      g.lineStyle(1, 0xa17a4a);
      for (let i = 0; i < 3; i++) g.lineBetween(x - 18, y - 19 + i * 4, x + 18, y - 19 + i * 4);
      g.fillStyle(0x4e7d48); g.fillCircle(x, y - 18, 9);
      g.fillStyle(0xf4ce92); g.fillCircle(x + dx * 3, y - 20 + dy * 3, 5);
      g.fillStyle(0x365e3b); g.fillTriangle(x - 8, y - 22, x + 8, y - 22, x + 3, y - 33);
      g.lineStyle(3, 0x70442a);
      const bx = x + dx * (14 - pulse * 3); const by = y - 18 + dy * (14 - pulse * 3);
      g.lineBetween(bx - dy * 9, by + dx * 9, bx + dx * 4, by + dy * 4);
      g.lineBetween(bx + dy * 9, by - dx * 9, bx + dx * 4, by + dy * 4);
      g.lineStyle(1, 0xffecc5); g.lineBetween(bx - dy * 9, by + dx * 9, bx + dy * 9, by - dx * 9);
    } else if (type === 'cannon') {
      g.fillStyle(0x697979); g.fillRoundedRect(x - 21, y - 12, 42, 33, 5);
      g.fillStyle(0xafb7a4); g.fillRoundedRect(x - 20, y - 18, 40, 29, 4);
      g.lineStyle(1, 0x7d8e82); g.lineBetween(x - 20, y + 1, x + 20, y + 1); g.lineBetween(x, y + 1, x, y + 11);
      g.fillStyle(0x596a6b); g.fillCircle(x, y - 10, 16);
      g.lineStyle(16, 0x354b53); g.lineBetween(x - dx * pulse * 5, y - 10 - dy * pulse * 5, x + dx * (28 - pulse * 7), y - 10 + dy * (28 - pulse * 7));
      g.lineStyle(7, 0x769092); g.lineBetween(x, y - 14, x + dx * (24 - pulse * 7), y - 14 + dy * (24 - pulse * 7));
      g.fillStyle(0xe3bc65); g.fillCircle(x, y - 10, 5);
      if (pulse > 0.65) { g.fillStyle(0xffdf84, pulse); g.fillCircle(x + dx * 33, y - 10 + dy * 33, 8 * pulse); }
    } else {
      g.fillStyle(0x6e6994); g.fillEllipse(x, y + 13, 43, 23);
      g.fillStyle(0xc4c2d0); g.fillEllipse(x, y + 7, 42, 22);
      g.fillStyle(0x8985ac); g.fillRoundedRect(x - 12, y - 4, 24, 17, 3);
      const bob = Math.sin(clock / 380) * 2;
      g.fillStyle(0xbba1ff, 0.13 + pulse * 0.15); g.fillCircle(x, y - 15, 25 + pulse * 5);
      g.fillStyle(0x8055c3); g.fillTriangle(x, y - 37 + bob, x - 12, y - 13 + bob, x, y + 1 + bob);
      g.fillStyle(0xc4a0ff); g.fillTriangle(x, y - 37 + bob, x + 12, y - 13 + bob, x, y + 1 + bob);
      g.fillStyle(0xf0dbff); g.fillTriangle(x, y - 35 + bob, x + 6, y - 15 + bob, x, y - 9 + bob);
      g.lineStyle(2, 0xd8bdff, 0.8); g.strokeEllipse(x, y - 2, 43, 15);
      for (let i = 0; i < 3; i++) {
        const a = clock / 900 + i * Math.PI * 2 / 3;
        g.fillStyle(0xf1d8ff); g.fillCircle(x + Math.cos(a) * 21, y - 2 + Math.sin(a) * 7, 2);
      }
    }
    if (level >= 2) {
      g.lineStyle(3, level === 3 ? 0xffd568 : 0xd2dce1);
      g.strokeRoundedRect(x - 20, y + 7, 40, 12, 3);
      g.fillStyle(level === 3 ? 0xffd568 : 0xd2dce1);
      g.fillCircle(x - 18, y + 12, 3); g.fillCircle(x + 18, y + 12, 3);
    }
    if (level === 3) {
      g.lineStyle(2, 0xffdc79, 0.7); g.strokeEllipse(x, y + 15, 51, 27);
      g.fillStyle(0xa6504c); g.fillRect(x + 19, y - 36, 3, 31);
      g.fillStyle(0xf8d377); g.fillTriangle(x + 22, y - 36, x + 34, y - 31, x + 22, y - 23);
      g.fillStyle(0xffe7a3); g.fillCircle(x, y - 43, 3);
    }
    g.fillStyle(0x304d3c, 0.8); g.fillRoundedRect(x - 12, y + 21, 24, 8, 3);
    g.fillStyle(level === 3 ? 0xffdc79 : 0xf2e7bc);
    for (let i = 0; i < level; i++) g.fillCircle(x - (level - 1) * 3 + i * 6, y + 25, 2);
  }
  for (const enemy of state.enemies) {
    const { x, y, type } = enemy;
    const tank = type === 'tank'; const fast = type === 'fast';
    const walk = reducedMotion ? 0 : Math.sin(clock / (fast ? 65 : 110) + x * 0.1 + y * 0.1) * (fast ? 3 : 2);
    const hit = feedback.enemyFlash(enemy) > 0;
    g.fillStyle(0x2b4230, 0.3); g.fillEllipse(x + 2, y + 11, tank ? 36 : 27, 13);
    g.lineStyle(tank ? 7 : 5, 0x574b3a);
    g.lineBetween(x - 5, y + 4, x - 6 - walk, y + 12); g.lineBetween(x + 5, y + 4, x + 6 + walk, y + 12);
    g.fillStyle(hit ? 0xfff5d7 : tank ? 0x647386 : fast ? 0xb67d3d : 0xa45943);
    g.fillRoundedRect(x - (tank ? 14 : 9), y - 12, tank ? 28 : 18, 23, tank ? 5 : 7);
    if (tank) {
      g.fillStyle(hit ? 0xffffff : 0xabbcc1); g.fillRoundedRect(x - 12, y - 14, 24, 16, 5);
      g.fillStyle(0x344752); g.fillRect(x - 8, y - 8, 16, 4);
      g.fillStyle(0xbecad0); g.fillRoundedRect(x - 19, y - 5, 9, 21, 3);
      g.lineStyle(2, 0xe8d092); g.lineBetween(x - 15, y - 2, x - 15, y + 13);
    } else {
      g.fillStyle(hit ? 0xffffff : fast ? 0xe4bc70 : 0xabc078); g.fillCircle(x, y - 12, 8);
      g.fillStyle(fast ? 0x9b5937 : 0x4c6a3c); g.fillTriangle(x - 10, y - 14, x + 10, y - 14, x + (fast ? -6 : 2), y - 25);
      g.fillStyle(0x354733); g.fillRect(x - 4, y - 13, 2, 2); g.fillRect(x + 3, y - 13, 2, 2);
      if (fast) { g.lineStyle(2, 0xf2df98, 0.6); g.lineBetween(x - 19, y, x - 12, y); g.lineBetween(x - 22, y + 5, x - 14, y + 5); }
    }
    if (enemy.slowRemaining > 0) {
      g.lineStyle(2, 0xdcc7ff); g.strokeEllipse(x, y + 9, 34, 16);
      g.fillStyle(0xe8dbff); g.fillCircle(x - 17, y + 8 + Math.sin(clock / 180) * 3, 2);
    }
    g.fillStyle(0x263f35); g.fillRoundedRect(x - 18, y - 33, 36, 6, 2);
    g.fillStyle(enemy.health / enemy.maxHealth > 0.4 ? 0xb9e87c : 0xf3a56b);
    g.fillRoundedRect(x - 17, y - 32, 34 * enemy.health / enemy.maxHealth, 4, 1);
  }
  for (const shot of state.projectiles) {
    const angle = Math.atan2(shot.target.y - shot.y, shot.target.x - shot.x);
    const dx = Math.cos(angle); const dy = Math.sin(angle);
    if (shot.type === 'archer') {
      g.lineStyle(2, 0x79543a); g.lineBetween(shot.x, shot.y, shot.x - dx * 15, shot.y - dy * 15);
      g.fillStyle(0xf6efcd); g.fillTriangle(shot.x + dx * 4, shot.y + dy * 4, shot.x - dy * 3, shot.y + dx * 3, shot.x + dy * 3, shot.y - dx * 3);
      g.lineStyle(3, 0xc8e095); g.lineBetween(shot.x - dx * 13 - dy * 2, shot.y - dy * 13 + dx * 2, shot.x - dx * 17, shot.y - dy * 17);
    } else if (shot.type === 'cannon') {
      g.fillStyle(0x31444b); g.fillCircle(shot.x, shot.y, 6);
      g.fillStyle(0xa9b4a1); g.fillCircle(shot.x - 2, shot.y - 2, 2);
    } else {
      g.lineStyle(5, 0xb193ff, 0.4); g.lineBetween(shot.x, shot.y, shot.x - dx * 17, shot.y - dy * 17);
      g.fillStyle(0xbda2ff, 0.3); g.fillCircle(shot.x, shot.y, 9);
      g.fillStyle(0xf1ddff); g.fillCircle(shot.x, shot.y, 4);
    }
  }
  for (const effect of state.effects) {
    const fade = effect.remaining / CONFIG.explosionDuration;
    const radius = effect.radius * (1 - fade * 0.75);
    g.fillStyle(0xffb74d, fade * 0.3); g.fillCircle(effect.x, effect.y, radius);
    g.lineStyle(3, 0xffe49a, fade); g.strokeCircle(effect.x, effect.y, radius);
    g.fillStyle(0xfff2bf, fade * 0.6); g.fillCircle(effect.x, effect.y, radius * 0.4);
  }
  for (const particle of feedback.particles) {
    if (particle.life <= 0 || reducedMotion) continue;
    g.fillStyle(particle.color, Math.min(1, particle.life * 3));
    g.fillCircle(particle.x, particle.y, particle.size);
  }
}
