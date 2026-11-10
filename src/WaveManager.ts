import { CONFIG } from './GameConfig';
import { Enemy } from './gameobjects/Enemy';

export class WaveManager {
  wave = 0;
  active = false;
  private remaining = 0;
  private delay = 0;

  get complete() { return this.wave === CONFIG.waves.length && !this.active; }

  start(): boolean {
    if (this.active || this.complete) return false;
    this.remaining = CONFIG.waves[this.wave].count;
    this.wave++;
    this.delay = 0;
    this.active = true;
    return true;
  }

  update(seconds: number, enemies: Enemy[]) {
    if (!this.active) return;
    const settings = CONFIG.waves[this.wave - 1];
    this.delay -= seconds;
    while (this.remaining > 0 && this.delay <= 0) {
      const type = settings.pattern[(settings.count - this.remaining) % settings.pattern.length];
      const enemy = CONFIG.enemies[type];
      enemies.push(new Enemy(enemy.health * settings.healthScale, enemy.speed, enemy.reward, type));
      this.remaining--;
      this.delay += settings.interval;
    }
    if (this.remaining === 0 && enemies.length === 0) this.active = false;
  }
}
