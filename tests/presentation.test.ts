import { describe, expect, it } from 'vitest';
import { BattleFeedback } from '../src/BattleFeedback';
import { GameAudio } from '../src/GameAudio';
import { GameState } from '../src/GameState';
import { Enemy } from '../src/gameobjects/Enemy';

describe('audio settings and unavailable devices', () => {
  it('clamps volume, rejects non-finite input and keeps mute independent', () => {
    const audio = new GameAudio(() => { throw new Error('unavailable'); });
    audio.setVolume(2);
    expect(audio.volume).toBe(1);
    audio.setVolume(-1);
    expect(audio.volume).toBe(0);
    audio.setVolume(0.4);
    audio.setVolume(NaN);
    expect(audio.volume).toBe(0.4);
    audio.setMuted(true);
    expect(audio.muted).toBe(true);
    audio.setMuted(false);
    expect(audio.volume).toBe(0.4);
  });
  it('never throws when audio is unavailable, including restart and disposal', async () => {
    const audio = new GameAudio(() => { throw new Error('no sound device'); });
    await expect(audio.unlock()).resolves.toBeUndefined();
    expect(() => audio.play('cannon')).not.toThrow();
    expect(() => audio.stopAll()).not.toThrow();
    expect(() => audio.dispose()).not.toThrow();
    await expect(audio.unlock()).resolves.toBeUndefined();
  });
  it('reuses the initialized context, applies gain, and closes it on disposal', async () => {
    let created = 0;
    let closed = 0;
    const gain = { gain: { value: 0 }, connect() {} };
    // AudioContext is a browser boundary; this minimal device exposes the lifecycle under test.
    const audio = new GameAudio(() => {
      created++;
      return { state: 'running', createGain: () => gain, destination: {}, close: async () => { closed++; } } as unknown as AudioContext;
    });
    await audio.unlock();
    await audio.unlock();
    expect(created).toBe(1);
    audio.setVolume(0.6);
    expect(gain.gain.value).toBe(0.6);
    audio.setMuted(true);
    expect(gain.gain.value).toBe(0);
    audio.setMuted(false);
    expect(gain.gain.value).toBe(0.6);
    audio.dispose();
    expect(closed).toBe(1);
    await audio.unlock();
    expect(created).toBe(1);
  });
});

describe('presentation feedback', () => {
  it('emits damage/death/reward feedback once without modifying combat', () => {
    const game = new GameState();
    const feedback = new BattleFeedback();
    const enemy = new Enemy(60, 0, 12);
    game.enemies.push(enemy);
    feedback.update(game, 0);
    enemy.damage(14);
    feedback.update(game, 0.01);
    expect(feedback.labels.some(label => label.active && label.text === '-14')).toBe(true);
    enemy.damage(60);
    game.update(0);
    const gold = game.gold;
    feedback.update(game, 0.01);
    expect(feedback.labels.filter(label => label.active && label.text === '+12').length).toBe(1);
    feedback.update(game, 0.01);
    expect(feedback.labels.filter(label => label.active && label.text === '+12').length).toBe(1);
    expect(game.gold).toBe(gold);
    expect(game.lives).toBe(10);
    feedback.update(game, 2);
    expect(feedback.particles.every(particle => particle.life === 0)).toBe(true);
    expect(feedback.labels.every(label => !label.active)).toBe(true);
  });
  it('bounds particle/label storage and resets all visual state', () => {
    const feedback = new BattleFeedback();
    for (let i = 0; i < 500; i++) {
      feedback.burst(10, 10, 0xffffff, 12);
      feedback.label(10, 10, '+12', 0xffcc00);
    }
    expect(feedback.particles).toHaveLength(160);
    expect(feedback.labels).toHaveLength(16);
    feedback.reset();
    expect(feedback.particles.every(particle => particle.life === 0)).toBe(true);
    expect(feedback.labels.every(label => !label.active)).toBe(true);
  });
  it('does not change a complete game outcome or random state', () => {
    const plain = new GameState();
    const decorated = new GameState();
    const feedback = new BattleFeedback();
    for (const game of [plain, decorated]) {
      game.placeTower(2, 3, 'archer');
      game.placeTower(4, 5, 'cannon');
      game.placeTower(6, 3, 'magic');
    }
    for (let wave = 0; wave < 5; wave++) {
      for (const game of [plain, decorated]) {
        game.towers.forEach(tower => game.upgradeTower(tower));
        game.startWave();
      }
      for (let frame = 0; frame < 9000 && plain.waves.active && plain.status === 'playing'; frame++) {
        plain.update(1 / 60);
        decorated.update(1 / 60);
        feedback.update(decorated, 1 / 60);
      }
      expect(decorated.gold).toBe(plain.gold);
      expect(decorated.lives).toBe(plain.lives);
      expect(decorated.status).toBe(plain.status);
    }
    expect(decorated.status).toBe('victory');
  });
});
