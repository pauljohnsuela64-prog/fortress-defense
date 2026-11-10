import { PATH } from '../GameConfig';

export class Enemy {
  x = PATH[0].x;
  y = PATH[0].y;
  health: number;
  status: 'alive' | 'dead' | 'escaped' = 'alive';
  settled = false;
  private waypoint = 1;

  constructor(readonly maxHealth: number, readonly speed: number, readonly reward: number) {
    this.health = maxHealth;
  }

  damage(amount: number) {
    if (this.status !== 'alive' || !Number.isFinite(amount) || amount <= 0) return;
    this.health = Math.max(0, this.health - amount);
    if (this.health === 0) this.status = 'dead';
  }

  update(seconds: number) {
    if (this.status !== 'alive') return;
    let distance = this.speed * seconds;
    while (distance > 0 && this.waypoint < PATH.length) {
      const target = PATH[this.waypoint];
      const remaining = Math.hypot(target.x - this.x, target.y - this.y);
      if (distance >= remaining) {
        this.x = target.x;
        this.y = target.y;
        distance -= remaining;
        this.waypoint++;
      } else {
        this.x += (target.x - this.x) / remaining * distance;
        this.y += (target.y - this.y) / remaining * distance;
        distance = 0;
      }
    }
    if (this.waypoint === PATH.length) this.status = 'escaped';
  }
}
