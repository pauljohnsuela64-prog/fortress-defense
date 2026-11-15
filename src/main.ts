import Phaser from 'phaser';
import { CONFIG } from './GameConfig';
import { GameScene } from './scenes/GameScene';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'phaser-container',
  width: CONFIG.width,
  height: CONFIG.height,
  backgroundColor: '#142b29',
  audio: { noAudio: true }, // GameAudio owns the single optional Web Audio context.
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [GameScene],
});
