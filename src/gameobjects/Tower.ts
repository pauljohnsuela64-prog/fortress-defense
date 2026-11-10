import { CONFIG, cellCenter, type TowerType, type TowerStats } from '../GameConfig';
import { Enemy } from './Enemy';
import { Projectile } from './Projectile';

export class Tower {
  readonly x: number;
  readonly y: number;
  angle = -Math.PI / 2;
  private cooldown = 0;
  private currentLevel = 1;

  get level() { return this.currentLevel; }
  get stats(): TowerStats { return CONFIG.towers[this.type].levels[this.level - 1]; }
  get upgradeCost(): number | null { return CONFIG.towers[this.type].upgrades[this.level - 1] ?? null; }

  upgrade() {
    if (this.upgradeCost === null) return false;
    this.currentLevel++;
    return true;
  }

  constructor(readonly column: number, readonly row: number, readonly type: TowerType = 'archer') {
    const point = cellCenter(column, row);
    this.x = point.x;
    this.y = point.y;
  }

  update(seconds: number, enemies: Enemy[]): Projectile | null {
    this.cooldown = Math.max(0, this.cooldown - seconds);
    const target = enemies.find(enemy => enemy.status === 'alive'
      && Math.hypot(enemy.x - this.x, enemy.y - this.y) <= this.stats.range);
    if (!target) return null;
    this.angle = Math.atan2(target.y - this.y, target.x - this.x);
    if (this.cooldown > 0) return null;
    this.cooldown = this.stats.cooldown;
    return new Projectile(this.x, this.y, target, this.type, this.stats);
  }
}
