import { CONFIG, isPath } from './GameConfig';
import { Enemy } from './gameobjects/Enemy';
import { Tower } from './gameobjects/Tower';
import { Projectile } from './gameobjects/Projectile';
import { WaveManager } from './WaveManager';

export class GameState {
  gold: number = CONFIG.startGold;
  lives: number = CONFIG.startLives;
  status: 'playing' | 'victory' | 'defeat' = 'playing';
  towers: Tower[] = [];
  enemies: Enemy[] = [];
  projectiles: Projectile[] = [];
  waves = new WaveManager();

  placementError(column: number, row: number): string | null {
    if (this.status !== 'playing') return 'Game finished. Restart to play again.';
    if (!Number.isInteger(column) || !Number.isInteger(row) || column < 0 || row < 0
      || column >= CONFIG.columns || row >= CONFIG.rows) return 'Choose a battlefield tile.';
    if (isPath(column, row)) return 'Keep the enemy path clear.';
    if (this.towers.some(tower => tower.column === column && tower.row === row)) return 'A tower already occupies this tile.';
    if (this.gold < CONFIG.tower.cost) return `You need ${CONFIG.tower.cost} gold to build.`;
    return null;
  }

  placeTower(column: number, row: number): boolean {
    if (this.placementError(column, row)) return false;
    this.gold -= CONFIG.tower.cost;
    this.towers.push(new Tower(column, row));
    return true;
  }

  startWave(): boolean { return this.status === 'playing' && this.waves.start(); }

  update(seconds: number) {
    if (this.status !== 'playing' || !Number.isFinite(seconds) || seconds < 0) return;
    this.enemies.forEach(enemy => enemy.update(seconds));
    for (const tower of this.towers) {
      const shot = tower.update(seconds, this.enemies);
      if (shot) this.projectiles.push(shot);
    }
    this.projectiles.forEach(shot => shot.update(seconds));
    for (const enemy of this.enemies) {
      if (enemy.status === 'alive' || enemy.settled) continue;
      enemy.settled = true;
      if (enemy.status === 'dead') this.gold += enemy.reward;
      else this.lives = Math.max(0, this.lives - 1);
    }
    this.enemies = this.enemies.filter(enemy => enemy.status === 'alive');
    this.projectiles = this.projectiles.filter(shot => shot.active);
    if (this.lives === 0) {
      this.status = 'defeat';
      return;
    }
    this.waves.update(seconds, this.enemies);
    if (this.waves.complete) this.status = 'victory';
  }
}
