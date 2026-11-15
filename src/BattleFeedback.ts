import { CONFIG } from './GameConfig';
import type { GameState } from './GameState';
import type { Enemy } from './gameobjects/Enemy';
import type { Tower } from './gameobjects/Tower';
import type { Explosion } from './gameobjects/Projectile';
import type { SoundCue } from './GameAudio';

export class BattleFeedback {
  readonly particles = Array.from({ length: 160 }, () => ({ x: 0, y: 0, vx: 0, vy: 0, life: 0, color: 0, size: 0 }));
  readonly labels = Array.from({ length: 16 }, () => ({ x: 0, y: 0, text: '', color: 0, life: 0, active: false }));
  private enemies = new Map<Enemy, { health: number; flash: number }>();
  private towers = new Map<Tower, { shots: number; pulse: number }>();
  private explosions = new WeakSet<Explosion>();
  private particleIndex = 0;
  private labelIndex = 0;
  private ended = false;

  constructor(private sound: (cue: SoundCue) => void = () => {}) {}

  towerPulse(tower: Tower) { return this.towers.get(tower)?.pulse ?? 0; }
  enemyFlash(enemy: Enemy) { return this.enemies.get(enemy)?.flash ?? 0; }

  burst(x: number, y: number, color: number, count: number) {
    for (let i = 0; i < count; i++) {
      const particle = this.particles[this.particleIndex++ % this.particles.length];
      const angle = i * 2.39996;
      particle.x = x; particle.y = y;
      particle.vx = Math.cos(angle) * (25 + i * 4);
      particle.vy = Math.sin(angle) * (25 + i * 4) - 20;
      particle.life = 0.45; particle.color = color; particle.size = 2 + i % 3;
    }
  }

  label(x: number, y: number, text: string, color: number) {
    const label = this.labels[this.labelIndex++ % this.labels.length];
    label.x = x; label.y = y; label.text = text; label.color = color; label.life = 0.8; label.active = true;
  }

  update(state: GameState, seconds: number) {
    for (const particle of this.particles) {
      if (particle.life <= 0) continue;
      particle.life = Math.max(0, particle.life - seconds);
      particle.x += particle.vx * seconds; particle.y += particle.vy * seconds;
      particle.vy += 80 * seconds;
    }
    for (const label of this.labels) {
      label.life = Math.max(0, label.life - seconds);
      label.y -= seconds * 22; label.active = label.life > 0;
    }
    for (const tower of state.towers) {
      let visual = this.towers.get(tower);
      if (!visual) { visual = { shots: 0, pulse: 0 }; this.towers.set(tower, visual); }
      visual.pulse = Math.max(0, visual.pulse - seconds);
      if (visual.shots !== tower.shotsFired) {
        visual.shots = tower.shotsFired; visual.pulse = 0.18;
        this.sound(tower.type);
      }
    }
    for (const enemy of state.enemies) {
      if (!this.enemies.has(enemy)) this.enemies.set(enemy, { health: enemy.health, flash: 0 });
    }
    for (const [enemy, visual] of this.enemies) {
      visual.flash = Math.max(0, visual.flash - seconds);
      if (enemy.status !== 'alive') {
        if (enemy.status === 'dead') {
          this.burst(enemy.x, enemy.y, CONFIG.enemies[enemy.type].color, 10);
          this.label(enemy.x, enemy.y - 22, `+${enemy.reward}`, 0xffdf65);
          this.sound('death');
        }
        this.enemies.delete(enemy);
      } else if (enemy.health < visual.health) {
        this.label(enemy.x, enemy.y - 20, `-${Math.round(visual.health - enemy.health)}`, 0xffffff);
        this.burst(enemy.x, enemy.y, enemy.slowRemaining > 0 ? 0xc6a4ff : 0xffe5ad, 4);
        visual.health = enemy.health; visual.flash = 0.12;
      }
    }
    for (const effect of state.effects) {
      if (this.explosions.has(effect)) continue;
      this.explosions.add(effect);
      this.burst(effect.x, effect.y, 0xffb74d, 16);
      this.sound('explosion');
    }
    if (!this.ended && state.status !== 'playing') {
      this.ended = true;
      this.sound(state.status);
    }
  }

  reset() {
    this.enemies.clear(); this.towers.clear(); this.explosions = new WeakSet();
    this.particles.forEach(particle => particle.life = 0);
    this.labels.forEach(label => { label.life = 0; label.active = false; });
    this.particleIndex = 0; this.labelIndex = 0; this.ended = false;
  }
}
