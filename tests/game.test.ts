import { describe, expect, it } from 'vitest';
import { CONFIG, PATH, cellCenter } from '../src/GameConfig';
import { Enemy } from '../src/gameobjects/Enemy';
import { Tower } from '../src/gameobjects/Tower';
import { Projectile } from '../src/gameobjects/Projectile';
import { GameState } from '../src/GameState';
import { WaveManager } from '../src/WaveManager';

describe('placement and economy', () => {
  it('rejects path, occupied, outside and fractional cells without spending', () => {
    const game = new GameState();
    const gold = game.gold;
    for (const cell of [[0, 2], [-1, 0], [16, 0], [0.5, 0], [NaN, 0]]) {
      expect(game.placeTower(cell[0], cell[1])).toBe(false);
    }
    expect(game.gold).toBe(gold);
    expect(game.placeTower(1, 0)).toBe(true);
    expect(game.placeTower(1, 0)).toBe(false);
    expect(game.gold).toBe(gold - CONFIG.towers.archer.cost);
  });
  it('rejects purchases without enough gold', () => {
    const game = new GameState();
    game.gold = CONFIG.towers.archer.cost - 1;
    expect(game.placeTower(1, 0)).toBe(false);
    expect(game.towers).toHaveLength(0);
  });
});

describe('combat and settlement', () => {
  it('follows corners even with a large movement step', () => {
    const enemy = new Enemy(100, 100, 10);
    enemy.update(2);
    expect(enemy.x).toBe(PATH[1].x);
    expect(enemy.y).toBe(PATH[0].y + 20);
  });
  it('rewards a kill only once and never deducts a life for it', () => {
    const game = new GameState();
    const enemy = new Enemy(10, 50, 12);
    game.enemies.push(enemy);
    enemy.damage(10);
    enemy.damage(10);
    game.update(0);
    game.update(100);
    expect(game.gold).toBe(CONFIG.startGold + 12);
    expect(game.lives).toBe(CONFIG.startLives);
  });
  it('deducts a life once for an escape without rewarding it', () => {
    const game = new GameState();
    game.enemies.push(new Enemy(10, 10000, 12));
    game.update(10);
    game.update(10);
    expect(game.lives).toBe(CONFIG.startLives - 1);
    expect(game.gold).toBe(CONFIG.startGold);
  });
  it('targets live enemies in range and respects cooldown', () => {
    const tower = new Tower(1, 1);
    const enemy = new Enemy(100, 0, 10);
    Object.assign(enemy, cellCenter(1, 2));
    expect(tower.update(0, [enemy])).toBeInstanceOf(Projectile);
    expect(tower.update(0, [enemy])).toBeNull();
    enemy.damage(100);
    expect(tower.update(10, [enemy])).toBeNull();
    const distant = new Enemy(10, 0, 1);
    distant.x = 900;
    expect(tower.update(10, [distant])).toBeNull();
  });
  it('projectiles hit once and expire when their target is gone', () => {
    const enemy = new Enemy(100, 0, 10);
    const shot = new Projectile(enemy.x, enemy.y, enemy);
    shot.update(1);
    shot.update(1);
    expect(enemy.health).toBe(100 - CONFIG.towers.archer.levels[0].damage);
    const lateShot = new Projectile(0, 0, enemy);
    enemy.damage(100);
    lateShot.update(1);
    expect(lateShot.active).toBe(false);
  });
});

describe('waves and end states', () => {
  it('can win five waves through real targeting, projectiles and purchases', () => {
    const game = new GameState();
    const positions = [[2, 3], [4, 5], [6, 3], [8, 3], [10, 5], [12, 7], [6, 5], [8, 5], [10, 3], [12, 3]];
    let next = 0;
    for (let wave = 0; wave < CONFIG.waves.length; wave++) {
      while (next < positions.length && game.gold >= CONFIG.towers.archer.cost) {
        expect(game.placeTower(...positions[next] as [number, number])).toBe(true);
        next++;
      }
      expect(game.startWave()).toBe(true);
      for (let frame = 0; frame < 120 * 60 && game.waves.active && game.status === 'playing'; frame++) {
        game.update(1 / 60);
      }
      expect(game.waves.active).toBe(false);
    }
    expect(game.status).toBe('victory');
    expect(game.lives).toBeGreaterThan(0);
  });
  it('loses an undefended game through normal wave spawning and movement', () => {
    const game = new GameState();
    game.startWave();
    for (let frame = 0; frame < 120 * 60 && game.waves.active; frame++) game.update(1 / 60);
    expect(game.lives).toBe(CONFIG.startLives - CONFIG.waves[0].count);
    game.startWave();
    for (let frame = 0; frame < 120 * 60 && game.status === 'playing'; frame++) game.update(1 / 60);
    expect(game.status).toBe('defeat');
    expect(game.lives).toBe(0);
  });
  it('rejects overlapping starts and waits for surviving enemies', () => {
    const waves = new WaveManager();
    expect(waves.start()).toBe(true);
    expect(waves.start()).toBe(false);
    const spawned: Enemy[] = [];
    waves.update(100, spawned);
    expect(spawned).toHaveLength(CONFIG.waves[0].count);
    expect(waves.active).toBe(true);
    spawned.length = 0;
    waves.update(0, spawned);
    expect(waves.active).toBe(false);
  });
  it('wins only after all configured waves are cleared', () => {
    const game = new GameState();
    for (const wave of CONFIG.waves) {
      expect(game.startWave()).toBe(true);
      game.waves.update(100, game.enemies);
      expect(game.enemies).toHaveLength(wave.count);
      game.enemies.forEach(enemy => enemy.damage(10000));
      game.update(0);
    }
    expect(game.status).toBe('victory');
    expect(game.startWave()).toBe(false);
    expect(game.placeTower(1, 0)).toBe(false);
  });
  it('loses at zero lives and a new game resets all state', () => {
    const game = new GameState();
    game.lives = 1;
    game.enemies.push(new Enemy(10, 10000, 10));
    game.update(10);
    expect(game.status).toBe('defeat');
    expect(game.startWave()).toBe(false);
    const fresh = new GameState();
    expect(fresh.lives).toBe(CONFIG.startLives);
    expect(fresh.gold).toBe(CONFIG.startGold);
    expect(fresh.waves.wave).toBe(0);
    expect(fresh.towers).toHaveLength(0);
    expect(fresh.status).toBe('playing');
  });
});
