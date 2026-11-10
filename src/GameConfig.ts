export type TowerType = 'archer' | 'cannon' | 'magic';
export type EnemyType = 'normal' | 'fast' | 'tank';
export type TowerStats = Readonly<{
  damage: number; cooldown: number; range: number;
  splashRadius: number; slowFactor: number; slowDuration: number;
}>;

export const CONFIG = {
  width: 960, height: 600, cell: 60, columns: 16, rows: 10,
  startGold: 210, startLives: 10,
  towers: {
    archer: {
      name: 'Archer Tower', cost: 40, description: 'Rapid single-target arrows', color: 0xa9d783,
      upgrades: [45, 75],
      levels: [
        { damage: 14, cooldown: 0.35, range: 150, splashRadius: 0, slowFactor: 1, slowDuration: 0 },
        { damage: 23, cooldown: 0.30, range: 165, splashRadius: 0, slowFactor: 1, slowDuration: 0 },
        { damage: 36, cooldown: 0.25, range: 180, splashRadius: 0, slowFactor: 1, slowDuration: 0 },
      ],
    },
    cannon: {
      name: 'Cannon Tower', cost: 100, description: 'Heavy area explosions', color: 0xe9b16e,
      upgrades: [90, 140],
      levels: [
        { damage: 40, cooldown: 1.5, range: 165, splashRadius: 65, slowFactor: 1, slowDuration: 0 },
        { damage: 65, cooldown: 1.3, range: 180, splashRadius: 75, slowFactor: 1, slowDuration: 0 },
        { damage: 95, cooldown: 1.1, range: 195, splashRadius: 90, slowFactor: 1, slowDuration: 0 },
      ],
    },
    magic: {
      name: 'Magic Tower', cost: 70, description: 'Arcane bolts slow enemies', color: 0xbaabff,
      upgrades: [65, 100],
      levels: [
        { damage: 10, cooldown: 0.85, range: 145, splashRadius: 0, slowFactor: 0.6, slowDuration: 1.6 },
        { damage: 16, cooldown: 0.75, range: 160, splashRadius: 0, slowFactor: 0.5, slowDuration: 2 },
        { damage: 24, cooldown: 0.65, range: 180, splashRadius: 0, slowFactor: 0.4, slowDuration: 2.4 },
      ],
    },
  },
  enemies: {
    normal: { health: 60, speed: 52, reward: 12, color: 0xdb775d },
    fast: { health: 38, speed: 100, reward: 10, color: 0xf1cd71 },
    tank: { health: 220, speed: 34, reward: 28, color: 0x9eabbc },
  },
  projectileSpeed: 420,
  explosionDuration: 0.35,
  waves: [
    { count: 8, pattern: ['normal'], healthScale: 1, interval: 1.1 },
    { count: 12, pattern: ['normal', 'fast', 'normal'], healthScale: 1.2, interval: 0.85 },
    { count: 16, pattern: ['normal', 'fast', 'tank'], healthScale: 1.4, interval: 0.8 },
    { count: 20, pattern: ['fast', 'normal', 'tank', 'fast'], healthScale: 1.6, interval: 0.7 },
    { count: 24, pattern: ['tank', 'fast', 'normal', 'tank', 'fast'], healthScale: 1.9, interval: 0.65 },
  ],
} as const;

export function cellCenter(column: number, row: number) {
  return { x: column * CONFIG.cell + CONFIG.cell / 2, y: row * CONFIG.cell + CONFIG.cell / 2 };
}

export const PATH = [[0, 2], [3, 2], [3, 6], [7, 6], [7, 2], [11, 2], [11, 8], [15, 8]]
  .map(([column, row]) => cellCenter(column, row));

export function isPath(column: number, row: number): boolean {
  const { x, y } = cellCenter(column, row);
  return PATH.slice(1).some((end, index) => {
    const start = PATH[index];
    return x >= Math.min(start.x, end.x) && x <= Math.max(start.x, end.x)
      && y >= Math.min(start.y, end.y) && y <= Math.max(start.y, end.y);
  });
}
