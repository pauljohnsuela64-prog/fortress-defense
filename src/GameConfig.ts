export const CONFIG = {
  width: 960, height: 600, cell: 60, columns: 16, rows: 10,
  startGold: 180, startLives: 10,
  tower: { cost: 60, range: 155, damage: 24, cooldown: 0.65 },
  projectileSpeed: 420,
  waves: [
    { count: 8, health: 60, speed: 52, reward: 12, interval: 1.1 },
    { count: 12, health: 90, speed: 58, reward: 14, interval: 0.9 },
    { count: 16, health: 125, speed: 65, reward: 16, interval: 0.8 },
    { count: 20, health: 165, speed: 72, reward: 18, interval: 0.7 },
    { count: 24, health: 210, speed: 80, reward: 20, interval: 0.6 },
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
