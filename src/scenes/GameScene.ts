import Phaser from 'phaser';
import { CONFIG, cellCenter, type TowerType } from '../GameConfig';
import { GameState } from '../GameState';
import { Tower } from '../gameobjects/Tower';
import { drawActors } from '../rendering';
import { drawTerrain } from '../terrain';
import { BattleFeedback } from '../BattleFeedback';
import { GameAudio } from '../GameAudio';
import { TOWER_ART } from '../towerArtwork';

export class GameScene extends Phaser.Scene {
  private state = new GameState();
  private actors!: Phaser.GameObjects.Graphics;
  private preview!: Phaser.GameObjects.Graphics;
  private audio = new GameAudio();
  private disposeAudio = () => this.audio.dispose();
  private feedback = new BattleFeedback(cue => this.audio.play(cue));
  private labels: Phaser.GameObjects.Text[] = [];
  private reducedMotion = false;
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
  private result = document.querySelector<HTMLElement>('#battle-result')!;
  private resultRestart = document.querySelector<HTMLButtonElement>('#result-restart')!;
  private muteButton = document.querySelector<HTMLButtonElement>('#mute')!;
  private volumeSlider = document.querySelector<HTMLInputElement>('#volume')!;

  constructor() { super('GameScene'); }

  create() {
    this.events.off(Phaser.Scenes.Events.DESTROY, this.disposeAudio);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.disposeAudio);
    this.state = new GameState();
    this.selected = { column: 1, row: 1 };
    this.buildType = 'archer';
    this.selectedTower = null;
    this.hudKey = '';
    this.feedback.reset();
    this.result.hidden = true;
    this.shop.replaceChildren();
    for (const type of Object.keys(CONFIG.towers) as TowerType[]) {
      const tower = CONFIG.towers[type];
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.tower = type;
      button.className = `shop-card ${type}`;
      button.innerHTML = `<svg class="tower-art" viewBox="0 0 64 64" aria-hidden="true">${TOWER_ART[type]}</svg><span class="shop-copy"><strong>${tower.name}</strong><small>${tower.description}</small></span><span class="price">${tower.cost}<small>gold</small></span>`;
      button.addEventListener('click', () => {
        this.buildType = type;
        this.selectedTower = null;
        this.message.textContent = `${tower.name} selected. Choose grass to build for ${tower.cost} gold.`;
        this.refreshHud();
      });
      this.shop.append(button);
    }
    drawTerrain(this);
    this.preview = this.add.graphics();
    this.actors = this.add.graphics();
    this.labels = this.feedback.labels.map(() => this.add.text(0, 0, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '14px', fontStyle: 'bold', stroke: '#304536', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(5).setVisible(false));
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const setMotion = () => { this.reducedMotion = motion.matches; };
    setMotion();
    motion.addEventListener('change', setMotion);
    const unlock = () => { void this.audio.unlock(); };
    const syncAudio = () => {
      this.muteButton.textContent = this.audio.muted ? 'Sound off' : 'Sound on';
      this.muteButton.setAttribute('aria-pressed', String(this.audio.muted));
      this.muteButton.setAttribute('aria-label', this.audio.muted ? 'Unmute sound' : 'Mute sound');
      this.volumeSlider.value = String(Math.round(this.audio.volume * 100));
      this.volumeSlider.setAttribute('aria-valuetext', `${Math.round(this.audio.volume * 100)} percent`);
    };
    const mute = () => { this.audio.setMuted(!this.audio.muted); syncAudio(); };
    const volume = () => { this.audio.setVolume(Number(this.volumeSlider.value) / 100); syncAudio(); };
    const visibility = () => { if (document.hidden) this.audio.stopAll(); };
    syncAudio();
    document.addEventListener('pointerdown', unlock, { passive: true });
    document.addEventListener('keydown', unlock);
    document.addEventListener('visibilitychange', visibility);
    this.muteButton.addEventListener('click', mute);
    this.volumeSlider.addEventListener('input', volume);
    const start = () => {
      if (this.state.startWave()) this.message.textContent = 'Wave incoming. Keep building to hold the line.';
      this.refreshHud();
    };
    const restart = () => { this.scene.restart(); this.game.canvas.focus({ preventScroll: true }); };
    const upgrade = () => {
      if (!this.selectedTower) return;
      const upgraded = this.state.upgradeTower(this.selectedTower);
      if (upgraded) { this.audio.play('upgrade'); this.feedback.burst(this.selectedTower.x, this.selectedTower.y, 0xffdb77, 12); }
      this.message.textContent = upgraded
        ? `${CONFIG.towers[this.selectedTower.type].name} upgraded to Level ${this.selectedTower.level}.`
        : 'Upgrade unavailable. Check your gold and tower level.';
      this.refreshHud();
    };
    this.startButton.addEventListener('click', start);
    this.restartButton.addEventListener('click', restart);
    this.upgradeButton.addEventListener('click', upgrade);
    this.resultRestart.addEventListener('click', restart);
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
      this.resultRestart.removeEventListener('click', restart);
      this.muteButton.removeEventListener('click', mute);
      this.volumeSlider.removeEventListener('input', volume);
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
      document.removeEventListener('visibilitychange', visibility);
      motion.removeEventListener('change', setMotion);
      this.audio.stopAll();
      this.feedback.reset();
      this.labels = [];
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
      if (!error && this.state.placeTower(column, row, this.buildType)) this.audio.play('purchase');
    }
    this.refreshHud();
  }

  private towerAt(column: number, row: number) {
    return this.state.towers.find(tower => tower.column === column && tower.row === row) ?? null;
  }

  update(time: number, delta: number) {
    // Cap background-tab catch-up so returning players do not lose unseen waves.
    const seconds = Math.min(delta / 1000, 0.05);
    this.state.update(seconds);
    this.feedback.update(this.state, seconds);
    drawActors(this.actors, this.state, time, this.feedback, this.reducedMotion);
    for (let i = 0; i < this.labels.length; i++) {
      const source = this.feedback.labels[i];
      const label = this.labels[i];
      label.setVisible(source.active);
      if (!source.active) continue;
      if (label.text !== source.text) label.setText(source.text).setColor(`#${source.color.toString(16).padStart(6, '0')}`);
      label.setPosition(source.x, source.y).setAlpha(Math.min(1, source.life * 3));
    }
    this.preview.clear();
    if (this.state.status === 'playing') {
      const { column, row } = this.selectedTower ?? this.selected;
      const point = cellCenter(column, row);
      const valid = this.selectedTower !== null || !this.state.placementError(column, row, this.buildType);
      this.preview.fillStyle(valid ? 0xe4ffb1 : 0xff6d58, 0.12);
      this.preview.fillRoundedRect(column * CONFIG.cell + 3, row * CONFIG.cell + 3, CONFIG.cell - 6, CONFIG.cell - 6, 8);
      this.preview.lineStyle(3, valid ? 0xf1ffc7 : 0xff755b, 0.95);
      this.preview.strokeRect(column * CONFIG.cell + 3, row * CONFIG.cell + 3, CONFIG.cell - 6, CONFIG.cell - 6);
      this.preview.lineStyle(2, valid ? 0xf1ffc7 : 0xff755b, 0.45);
      this.preview.strokeCircle(point.x, point.y, this.selectedTower?.stats.range ?? CONFIG.towers[this.buildType].levels[0].range);
    } else if (this.result.hidden) {
      const won = this.state.status === 'victory';
      this.result.hidden = false;
      this.result.dataset.outcome = this.state.status;
      document.querySelector<HTMLElement>('#result-title')!.textContent = won ? 'The keep stands!' : 'The keep has fallen';
      document.querySelector<HTMLElement>('#result-detail')!.textContent = won
        ? `Five waves defeated. ${this.state.lives} lives remain. Oakheart is safe.`
        : `You held the road until wave ${this.state.waves.wave}. Rebuild and try a new defense.`;
      this.message.textContent = won ? 'Victory! All five waves cleared.' : 'Defeat. Restart to defend the keep again.';
      this.resultRestart.focus({ preventScroll: true });
    }
    this.refreshHud();
  }

  private refreshHud() {
    const tower = this.selectedTower;
    const key = `${this.state.gold},${this.state.lives},${this.state.waves.wave},${this.state.waves.active},${this.state.status},${this.buildType},${tower?.column},${tower?.row},${tower?.level}`;
    if (key === this.hudKey) return;
    this.hudKey = key;
    this.hud.innerHTML = `<span class="stat gold-stat"><span>Gold </span><strong>${this.state.gold}</strong></span><span class="stat lives-stat"><span>Lives </span><strong>${this.state.lives}</strong></span><span class="stat wave-stat"><span>Wave </span><strong>${this.state.waves.wave} / ${CONFIG.waves.length}</strong></span>`;
    this.startButton.disabled = this.state.status !== 'playing' || this.state.waves.active;
    const label = this.state.status !== 'playing' ? 'Battle finished' : this.state.waves.active ? 'Wave in progress' : 'Start Wave';
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
    this.waveIntel.textContent = this.state.status === 'defeat' ? `Defense ended at wave ${this.state.waves.wave}.`
      : wave ? `${this.state.waves.active ? 'Incoming' : 'Next wave'}: ${wave.count} enemies · ${[...new Set(wave.pattern)].join(', ')}` : 'All five waves cleared.';
  }
}
