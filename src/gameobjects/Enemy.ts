import { PATH, type EnemyType } from '../GameConfig';

export class Enemy {
  x = PATH[0].x;
  y = PATH[0].y;
  health: number;
  status: 'alive' | 'dead' | 'escaped' = 'alive';
  settled = false;
  private waypoint = 1;
  slowRemaining = 0;
  private slowFactor = 1;

  constructor(readonly maxHealth: number, readonly speed: number, readonly reward: number, readonly type: EnemyType = 'normal') {
    this.health = maxHealth;
  }

  slow(factor: number, duration: number) {
    if (this.status !== 'alive' || !Number.isFinite(factor) || !Number.isFinite(duration)
      || factor <= 0 || factor >= 1 || duration <= 0) return;
    // A weaker hit must not prolong an existing stronger slow.
    if (this.slowRemaining > 0 && factor > this.slowFactor) return;
    this.slowFactor = factor;
    this.slowRemaining = duration;
  }

  damage(amount: number) {
    if (this.status !== 'alive' || !Number.isFinite(amount) || amount <= 0) return;
    this.health = Math.max(0, this.health - amount);
    if (this.health === 0) this.status = 'dead';
  }

  update(seconds: number) {
    if (this.status !== 'alive') return;
    const slowedTime = Math.min(seconds, this.slowRemaining);
    let distance = this.speed * (slowedTime * this.slowFactor + seconds - slowedTime);
    this.slowRemaining = Math.max(0, this.slowRemaining - seconds);
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
