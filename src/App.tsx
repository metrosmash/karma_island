import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { Volume2, VolumeX } from 'lucide-react';
import { MAX_HUNGER } from './sim/constants.js';
import { getGlobalStats } from './sim/character.js';
import {
  advanceWorld,
  createWorld,
  getNearestInteractableNpc,
  shiftWorldTimeBack,
} from './sim/world.js';
import { clearSavedWorld, loadWorld, saveWorld } from './persistence/storage.js';
import { IslandScene } from './phaser/IslandScene.js';

interface HudSnapshot {
  generation: number;
  name: string;
  ageSeconds: number;
  hunger: number;
  health: number;
  mana: number;
  stamina: number;
  talents: { strength: number; cunning: number };
  learning: { asking: number; trading: number; foraging: number; survival: number };
  playerKarma: number;
  npcName: string;
  npcKarma: number;
  npcNear: boolean;
  debtToNpc: number;
  events: string[];
}

function buildSnapshot(world: ReturnType<typeof createWorld>, nowMs: number): HudSnapshot {
  const p = world.player;
  const npc = world.npcs[0];
  const stats = getGlobalStats(p, nowMs);

  return {
    generation: world.generation,
    name: p.name,
    ageSeconds: stats.ageSeconds,
    hunger: p.hunger,
    health: stats.health,
    mana: stats.mana,
    stamina: stats.stamina,
    talents: { ...p.talents },
    learning: { ...p.learning },
    playerKarma: p.karma,
    npcName: npc ? npc.name : 'None',
    npcKarma: npc ? npc.karma : 0,
    npcNear: Boolean(getNearestInteractableNpc(world)),
    debtToNpc: npc ? (p.debts[npc.id] ?? 0) : 0,
    events: [...world.events],
  };
}

function getHungerStatus(hunger: number): { label: string; colorClass: string; barColor: string } {
  if (hunger <= 0) {
    return { label: 'Starving', colorClass: 'text-[#f07171]', barColor: '#de5b5b' };
  }
  if (hunger <= 35) {
    return { label: 'Hungry', colorClass: 'text-[#ebb14d]', barColor: '#e2a43b' };
  }
  return { label: 'Fed', colorClass: 'text-[#6bd48f]', barColor: '#4fb874' };
}

export default function App() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<IslandScene | null>(null);
  const worldRef = useRef<ReturnType<typeof createWorld> | null>(null);
  const mutedRef = useRef(false);

  const [muted, setMuted] = useState(false);
  const [hud, setHud] = useState<HudSnapshot>(() => {
    const now = Date.now();
    const initial = loadWorld() ?? createWorld(now);
    advanceWorld(initial, now);
    saveWorld(initial);
    worldRef.current = initial;
    return buildSnapshot(initial, now);
  });

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  useEffect(() => {
    if (!containerRef.current || !worldRef.current) return;

    const scene = new IslandScene({
      world: worldRef.current,
      isMuted: () => mutedRef.current,
      onPersist: (w: ReturnType<typeof createWorld>) => saveWorld(w),
      onWorldUpdated: (w: ReturnType<typeof createWorld>, nowMs: number) => {
        setHud(buildSnapshot(w, nowMs));
      },
    });
    sceneRef.current = scene;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      width: 640,
      height: 480,
      parent: containerRef.current,
      pixelArt: true,
      backgroundColor: '#164c63',
      scene: [scene],
    });

    const handleBeforeUnload = () => {
      if (worldRef.current) {
        saveWorld(worldRef.current);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      game.destroy(true);
      sceneRef.current = null;
    };
  }, []);

  const handleAskFood = () => {
    sceneRef.current?.triggerAskFood();
  };

  const handleAdvanceTime = () => {
    if (!worldRef.current) return;
    const now = Date.now();
    shiftWorldTimeBack(worldRef.current, 15_000);
    advanceWorld(worldRef.current, now);
    saveWorld(worldRef.current);
    setHud(buildSnapshot(worldRef.current, now));
  };

  const handleReset = () => {
    clearSavedWorld();
    const now = Date.now();
    const fresh = createWorld(now);
    worldRef.current = fresh;
    saveWorld(fresh);
    sceneRef.current?.setWorld(fresh);
    setHud(buildSnapshot(fresh, now));
  };

  const hungerPct = Math.max(0, Math.min(100, (hud.hunger / MAX_HUNGER) * 100));
  const hungerStatus = getHungerStatus(hud.hunger);

  return (
    <div className="min-h-screen bg-[#0c141b] text-[#e6eef5] flex flex-col items-center justify-center p-4 lg:p-8">
      <div className="w-full max-w-[1060px] flex flex-col gap-4">
        <header className="flex items-center justify-between gap-8 pb-3 border-b border-[#223240]">
          <h1 className="text-lg font-bold tracking-tight text-[#f0f6fa] whitespace-nowrap shrink-0">
            Karma Island
          </h1>
          <div className="hidden sm:flex items-center gap-2 text-xs text-[#8fa4b8] font-mono-tabular whitespace-nowrap shrink-0">
            <span>{hud.name}</span>
            <span aria-hidden="true">·</span>
            <span>Gen {hud.generation}</span>
            <span aria-hidden="true">·</span>
            <span>Age {hud.ageSeconds.toFixed(1)}s</span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
              className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] text-xs font-medium text-[#cbd8e3] bg-[#15202b] border border-[#253746] rounded-md hover:bg-[#1c2b39] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#4fb874]"
              aria-label={muted ? 'Unmute sound' : 'Mute sound'}
            >
              {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              <span>{muted ? 'Sound Off' : 'Sound On'}</span>
            </button>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-[640px_1fr] gap-5 items-stretch">
          <section className="flex flex-col gap-3">
            <div
              ref={containerRef}
              className="w-full max-w-[640px] aspect-[4/3] bg-[#164c63] border border-[#253746] rounded-lg overflow-hidden shadow-lg"
            />
            <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-[#8fa4b8]">
              <span>Move: WASD or Arrow Keys</span>
              <span>Ask Food: E or Space near Elder Mara</span>
              <span>Red thorns deal -4 HP</span>
            </div>
          </section>

          <aside
            aria-label="Character stats and karma ledger"
            className="bg-[#15202b] border border-[#253746] rounded-lg p-4 flex flex-col justify-between gap-4 text-[13px]"
          >
            <div className="flex flex-col gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-[#8fa4b8]">Survival Need · Hunger</span>
                  <span className={`text-xs font-mono-tabular font-semibold ${hungerStatus.colorClass}`}>
                    {hud.hunger.toFixed(0)} / {MAX_HUNGER} · {hungerStatus.label}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-[#0c141b] border border-[#253746] rounded overflow-hidden">
                  <div
                    className="h-full transition-all duration-100"
                    style={{ width: `${hungerPct}%`, backgroundColor: hungerStatus.barColor }}
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#223240]">
                <h2 className="text-xs font-semibold text-[#8fa4b8] mb-2">
                  Global Given Stats (+1/sec from birth)
                </h2>
                <div className="grid grid-cols-3 gap-2 font-mono-tabular">
                  <div className="bg-[#0f1820] border border-[#223240] rounded px-2.5 py-2">
                    <div className="text-[11px] text-[#8fa4b8]">Health</div>
                    <div className="text-sm font-semibold text-[#66b3ff]">{hud.health.toFixed(1)}</div>
                  </div>
                  <div className="bg-[#0f1820] border border-[#223240] rounded px-2.5 py-2">
                    <div className="text-[11px] text-[#8fa4b8]">Mana</div>
                    <div className="text-sm font-semibold text-[#7ec9c4]">{hud.mana.toFixed(1)}</div>
                  </div>
                  <div className="bg-[#0f1820] border border-[#223240] rounded px-2.5 py-2">
                    <div className="text-[11px] text-[#8fa4b8]">Stamina</div>
                    <div className="text-sm font-semibold text-[#8fd19e]">{hud.stamina.toFixed(1)}</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-[#223240]">
                <div>
                  <h2 className="text-xs font-semibold text-[#8fa4b8] mb-2">Talent Stats</h2>
                  <div className="flex flex-col gap-1 font-mono-tabular text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#b8c7d4]">Strength</span>
                      <span>{hud.talents.strength}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#b8c7d4]">Cunning</span>
                      <span>{hud.talents.cunning}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h2 className="text-xs font-semibold text-[#8fa4b8] mb-2">Learning Stats</h2>
                  <div className="flex flex-col gap-1 font-mono-tabular text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#b8c7d4]">Asking</span>
                      <span>{hud.learning.asking}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#b8c7d4]">Trading</span>
                      <span>{hud.learning.trading}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#b8c7d4]">Foraging</span>
                      <span>{hud.learning.foraging}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#b8c7d4]">Survival</span>
                      <span>{hud.learning.survival}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[#223240]">
                <h2 className="text-xs font-semibold text-[#8fa4b8] mb-2">Karma Economy</h2>
                <div className="flex flex-col gap-1.5 font-mono-tabular text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#b8c7d4]">Your Karma</span>
                    <span className="font-semibold text-[#b48cff]">{hud.playerKarma}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#b8c7d4]">{hud.npcName} Karma</span>
                    <span className="font-semibold text-[#b48cff]">{hud.npcKarma}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#b8c7d4]">Owed to {hud.npcName}</span>
                    <span className="text-[#e6eef5]">{hud.debtToNpc}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-3 border-t border-[#223240]">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleAskFood}
                  className={`col-span-2 min-h-[40px] px-4 py-2 text-xs font-semibold rounded-md border transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-[#4fb874] ${
                    hud.npcNear
                      ? 'bg-[#2a5c41] border-[#4fb874] text-[#f2fbf5] hover:bg-[#336e4e]'
                      : 'bg-[#1b2936] border-[#2a3d4f] text-[#9fb2c4] hover:bg-[#223242]'
                  }`}
                >
                  Ask for Food (-5 Karma)
                </button>
                <button
                  type="button"
                  onClick={handleAdvanceTime}
                  className="min-h-[40px] px-4 py-2 text-xs font-medium rounded-md bg-[#1c2a38] border border-[#2c4054] text-[#d5e1eb] hover:bg-[#253749] transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-[#4fb874]"
                >
                  Advance +15s
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="min-h-[40px] px-4 py-2 text-xs font-medium rounded-md bg-[#3c1e22] border border-[#6e343b] text-[#f7d7da] hover:bg-[#4e262c] transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-[#de5b5b]"
                >
                  Reset Island
                </button>
              </div>

              <div>
                <h2 className="text-xs font-semibold text-[#8fa4b8] mb-1.5">Island Log</h2>
                <div className="h-[88px] overflow-y-auto bg-[#0c141b] border border-[#223240] rounded px-2.5 py-2 text-[11px] leading-relaxed font-mono-tabular text-[#8fa4b8]">
                  {hud.events.map((event, idx) => (
                    <div key={`${idx}-${event}`} className={idx === 0 ? 'text-[#e6eef5]' : ''}>
                      {event}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}
