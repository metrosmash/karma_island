import { MAP_COLS, MAP_ROWS, TILE_SIZE, TILES } from './constants.js';

// 20x15 top-down island layout:
// 0 = water, 1 = sand, 2 = grass, 3 = thorns (-4 HP hazard), 4 = tree, 5 = camp stone
const DEFAULT_GRID = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
  [0, 1, 1, 2, 2, 2, 4, 2, 2, 2, 2, 2, 4, 2, 2, 2, 1, 1, 0, 0],
  [0, 1, 2, 2, 4, 2, 2, 2, 2, 2, 2, 2, 2, 2, 4, 2, 2, 1, 0, 0],
  [0, 1, 2, 2, 2, 2, 2, 3, 3, 2, 2, 5, 5, 5, 2, 2, 2, 1, 0, 0],
  [0, 1, 2, 2, 2, 2, 2, 3, 2, 2, 2, 5, 5, 5, 2, 2, 4, 1, 0, 0],
  [0, 1, 2, 4, 2, 2, 2, 2, 2, 2, 2, 5, 5, 5, 2, 2, 2, 1, 0, 0],
  [0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 2, 1, 0, 0],
  [0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 4, 2, 2, 2, 3, 3, 2, 1, 0, 0],
  [0, 1, 2, 2, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0],
  [0, 1, 2, 2, 2, 2, 4, 2, 2, 2, 2, 2, 4, 2, 2, 2, 2, 1, 0, 0],
  [0, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 0, 0],
  [0, 0, 1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
];

export function createIslandMap() {
  return {
    cols: MAP_COLS,
    rows: MAP_ROWS,
    tileSize: TILE_SIZE,
    grid: DEFAULT_GRID.map((row) => [...row]),
  };
}

export function getTileAtPixel(map, x, y) {
  const col = Math.floor(x / map.tileSize);
  const row = Math.floor(y / map.tileSize);
  if (row < 0 || row >= map.rows || col < 0 || col >= map.cols) {
    return TILES.WATER;
  }
  return map.grid[row][col];
}

export function isWalkableTile(tile) {
  return (
    tile === TILES.SAND ||
    tile === TILES.GRASS ||
    tile === TILES.THORNS ||
    tile === TILES.CAMP
  );
}

export function isWalkableCircle(map, x, y, radius) {
  const points = [
    [x - radius, y - radius],
    [x + radius, y - radius],
    [x - radius, y + radius],
    [x + radius, y + radius],
  ];
  return points.every(([px, py]) => isWalkableTile(getTileAtPixel(map, px, py)));
}
