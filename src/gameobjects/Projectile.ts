import { CONFIG, type TowerStats, type TowerType } from '../GameConfig';
import { Enemy } from './Enemy';

export type Explosion = { x: number; y: number; radius: number; remaining: number };

export class Projectile {
  active = true;
  constructor(public x: number, public y: number, readonly target: Enemy,
    readonly type: TowerType = 'archer', readonly stats: TowerStats = CONFIG.towers[type].levels[0]) {}

  update(seconds: number, enemies: Enemy[] = [this.target]): Explosion | undefined {
    if (!this.active) return;
    if (this.target.status !== 'alive') {
      this.active = false;
      return;
    }
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const distance = Math.hypot(dx, dy);
    const travel = CONFIG.projectileSpeed * seconds;
    if (distance <= travel) {
      this.x = this.target.x;
      this.y = this.target.y;
      this.active = false;
      if (this.stats.splashRadius > 0) {
        for (const enemy of enemies) {
          if (enemy.status === 'alive' && Math.hypot(enemy.x - this.x, enemy.y - this.y) <= this.stats.splashRadius) {
            enemy.damage(this.stats.damage);
          }
        }
        return { x: this.x, y: this.y, radius: this.stats.splashRadius, remaining: CONFIG.explosionDuration };
      }
      this.target.damage(this.stats.damage);
      if (this.stats.slowDuration > 0) this.target.slow(this.stats.slowFactor, this.stats.slowDuration);
    } else {
      this.x += dx / distance * travel;
      this.y += dy / distance * travel;
    }
  }
}
