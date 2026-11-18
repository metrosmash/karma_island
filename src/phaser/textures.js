import { TILE_SIZE, TILES } from '../sim/constants.js';

export function generateGameTextures(scene) {
  if (scene.textures.exists(`tile-${TILES.WATER}`)) return;

  const g = scene.make.graphics({ x: 0, y: 0, add: false });

  // Water tile
  g.clear();
  g.fillStyle(0x164c63);
  g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  g.fillStyle(0x1e6582);
  g.fillRect(0, 0, TILE_SIZE, 2);
  g.fillStyle(0x2d85a6);
  g.fillRect(4, 9, 9, 2);
  g.fillRect(17, 21, 10, 2);
  g.generateTexture(`tile-${TILES.WATER}`, TILE_SIZE, TILE_SIZE);

  // Sand tile
  g.clear();
  g.fillStyle(0xe2c484);
  g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  g.fillStyle(0xd3b16b);
  g.fillRect(6, 7, 3, 2);
  g.fillRect(21, 19, 3, 2);
  g.fillRect(12, 24, 2, 2);
  g.generateTexture(`tile-${TILES.SAND}`, TILE_SIZE, TILE_SIZE);

  // Grass tile
  g.clear();
  g.fillStyle(0x478c4e);
  g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  g.fillStyle(0x57a15e);
  g.fillRect(5, 10, 2, 4);
  g.fillRect(22, 20, 2, 4);
  g.fillStyle(0x37733e);
  g.fillRect(15, 6, 2, 3);
  g.fillRect(10, 22, 3, 2);
  g.generateTexture(`tile-${TILES.GRASS}`, TILE_SIZE, TILE_SIZE);

  // Bramble thorns hazard tile (-4 HP)
  g.clear();
  g.fillStyle(0x478c4e);
  g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  g.fillStyle(0x57261d);
  g.fillRect(4, 14, 24, 4);
  g.fillRect(14, 4, 4, 24);
  g.fillStyle(0xc93f3f);
  g.fillTriangle(5, 16, 10, 6, 15, 16);
  g.fillTriangle(17, 25, 22, 12, 27, 25);
  g.fillStyle(0xf07878);
  g.fillRect(9, 8, 2, 2);
  g.fillRect(21, 14, 2, 2);
  g.generateTexture(`tile-${TILES.THORNS}`, TILE_SIZE, TILE_SIZE);

  // Tree tile (impassable)
  g.clear();
  g.fillStyle(0x478c4e);
  g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  g.fillStyle(0x284e2b, 0.35);
  g.fillEllipse(16, 26, 18, 7);
  g.fillStyle(0x6b4524);
  g.fillRect(13, 18, 6, 10);
  g.fillStyle(0x23592c);
  g.fillCircle(16, 13, 11);
  g.fillStyle(0x34783e);
  g.fillCircle(14, 10, 8);
  g.generateTexture(`tile-${TILES.TREE}`, TILE_SIZE, TILE_SIZE);

  // Camp cobblestone tile
  g.clear();
  g.fillStyle(0x7c776e);
  g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  g.fillStyle(0x666159);
  g.strokeRect(1, 1, TILE_SIZE - 2, TILE_SIZE - 2);
  g.fillRect(8, 10, 8, 5);
  g.fillRect(18, 20, 7, 5);
  g.generateTexture(`tile-${TILES.CAMP}`, TILE_SIZE, TILE_SIZE);

  // Campfire prop
  g.clear();
  g.fillStyle(0x4a311e);
  g.fillRect(6, 16, 14, 4);
  g.fillRect(11, 12, 4, 12);
  g.fillStyle(0xe86f2c);
  g.fillTriangle(7, 18, 13, 5, 19, 18);
  g.fillStyle(0xffc847);
  g.fillTriangle(10, 18, 13, 9, 16, 18);
  g.generateTexture('prop-campfire', 26, 26);

  // Player sprite (24x24 top-down RPG adventurer)
  g.clear();
  g.fillStyle(0x0f1923, 0.38);
  g.fillEllipse(12, 21, 16, 6);
  g.fillStyle(0x2d74c4); // tunic
  g.fillRect(6, 11, 12, 10);
  g.fillStyle(0x225694);
  g.fillRect(6, 17, 12, 4);
  g.fillStyle(0xf2c9a0); // head
  g.fillRect(7, 4, 10, 8);
  g.fillStyle(0x4a2f1d); // hair
  g.fillRect(6, 2, 12, 4);
  g.fillStyle(0x111111); // eyes
  g.fillRect(9, 8, 2, 2);
  g.fillRect(13, 8, 2, 2);
  g.generateTexture('sprite-player', 24, 24);

  // NPC Elder sprite (24x24 cloaked elder)
  g.clear();
  g.fillStyle(0x0f1923, 0.38);
  g.fillEllipse(12, 21, 16, 6);
  g.fillStyle(0x7c4aa8); // robe
  g.fillRect(6, 10, 12, 11);
  g.fillStyle(0x5e3485);
  g.fillRect(6, 17, 12, 4);
  g.fillStyle(0xe8be98); // face
  g.fillRect(7, 4, 10, 8);
  g.fillStyle(0xe6ecf2); // white hair/hood
  g.fillRect(6, 2, 12, 4);
  g.fillStyle(0xd9a84e); // staff
  g.fillRect(20, 4, 2, 18);
  g.fillStyle(0x111111); // eyes
  g.fillRect(9, 8, 2, 2);
  g.fillRect(13, 8, 2, 2);
  g.generateTexture('sprite-npc', 24, 24);

  g.destroy();
}
