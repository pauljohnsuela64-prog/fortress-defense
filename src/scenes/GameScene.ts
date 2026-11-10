import Phaser from 'phaser';
import { CONFIG, PATH, cellCenter, isPath } from '../GameConfig';
import { GameState } from '../GameState';

export class GameScene extends Phaser.Scene {
  private state = new GameState();
  private actors!: Phaser.GameObjects.Graphics;
  private preview!: Phaser.GameObjects.Graphics;
  private endText!: Phaser.GameObjects.Text;
  private selected = { column: 1, row: 1 };
  private hud = document.querySelector<HTMLElement>('#hud')!;
  private message = document.querySelector<HTMLElement>('#message')!;
  private startButton = document.querySelector<HTMLButtonElement>('#start-wave')!;
  private restartButton = document.querySelector<HTMLButtonElement>('#restart')!;

  constructor() { super('GameScene'); }

  create() {
    this.state = new GameState();
    this.selected = { column: 1, row: 1 };
    document.querySelector<HTMLElement>('#tower-label')!.textContent = `Cannon tower · ${CONFIG.tower.cost} gold`;
    this.drawMap();
    this.preview = this.add.graphics();
    this.actors = this.add.graphics();
    this.endText = this.add.text(CONFIG.width / 2, CONFIG.height / 2, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '36px', color: '#f4e8c1',
      backgroundColor: '#102321', padding: { x: 40, y: 28 }, align: 'center',
    }).setOrigin(0.5).setDepth(10).setVisible(false);
    const start = () => {
      if (this.state.startWave()) this.message.textContent = 'Wave incoming. Keep building to hold the line.';
      this.refreshHud();
    };
    const restart = () => this.scene.restart();
    this.startButton.addEventListener('click', start);
    this.restartButton.addEventListener('click', restart);
    const canvas = this.game.canvas;
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'application');
    canvas.setAttribute('aria-label', 'Battlefield. Use arrow keys to select a tile and Enter to build a tower.');
    const keydown = (event: KeyboardEvent) => {
      const { column, row } = this.selected;
      switch (event.key) {
        case 'ArrowLeft': this.selected.column = Math.max(0, column - 1); break;
        case 'ArrowRight': this.selected.column = Math.min(CONFIG.columns - 1, column + 1); break;
        case 'ArrowUp': this.selected.row = Math.max(0, row - 1); break;
        case 'ArrowDown': this.selected.row = Math.min(CONFIG.rows - 1, row + 1); break;
        case 'Enter': this.build(); break;
        default: return;
      }
      event.preventDefault();
      if (event.key !== 'Enter') {
        this.message.textContent = `Tile ${this.selected.column + 1}, ${this.selected.row + 1}: ${this.state.placementError(this.selected.column, this.selected.row) ?? 'Buildable. Press Enter to build.'}`;
      }
    };
    canvas.addEventListener('keydown', keydown);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.startButton.removeEventListener('click', start);
      this.restartButton.removeEventListener('click', restart);
      canvas.removeEventListener('keydown', keydown);
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => this.select(pointer));
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.leftButtonDown()) return;
      canvas.focus();
      this.select(pointer);
      this.build();
    });
    this.message.textContent = `Build towers on grass (${CONFIG.tower.cost} gold each), then start the first wave.`;
    this.refreshHud();
  }

  private select(pointer: Phaser.Input.Pointer) {
    this.selected = { column: Math.floor(pointer.x / CONFIG.cell), row: Math.floor(pointer.y / CONFIG.cell) };
  }

  private build() {
    const { column, row } = this.selected;
    const error = this.state.placementError(column, row);
    this.message.textContent = error ?? 'Tower built. Its cannon fires automatically at enemies in range.';
    if (!error) this.state.placeTower(column, row);
    this.refreshHud();
  }

  private drawMap() {
    const map = this.add.graphics();
    for (let row = 0; row < CONFIG.rows; row++) {
      for (let column = 0; column < CONFIG.columns; column++) {
        const path = isPath(column, row);
        map.fillStyle(path ? 0x927952 : (column + row) % 2 ? 0x193b34 : 0x1d4138);
        map.fillRect(column * CONFIG.cell, row * CONFIG.cell, CONFIG.cell - 1, CONFIG.cell - 1);
        if (!path && (column * 7 + row * 3) % 5 === 0) {
          map.fillStyle(0x2d5343);
          map.fillCircle(column * CONFIG.cell + 16, row * CONFIG.cell + 18, 3);
          map.fillCircle(column * CONFIG.cell + 24, row * CONFIG.cell + 16, 2);
        }
      }
    }
    map.lineStyle(2, 0xe0c18a, 0.35);
    map.beginPath();
    map.moveTo(PATH[0].x, PATH[0].y);
    PATH.slice(1).forEach(point => map.lineTo(point.x, point.y));
    map.strokePath();
    const base = PATH[PATH.length - 1];
    map.fillStyle(0xbed3cd);
    map.fillRect(base.x - 22, base.y - 20, 44, 40);
    map.fillRect(base.x - 26, base.y - 27, 12, 15);
    map.fillRect(base.x + 14, base.y - 27, 12, 15);
    map.fillStyle(0x17302e);
    map.fillRect(base.x - 7, base.y + 1, 14, 19);
    this.add.text(8, 105, 'ENTRY →', { fontSize: '12px', color: '#f4d49a' });
    this.add.text(base.x - 10, base.y + 32, 'FORTRESS', { fontSize: '11px', color: '#d9ebe4' }).setOrigin(0.5);
  }

  update(_time: number, delta: number) {
    // Cap background-tab catch-up so returning players do not lose unseen waves.
    this.state.update(Math.min(delta / 1000, 0.05));
    const graphics = this.actors.clear();
    for (const tower of this.state.towers) {
      graphics.fillStyle(0x102b29);
      graphics.fillCircle(tower.x, tower.y + 3, 23);
      graphics.fillStyle(0x6da99d);
      graphics.fillRoundedRect(tower.x - 17, tower.y - 17, 34, 34, 6);
      graphics.lineStyle(10, 0xd4e5d3);
      graphics.lineBetween(tower.x, tower.y, tower.x + Math.cos(tower.angle) * 28, tower.y + Math.sin(tower.angle) * 28);
      graphics.fillStyle(0xe8c777);
      graphics.fillCircle(tower.x, tower.y, 9);
    }
    for (const enemy of this.state.enemies) {
      graphics.fillStyle(0x081b19, 0.5);
      graphics.fillEllipse(enemy.x, enemy.y + 9, 29, 16);
      graphics.fillStyle(0xdb775d);
      graphics.fillCircle(enemy.x, enemy.y, 12);
      graphics.fillStyle(0xffd0a1);
      graphics.fillTriangle(enemy.x - 6, enemy.y - 3, enemy.x + 6, enemy.y - 3, enemy.x, enemy.y + 6);
      graphics.fillStyle(0x132722);
      graphics.fillRect(enemy.x - 16, enemy.y - 23, 32, 5);
      graphics.fillStyle(0x9fe0a1);
      graphics.fillRect(enemy.x - 16, enemy.y - 23, 32 * enemy.health / enemy.maxHealth, 5);
    }
    graphics.fillStyle(0xffe6a0);
    this.state.projectiles.forEach(shot => graphics.fillCircle(shot.x, shot.y, 4));
    this.preview.clear();
    if (this.state.status === 'playing') {
      const { column, row } = this.selected;
      const point = cellCenter(column, row);
      const valid = !this.state.placementError(column, row);
      this.preview.lineStyle(2, valid ? 0xb8efd0 : 0xff9b80, 0.9);
      this.preview.strokeRect(column * CONFIG.cell + 3, row * CONFIG.cell + 3, CONFIG.cell - 6, CONFIG.cell - 6);
      this.preview.lineStyle(1, valid ? 0xb8efd0 : 0xff9b80, 0.3);
      this.preview.strokeCircle(point.x, point.y, CONFIG.tower.range);
    } else if (!this.endText.visible) {
      const result = this.state.status === 'victory' ? 'VICTORY\nThe fortress stands.' : 'GAME OVER\nThe fortress has fallen.';
      this.endText.setText(result).setVisible(true);
      this.message.textContent = `${result.replace('\n', '. ')} Press Restart to play again.`;
    }
    this.refreshHud();
  }

  private refreshHud() {
    const text = `Gold ${this.state.gold}  ·  Lives ${this.state.lives}  ·  Wave ${this.state.waves.wave} / ${CONFIG.waves.length}`;
    if (this.hud.textContent !== text) this.hud.textContent = text;
    this.startButton.disabled = this.state.status !== 'playing' || this.state.waves.active;
    const label = this.state.waves.active ? 'Wave in progress' : this.state.status === 'playing' ? 'Start Wave' : 'Battle finished';
    if (this.startButton.textContent !== label) this.startButton.textContent = label;
  }
}
