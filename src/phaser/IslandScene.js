import Phaser from 'phaser';
import { MAX_HUNGER, TILE_SIZE } from '../sim/constants.js';
import { getGlobalStats } from '../sim/character.js';
import {
  advanceWorld,
  getNearestInteractableNpc,
  movePlayer,
  playerAskNearestNpcForFood,
} from '../sim/world.js';
import { playAskFoodSound, playDamageSound, playRespawnSound } from './audio.js';
import { generateGameTextures } from './textures.js';

export class IslandScene extends Phaser.Scene {
  constructor({ world, onWorldUpdated, onPersist, isMuted }) {
    super('IslandScene');
    this.world = world;
    this.onWorldUpdated = onWorldUpdated;
    this.onPersist = onPersist;
    this.isMuted = isMuted ?? (() => false);
    this.lastHudSyncMs = 0;
    this.lastSaveMs = 0;
    this.lastDamageFlashMs = 0;
  }

  create() {
    generateGameTextures(this);
    this.renderTileMap();

    // Campfire near Elder Mara's stone clearing
    this.campfire = this.add
      .image(11 * TILE_SIZE + 16, 5 * TILE_SIZE + 16, 'prop-campfire')
      .setDepth(5);

    this.playerSprite = this.add
      .image(this.world.player.x, this.world.player.y, 'sprite-player')
      .setDepth(10);

    const npc = this.world.npcs[0];
    this.npcSprite = this.add.image(npc.x, npc.y, 'sprite-npc').setDepth(9);

    this.npcLabel = this.add
      .text(npc.x, npc.y - 22, npc.name, {
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '11px',
        color: '#f3f7fa',
        backgroundColor: '#131d27cc',
        padding: { x: 5, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(12);

    this.interactPrompt = this.add
      .text(npc.x, npc.y + 22, '[E] Ask for Food (-5 Karma)', {
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '10px',
        color: '#ffe082',
        backgroundColor: '#111821ee',
        padding: { x: 5, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(12)
      .setVisible(false);

    this.playerBars = this.add.graphics().setDepth(11);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      e: Phaser.Input.Keyboard.KeyCodes.E,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
    });

    this.keys.e.on('down', () => this.triggerAskFood());
    this.keys.space.on('down', () => this.triggerAskFood());

    this.onWorldUpdated(this.world, Date.now());
  }

  renderTileMap() {
    const { grid, rows, cols, tileSize } = this.world.map;
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const tile = grid[r][c];
        this.add
          .image(c * tileSize + tileSize / 2, r * tileSize + tileSize / 2, `tile-${tile}`)
          .setDepth(0);
      }
    }
  }

  triggerAskFood() {
    const nowMs = Date.now();
    advanceWorld(this.world, nowMs);
    const res = playerAskNearestNpcForFood(this.world, nowMs);
    if (res.ok) {
      playAskFoodSound(this.isMuted());
      this.showFloatingCallout(this.world.player.x, this.world.player.y - 28, '-5 Karma / +Food', '#c49bff');
    }
    this.onPersist(this.world);
    this.onWorldUpdated(this.world, nowMs);
  }

  showFloatingCallout(x, y, text, color) {
    const label = this.add
      .text(x, y, text, {
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '10px',
        color,
        backgroundColor: '#0e171fdd',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(15);

    this.tweens.add({
      targets: label,
      y: y - 16,
      alpha: 0,
      duration: 950,
      ease: 'Cubic.easeOut',
      onComplete: () => label.destroy(),
    });
  }

  setWorld(newWorld) {
    this.world = newWorld;
    this.onWorldUpdated(this.world, Date.now());
  }

  update(_time, deltaMs) {
    const nowMs = Date.now();
    const dtSeconds = Math.min(0.1, deltaMs / 1000);

    const { playerRespawned } = advanceWorld(this.world, nowMs);

    let dirX = 0;
    let dirY = 0;
    if (this.cursors.left.isDown || this.keys.a.isDown) dirX -= 1;
    if (this.cursors.right.isDown || this.keys.d.isDown) dirX += 1;
    if (this.cursors.up.isDown || this.keys.w.isDown) dirY -= 1;
    if (this.cursors.down.isDown || this.keys.s.isDown) dirY += 1;

    const moveRes = movePlayer(this.world, dirX, dirY, dtSeconds, nowMs);

    if (moveRes.hazardHit) {
      playDamageSound(this.isMuted());
      this.lastDamageFlashMs = nowMs;
      this.showFloatingCallout(this.world.player.x, this.world.player.y - 26, '-4 HP', '#ff7b7b');
    }

    if (playerRespawned || moveRes.playerRespawned) {
      playRespawnSound(this.isMuted());
      this.showFloatingCallout(this.world.player.x, this.world.player.y - 30, 'New Life (0 Stats)', '#8be0a4');
    }

    // Visual tint flash on damage
    if (nowMs - this.lastDamageFlashMs < 180) {
      this.playerSprite.setTint(0xff6b6b);
    } else {
      this.playerSprite.clearTint();
    }

    this.playerSprite.setPosition(this.world.player.x, this.world.player.y);

    const npc = this.world.npcs[0];
    if (npc) {
      this.npcSprite.setPosition(npc.x, npc.y);
      this.npcLabel.setPosition(npc.x, npc.y - 22).setText(npc.name);
      const near = Boolean(getNearestInteractableNpc(this.world));
      this.interactPrompt.setPosition(npc.x, npc.y + 22).setVisible(near);
    }

    this.drawFloatingBars(nowMs);

    if (playerRespawned || moveRes.playerRespawned || moveRes.hazardHit) {
      this.onPersist(this.world);
      this.onWorldUpdated(this.world, nowMs);
      this.lastHudSyncMs = nowMs;
      this.lastSaveMs = nowMs;
      return;
    }

    if (nowMs - this.lastHudSyncMs >= 100) {
      this.onWorldUpdated(this.world, nowMs);
      this.lastHudSyncMs = nowMs;
    }

    if (nowMs - this.lastSaveMs >= 2000) {
      this.onPersist(this.world);
      this.lastSaveMs = nowMs;
    }
  }

  drawFloatingBars(nowMs) {
    const g = this.playerBars;
    g.clear();
    const p = this.world.player;
    const stats = getGlobalStats(p, nowMs);
    const barW = 28;
    const bx = p.x - barW / 2;
    const by = p.y - 20;

    // Hunger micro-bar
    const hungerRatio = Math.max(0, Math.min(1, p.hunger / MAX_HUNGER));
    g.fillStyle(0x0e171f, 0.85);
    g.fillRect(bx - 1, by - 1, barW + 2, 5);
    g.fillStyle(hungerRatio > 0.35 ? 0x4fb874 : 0xde5b5b);
    g.fillRect(bx, by, barW * hungerRatio, 3);

    // Health micro-bar (scaled visually to 30 HP; exact value shown in HUD)
    const hpRatio = Math.max(0, Math.min(1, stats.health / 30));
    g.fillStyle(0x0e171f, 0.85);
    g.fillRect(bx - 1, by - 6, barW + 2, 5);
    g.fillStyle(0x56a8f5);
    g.fillRect(bx, by - 5, barW * hpRatio, 3);
  }
}
