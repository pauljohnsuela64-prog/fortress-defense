import Phaser from 'phaser';
import { CONFIG, PATH, cellCenter, isPath, type TowerType } from '../GameConfig';
import { GameState } from '../GameState';
import { Tower } from '../gameobjects/Tower';
import { drawActors } from '../rendering';

export class GameScene extends Phaser.Scene {
  private state = new GameState();
  private actors!: Phaser.GameObjects.Graphics;
  private preview!: Phaser.GameObjects.Graphics;
  private endText!: Phaser.GameObjects.Text;
  private selected = { column: 1, row: 1 };
  private buildType: TowerType = 'archer';
  private selectedTower: Tower | null = null;
  private hudKey = '';
  private hud = document.querySelector<HTMLElement>('#hud')!;
  private message = document.querySelector<HTMLElement>('#message')!;
  private startButton = document.querySelector<HTMLButtonElement>('#start-wave')!;
  private restartButton = document.querySelector<HTMLButtonElement>('#restart')!;
  private shop = document.querySelector<HTMLElement>('#tower-shop')!;
  private upgradeTitle = document.querySelector<HTMLElement>('#upgrade-title')!;
  private upgradeStats = document.querySelector<HTMLElement>('#upgrade-stats')!;
  private upgradeSpecial = document.querySelector<HTMLElement>('#upgrade-special')!;
  private upgradeButton = document.querySelector<HTMLButtonElement>('#upgrade-button')!;
  private waveIntel = document.querySelector<HTMLElement>('#wave-intel')!;

  constructor() { super('GameScene'); }

  create() {
    this.state = new GameState();
    this.selected = { column: 1, row: 1 };
    this.buildType = 'archer';
    this.selectedTower = null;
    this.hudKey = '';
    this.shop.replaceChildren();
    for (const type of Object.keys(CONFIG.towers) as TowerType[]) {
      const tower = CONFIG.towers[type];
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.tower = type;
      button.className = `shop-card ${type}`;
      button.innerHTML = `<span class="tower-icon" aria-hidden="true"></span><span class="shop-copy"><strong>${tower.name}</strong><small>${tower.description}</small></span><span class="price">${tower.cost}<small>gold</small></span>`;
      button.addEventListener('click', () => {
        this.buildType = type;
        this.selectedTower = null;
        this.message.textContent = `${tower.name} selected. Choose grass to build for ${tower.cost} gold.`;
        this.refreshHud();
      });
      this.shop.append(button);
    }
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
    const upgrade = () => {
      if (!this.selectedTower) return;
      this.message.textContent = this.state.upgradeTower(this.selectedTower)
        ? `${CONFIG.towers[this.selectedTower.type].name} upgraded to Level ${this.selectedTower.level}.`
        : 'Upgrade unavailable. Check your gold and tower level.';
      this.refreshHud();
    };
    this.startButton.addEventListener('click', start);
    this.restartButton.addEventListener('click', restart);
    this.upgradeButton.addEventListener('click', upgrade);
    const canvas = this.game.canvas;
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'application');
    canvas.setAttribute('aria-label', 'Battlefield. Arrow keys select a tile. Enter builds or inspects a tower. Tab reaches the shop and upgrade controls. Escape clears tower selection.');
    const keydown = (event: KeyboardEvent) => {
      const { column, row } = this.selected;
      switch (event.key) {
        case 'ArrowLeft': this.selected.column = Math.max(0, column - 1); break;
        case 'ArrowRight': this.selected.column = Math.min(CONFIG.columns - 1, column + 1); break;
        case 'ArrowUp': this.selected.row = Math.max(0, row - 1); break;
        case 'ArrowDown': this.selected.row = Math.min(CONFIG.rows - 1, row + 1); break;
        case 'Enter': this.build(); break;
        case 'Escape': this.selectedTower = null; this.refreshHud(); break;
        default: return;
      }
      event.preventDefault();
      if (event.key.startsWith('Arrow')) {
        this.selectedTower = null;
        this.refreshHud();
        const tower = this.towerAt(this.selected.column, this.selected.row);
        this.message.textContent = `Tile ${this.selected.column + 1}, ${this.selected.row + 1}: ${tower ? `${CONFIG.towers[tower.type].name}, Level ${tower.level}. Enter to inspect.` : this.state.placementError(this.selected.column, this.selected.row, this.buildType) ?? 'Buildable. Press Enter to build.'}`;
      }
    };
    canvas.addEventListener('keydown', keydown);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.startButton.removeEventListener('click', start);
      this.restartButton.removeEventListener('click', restart);
      this.upgradeButton.removeEventListener('click', upgrade);
      this.shop.replaceChildren();
      canvas.removeEventListener('keydown', keydown);
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => this.select(pointer));
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.wasTouch && !pointer.leftButtonDown()) return;
      canvas.focus({ preventScroll: true });
      this.select(pointer);
      this.build();
    });
    this.message.textContent = 'Build towers on grass, then start the first wave. Select a placed tower to upgrade it.';
    this.refreshHud();
  }

  private select(pointer: Phaser.Input.Pointer) {
    this.selected = { column: Math.floor(pointer.x / CONFIG.cell), row: Math.floor(pointer.y / CONFIG.cell) };
  }

  private build() {
    const { column, row } = this.selected;
    this.selectedTower = this.towerAt(column, row);
    if (this.selectedTower) {
      this.message.textContent = `${CONFIG.towers[this.selectedTower.type].name}, Level ${this.selectedTower.level}. Upgrade details are in the tower panel.`;
    } else {
      const error = this.state.placementError(column, row, this.buildType);
      this.message.textContent = error ?? `${CONFIG.towers[this.buildType].name} built. Select it to view upgrades.`;
      if (!error) this.state.placeTower(column, row, this.buildType);
    }
    this.refreshHud();
  }

  private towerAt(column: number, row: number) {
    return this.state.towers.find(tower => tower.column === column && tower.row === row) ?? null;
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

  update(time: number, delta: number) {
    // Cap background-tab catch-up so returning players do not lose unseen waves.
    this.state.update(Math.min(delta / 1000, 0.05));
    drawActors(this.actors, this.state, time);
    this.preview.clear();
    if (this.state.status === 'playing') {
      const { column, row } = this.selectedTower ?? this.selected;
      const point = cellCenter(column, row);
      const valid = this.selectedTower !== null || !this.state.placementError(column, row, this.buildType);
      this.preview.lineStyle(2, valid ? 0xb8efd0 : 0xff9b80, 0.9);
      this.preview.strokeRect(column * CONFIG.cell + 3, row * CONFIG.cell + 3, CONFIG.cell - 6, CONFIG.cell - 6);
      this.preview.lineStyle(1, valid ? 0xb8efd0 : 0xff9b80, 0.3);
      this.preview.strokeCircle(point.x, point.y, this.selectedTower?.stats.range ?? CONFIG.towers[this.buildType].levels[0].range);
    } else if (!this.endText.visible) {
      const result = this.state.status === 'victory' ? 'VICTORY\nThe fortress stands.' : 'GAME OVER\nThe fortress has fallen.';
      this.endText.setText(result).setVisible(true);
      this.message.textContent = `${result.replace('\n', '. ')} Press Restart to play again.`;
    }
    this.refreshHud();
  }

  private refreshHud() {
    const tower = this.selectedTower;
    const key = `${this.state.gold},${this.state.lives},${this.state.waves.wave},${this.state.waves.active},${this.state.status},${this.buildType},${tower?.column},${tower?.row},${tower?.level}`;
    if (key === this.hudKey) return;
    this.hudKey = key;
    const text = `Gold ${this.state.gold}  ·  Lives ${this.state.lives}  ·  Wave ${this.state.waves.wave} / ${CONFIG.waves.length}`;
    if (this.hud.textContent !== text) this.hud.textContent = text;
    this.startButton.disabled = this.state.status !== 'playing' || this.state.waves.active;
    const label = this.state.waves.active ? 'Wave in progress' : this.state.status === 'playing' ? 'Start Wave' : 'Battle finished';
    if (this.startButton.textContent !== label) this.startButton.textContent = label;
    this.shop.querySelectorAll<HTMLButtonElement>('button').forEach(button => {
      const type = button.dataset.tower as TowerType;
      button.setAttribute('aria-pressed', String(type === this.buildType && !tower));
      button.classList.toggle('unaffordable', this.state.gold < CONFIG.towers[type].cost);
      button.disabled = this.state.status !== 'playing';
    });
    this.upgradeTitle.textContent = tower ? `${CONFIG.towers[tower.type].name} · Level ${tower.level}` : 'Inspect a tower';
    this.upgradeStats.innerHTML = tower
      ? `<div><dt>Damage</dt><dd>${tower.stats.damage}</dd></div><div><dt>Attack speed</dt><dd>${(1 / tower.stats.cooldown).toFixed(2)}/s</dd></div><div><dt>Range</dt><dd>${tower.stats.range}</dd></div>` : '';
    this.upgradeSpecial.textContent = tower
      ? tower.type === 'magic' ? `Slows by ${Math.round((1 - tower.stats.slowFactor) * 100)}% for ${tower.stats.slowDuration}s. Does not stack.`
        : tower.type === 'cannon' ? `Splash radius ${tower.stats.splashRadius}. Hits every enemy in the blast.`
          : 'Fast single-target attacks. Strong against scattered enemies.'
      : 'Click or tap a placed tower to see its stats and upgrades.';
    this.upgradeButton.hidden = !tower;
    this.upgradeButton.disabled = !tower || tower.upgradeCost === null || this.state.gold < tower.upgradeCost || this.state.status !== 'playing';
    this.upgradeButton.textContent = !tower ? 'Upgrade' : tower.upgradeCost === null ? 'Maximum level reached'
      : `Level ${tower.level + 1} · ${tower.upgradeCost} gold${this.state.gold < tower.upgradeCost ? ' (need more gold)' : ''}`;
    const waveIndex = this.state.waves.active ? this.state.waves.wave - 1 : this.state.waves.wave;
    const wave = CONFIG.waves[waveIndex];
    this.waveIntel.textContent = wave ? `${this.state.waves.active ? 'Incoming' : 'Next wave'}: ${wave.count} enemies · ${[...new Set(wave.pattern)].join(', ')}` : 'All five waves cleared.';
  }
}
