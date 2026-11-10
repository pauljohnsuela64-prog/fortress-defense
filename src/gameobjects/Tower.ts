import { CONFIG, cellCenter } from '../GameConfig';
import { Enemy } from './Enemy';
import { Projectile } from './Projectile';

export class Tower {
  readonly x: number;
  readonly y: number;
  angle = -Math.PI / 2;
  private cooldown = 0;

  constructor(readonly column: number, readonly row: number) {
    const point = cellCenter(column, row);
    this.x = point.x;
    this.y = point.y;
  }

  update(seconds: number, enemies: Enemy[]): Projectile | null {
    this.cooldown = Math.max(0, this.cooldown - seconds);
    const target = enemies.find(enemy => enemy.status === 'alive'
      && Math.hypot(enemy.x - this.x, enemy.y - this.y) <= CONFIG.tower.range);
    if (!target) return null;
    this.angle = Math.atan2(target.y - this.y, target.x - this.x);
    if (this.cooldown > 0) return null;
    this.cooldown = CONFIG.tower.cooldown;
    return new Projectile(this.x, this.y, target);
  }
}
