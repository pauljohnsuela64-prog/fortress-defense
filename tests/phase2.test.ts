import { describe, expect, it } from 'vitest';
import { CONFIG, type TowerType } from '../src/GameConfig';
import { GameState } from '../src/GameState';
import { Enemy } from '../src/gameobjects/Enemy';
import { Tower } from '../src/gameobjects/Tower';

describe('tower purchases and upgrades', () => {
  it.each(['archer', 'cannon', 'magic'] as const)('buys %s at its own price and rejects an unaffordable purchase', type => {
    const game = new GameState();
    game.gold = CONFIG.towers[type].cost;
    expect(game.placeTower(1, 1, type)).toBe(true);
    expect(game.towers[0].type).toBe(type);
    expect(game.gold).toBe(0);
    expect(game.placeTower(2, 1, type)).toBe(false);
    expect(game.towers).toHaveLength(1);
  });
  it.each(['archer', 'cannon', 'magic'] as const)('upgrades %s through level 3 without allowing level 4', type => {
    const game = new GameState();
    game.gold = 1000;
    game.placeTower(1, 1, type);
    const tower = game.towers[0];
    for (const level of [2, 3]) {
      const before = tower.stats;
      const gold = game.gold;
      const cost = tower.upgradeCost!;
      expect(game.upgradeTower(tower)).toBe(true);
      expect(tower.level).toBe(level);
      expect(tower.stats.damage).toBeGreaterThan(before.damage);
      expect(tower.stats.cooldown).toBeLessThan(before.cooldown);
      expect(tower.stats.range).toBeGreaterThan(before.range);
      expect(game.gold).toBe(gold - cost);
    }
    const gold = game.gold;
    expect(game.upgradeTower(tower)).toBe(false);
    expect(game.gold).toBe(gold);
    expect(tower.level).toBe(3);
    expect(tower.upgradeCost).toBeNull();
  });
  it('rejects poor, foreign and post-game upgrades without changing state', () => {
    const game = new GameState();
    game.placeTower(1, 1, 'archer');
    const tower = game.towers[0];
    game.gold = tower.upgradeCost! - 1;
    const gold = game.gold;
    expect(game.upgradeTower(tower)).toBe(false);
    expect(game.gold).toBe(gold);
    expect(tower.level).toBe(1);
    game.gold = 1000;
    expect(game.upgradeTower(new Tower(1, 1, 'archer'))).toBe(false);
    game.status = 'victory';
    expect(game.upgradeTower(tower)).toBe(false);
    expect(game.gold).toBe(1000);
  });
  it('keeps an in-flight projectile at its firing level', () => {
    const game = new GameState();
    game.placeTower(1, 1, 'archer');
    const tower = game.towers[0];
    const enemy = new Enemy(200, 0, 10);
    enemy.x = tower.x;
    enemy.y = tower.y;
    const shot = tower.update(0, [enemy])!;
    const damage = tower.stats.damage;
    game.upgradeTower(tower);
    shot.update(1, [enemy]);
    expect(enemy.health).toBe(200 - damage);
  });
});

describe('splash and slow', () => {
  it('damages every live enemy inside splash range once and emits an explosion', () => {
    const tower = new Tower(1, 1, 'cannon');
    const enemies = Array.from({ length: 4 }, () => new Enemy(200, 0, 10));
    enemies.forEach(enemy => { enemy.x = tower.x; enemy.y = tower.y; });
    enemies[1].x += tower.stats.splashRadius;
    enemies[2].x += tower.stats.splashRadius + 1;
    enemies[3].damage(200);
    const shot = tower.update(0, enemies)!;
    const effect = shot.update(1, enemies);
    expect(effect?.radius).toBe(tower.stats.splashRadius);
    shot.update(1, enemies);
    expect(enemies.map(enemy => enemy.health)).toEqual([160, 160, 200, 0]);
  });
  it('settles simultaneous splash kills exactly once and expires visual effects', () => {
    const game = new GameState();
    const tower = new Tower(1, 1, 'cannon');
    const enemies = [new Enemy(10, 0, 12), new Enemy(10, 0, 12)];
    enemies.forEach(enemy => { enemy.x = tower.x; enemy.y = tower.y; });
    game.enemies.push(...enemies);
    game.projectiles.push(tower.update(0, enemies)!, tower.update(2, enemies)!);
    game.update(0.1);
    expect(game.gold).toBe(CONFIG.startGold + 24);
    expect(game.effects).toHaveLength(1);
    game.update(1);
    expect(game.gold).toBe(CONFIG.startGold + 24);
    expect(game.lives).toBe(CONFIG.startLives);
    expect(game.effects).toHaveLength(0);
    expect(game.projectiles).toHaveLength(0);
  });
  it.each(['victory', 'defeat'] as const)('finishes explosion animation after %s without resuming combat', status => {
    const game = new GameState();
    game.status = status;
    game.effects.push({ x: 10, y: 10, radius: 65, remaining: 0.3 });
    game.enemies.push(new Enemy(100, 100, 10));
    game.update(1);
    expect(game.effects).toHaveLength(0);
    expect(game.enemies[0].x).toBe(30);
    expect(game.status).toBe(status);
  });
  it('archer shots only damage their target', () => {
    const tower = new Tower(1, 1, 'archer');
    const enemies = [new Enemy(100, 0, 1), new Enemy(100, 0, 1)];
    enemies.forEach(enemy => { enemy.x = tower.x; enemy.y = tower.y; });
    tower.update(0, enemies)!.update(1, enemies);
    expect(enemies[0].health).toBeLessThan(100);
    expect(enemies[1].health).toBe(100);
  });
  it('magic projectiles damage and slow their target', () => {
    const tower = new Tower(1, 1, 'magic');
    const enemy = new Enemy(100, 100, 1);
    tower.update(0, [enemy])!.update(1, [enemy]);
    expect(enemy.health).toBe(100 - tower.stats.damage);
    const x = enemy.x;
    enemy.update(0.5);
    expect(enemy.x - x).toBeCloseTo(50 * tower.stats.slowFactor);
    expect(enemy.slowRemaining).toBeCloseTo(tower.stats.slowDuration - 0.5);
  });
  it('expires slow partway through a movement step', () => {
    const enemy = new Enemy(100, 100, 1);
    enemy.slow(0.5, 0.5);
    enemy.update(1);
    expect(enemy.x).toBe(105); // 30 + 25 slowed + 50 normal.
    expect(enemy.slowRemaining).toBe(0);
    enemy.update(0.5);
    expect(enemy.x).toBe(155);
  });
  it('refreshes equal slows, replaces with stronger, ignores weaker without stacking', () => {
    const enemy = new Enemy(100, 100, 1);
    enemy.slow(0.6, 1);
    enemy.update(0.5);
    enemy.slow(0.6, 1);
    expect(enemy.slowRemaining).toBe(1);
    enemy.slow(0.4, 0.5);
    enemy.slow(0.8, 10);
    expect(enemy.slowRemaining).toBe(0.5);
    const x = enemy.x;
    enemy.update(0.5);
    expect(enemy.x - x).toBeCloseTo(20);
    expect(enemy.slowRemaining).toBe(0);
  });
});

describe('mixed waves and reset', () => {
  it.each([1 / 60, 1 / 30])('wins with a mixed defense and upgrades at a %s second step', step => {
    const game = new GameState();
    const opening: [number, number, TowerType][] = [[2, 3, 'archer'], [4, 5, 'cannon'], [6, 3, 'magic']];
    opening.forEach(([column, row, type]) => expect(game.placeTower(column, row, type)).toBe(true));
    for (let wave = 0; wave < CONFIG.waves.length; wave++) {
      if (wave > 0) {
        for (const tower of game.towers) game.upgradeTower(tower);
        if (wave === 3) game.placeTower(10, 5, 'cannon');
      }
      expect(game.startWave()).toBe(true);
      for (let frame = 0; frame < 150 / step && game.waves.active && game.status === 'playing'; frame++) game.update(step);
      expect(game.waves.active).toBe(false);
    }
    expect(game.towers.some(tower => tower.level === 3)).toBe(true);
    expect(game.status).toBe('victory');
    expect(game.lives).toBeGreaterThan(0);
  });
  it('spawns the configured enemy pattern with type-specific stats', () => {
    const game = new GameState();
    for (const wave of CONFIG.waves) {
      game.startWave();
      game.waves.update(100, game.enemies);
      expect(game.enemies).toHaveLength(wave.count);
      game.enemies.forEach((enemy, index) => {
        const type = wave.pattern[index % wave.pattern.length];
        expect(enemy.type).toBe(type);
        expect(enemy.speed).toBe(CONFIG.enemies[type].speed);
        expect(enemy.maxHealth).toBe(CONFIG.enemies[type].health * wave.healthScale);
        expect(enemy.reward).toBe(CONFIG.enemies[type].reward);
        enemy.damage(10000);
      });
      game.update(0);
    }
    expect(game.status).toBe('victory');
  });
  it('a fresh game discards upgrades, slow, projectiles, effects and wave state', () => {
    let game = new GameState();
    game.placeTower(1, 1, 'archer');
    game.upgradeTower(game.towers[0]);
    game.startWave();
    game.update(0);
    game.enemies[0].slow(0.5, 2);
    game.projectiles.push(game.towers[0].update(0, game.enemies)!);
    game.effects.push({ x: 10, y: 10, radius: 60, remaining: 0.3 });
    game = new GameState();
    expect(game.gold).toBe(CONFIG.startGold);
    expect(game.towers).toHaveLength(0);
    expect(game.enemies).toHaveLength(0);
    expect(game.projectiles).toHaveLength(0);
    expect(game.effects).toHaveLength(0);
    expect(game.waves.wave).toBe(0);
  });
});
