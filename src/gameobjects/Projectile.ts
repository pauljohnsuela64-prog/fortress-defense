import { CONFIG } from '../GameConfig';
import { Enemy } from './Enemy';

export class Projectile {
  active = true;
  constructor(public x: number, public y: number, readonly target: Enemy) {}

  update(seconds: number) {
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
      this.target.damage(CONFIG.tower.damage);
      this.active = false;
    } else {
      this.x += dx / distance * travel;
      this.y += dy / distance * travel;
    }
  }
}
