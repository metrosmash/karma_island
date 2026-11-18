const STORAGE_KEY = 'karma_island_save_v1';

export function saveWorld(world) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(world));
  } catch {
    // Ignore storage quota or restricted context errors
  }
}

export function loadWorld() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.player?.birthTimestamp || !Array.isArray(parsed?.npcs)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearSavedWorld() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}
