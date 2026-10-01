import React from 'react';
import { GameMode, Difficulty, AimMode, ActivePowerUp } from '../types/game';
import { Shield, Zap, Sparkles, Volume2, VolumeX, Pause, Info, SlidersHorizontal, RefreshCw } from 'lucide-react';

interface HUDProps {
  playerHp: number;
  enemyHp: number;
  bossHp?: number;
  maxBossHp?: number;
  stamina: number;
  charge: number;
  activePowerUps: ActivePowerUp[];
  gameMode: GameMode;
  difficulty: Difficulty;
  aimMode: AimMode;
  wave: number;
  remainingEnemies: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onTogglePause: () => void;
  onOpenSettings: () => void;
  onOpenAnalysis: () => void;
  onRestart: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  playerHp,
  enemyHp,
  bossHp,
  maxBossHp,
  stamina,
  charge,
  activePowerUps,
  gameMode,
  difficulty,
  aimMode,
  wave,
  remainingEnemies,
  isMuted,
  onToggleMute,
  onTogglePause,
  onOpenSettings,
  onOpenAnalysis,
  onRestart,
}) => {
  const isBossMode = difficulty === 'boss';
  const enemyMax = isBossMode ? 250 : 100;
  const enemyCurrent = bossHp !== undefined ? bossHp : enemyHp;
  const enemyPercentage = Math.max(0, Math.min(100, (enemyCurrent / (maxBossHp || enemyMax)) * 100));

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 md:p-6 z-10 select-none">
      {/* Top Header Bar */}
      <div className="flex items-start justify-between w-full pointer-events-auto">
        {/* Player Status Card */}
        <div className="flex flex-col gap-1.5 bg-slate-900/70 backdrop-blur-md border border-slate-700/60 rounded-xl p-3.5 shadow-xl min-w-[200px] md:min-w-[260px]">
          <div className="flex items-center justify-between text-xs font-semibold text-sky-300">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8]" />
              ВЫ (СИНИЙ)
            </span>
            <span className="font-mono text-white tabular-nums">{Math.round(playerHp)} / 100</span>
          </div>
          {/* Health Bar */}
          <div className="w-full h-3 bg-slate-950/80 rounded-full overflow-hidden border border-sky-500/30">
            <div
              className="h-full bg-gradient-to-r from-sky-500 to-cyan-300 transition-all duration-200"
              style={{ width: `${Math.max(0, Math.min(100, playerHp))}%` }}
            />
          </div>
          {/* Stamina / Dash Bar */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-0.5">
            <span>Энергия (Shift — Рывок)</span>
            <span className="font-mono tabular-nums">{Math.round(stamina)}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-950/80 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-400 transition-all duration-100"
              style={{ width: `${Math.max(0, Math.min(100, stamina))}%` }}
            />
          </div>
        </div>

        {/* Center Mode / Wave Info & Analysis Button */}
        <div className="flex flex-col items-center gap-2">
          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/60 rounded-lg px-4 py-1.5 text-center shadow-lg">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
              {gameMode === 'duel' && (isBossMode ? '👑 БОЙ С БОССОМ' : '⚔️ ДУЭЛЬ 1 НА 1')}
              {gameMode === 'survival' && `❄️ ВЫЖИВАНИЕ · ВОЛНА ${wave}`}
              {gameMode === 'practice' && '🎯 ТИР И ТРЕНИРОВКА'}
            </div>
            {gameMode === 'survival' && (
              <div className="text-[11px] text-red-400 font-mono mt-0.5">
                Осталось врагов: {remainingEnemies}
              </div>
            )}
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-1.5 pointer-events-auto">
            <button
              onClick={onOpenAnalysis}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600/80 hover:bg-sky-500 text-white text-xs font-semibold shadow-md transition-all active:scale-95"
              title="Открыть анализ кода и список улучшений"
            >
              <Info className="w-3.5 h-3.5" />
              <span>Анализ игры</span>
            </button>
            <button
              onClick={onToggleMute}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all active:scale-95"
              title={isMuted ? 'Включить звук' : 'Выключить звук'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
            <button
              onClick={onOpenSettings}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all active:scale-95"
              title="Настройки"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
            <button
              onClick={onRestart}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all active:scale-95"
              title="Перезапустить матч"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onTogglePause}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all active:scale-95"
              title="Пауза (ESC)"
            >
              <Pause className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Enemy / Boss Status Card */}
        <div className="flex flex-col gap-1.5 bg-slate-900/70 backdrop-blur-md border border-slate-700/60 rounded-xl p-3.5 shadow-xl min-w-[200px] md:min-w-[260px] text-right">
          <div className="flex items-center justify-between text-xs font-semibold text-red-400">
            <span className="font-mono text-white tabular-nums">
              {Math.round(enemyCurrent)} / {maxBossHp || enemyMax}
            </span>
            <span className="flex items-center gap-1.5">
              {isBossMode ? 'КОРОЛЬ СНЕГОВИК' : 'КРАСНЫЙ ВРАГ'}
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]" />
            </span>
          </div>
          {/* Health Bar */}
          <div className="w-full h-3 bg-slate-950/80 rounded-full overflow-hidden border border-red-500/30">
            <div
              className={`h-full transition-all duration-200 ml-auto ${
                isBossMode
                  ? 'bg-gradient-to-l from-amber-500 via-orange-500 to-red-500'
                  : 'bg-gradient-to-l from-red-600 to-rose-400'
              }`}
              style={{ width: `${enemyPercentage}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-400">
            Сложность: <span className="text-slate-200 font-medium capitalize">{difficulty}</span>
          </div>
        </div>
      </div>

      {/* Crosshair (Centered in screen) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
        <div
          className={`rounded-full border border-white/80 transition-all duration-75 flex items-center justify-center ${
            charge > 0.05 ? 'scale-125 border-amber-400 bg-amber-400/10' : 'w-7 h-7'
          }`}
          style={{
            width: `${28 + charge * 24}px`,
            height: `${28 + charge * 24}px`,
          }}
        >
          {/* Center aiming dot */}
          <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_#fff]" />
        </div>
        {charge > 0.1 && (
          <div className="absolute -bottom-6 text-[10px] font-mono font-bold text-amber-300 tracking-wider">
            ЗАРЯД {Math.round(charge * 100)}%
          </div>
        )}
      </div>

      {/* Bottom Bar: Active Power-ups & Controls Prompt */}
      <div className="flex items-end justify-between w-full pointer-events-auto">
        {/* Active Powerups */}
        <div className="flex items-center gap-2">
          {activePowerUps.map((p, idx) => (
            <div
              key={idx}
              className="flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md border border-slate-700/80 rounded-lg px-3 py-1.5 shadow-md"
            >
              {p.type === 'triple' && <Sparkles className="w-4 h-4 text-amber-400" />}
              {p.type === 'shield' && <Shield className="w-4 h-4 text-cyan-400" />}
              {p.type === 'rapid' && <Zap className="w-4 h-4 text-purple-400" />}
              <span className="text-xs font-semibold text-slate-200">
                {p.type === 'triple' && 'Тройной снежок'}
                {p.type === 'shield' && 'Ледяной щит'}
                {p.type === 'rapid' && 'Скорострел'}
              </span>
            </div>
          ))}
        </div>

        {/* Quiet Keybind Hint Pill */}
        <div className="hidden md:flex items-center gap-3 bg-slate-900/70 backdrop-blur-md border border-slate-700/60 rounded-xl px-4 py-2 text-xs text-slate-300 shadow-lg">
          <div><kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-[11px] font-mono border border-slate-700">W A S D</kbd> Движение</div>
          <div><kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-[11px] font-mono border border-slate-700">SHIFT</kbd> Рывок</div>
          <div><kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-[11px] font-mono border border-slate-700">ЛКМ / ПРОБЕЛ</kbd> Бросок (зажать = мега-снежок)</div>
          <div><kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-[11px] font-mono border border-slate-700">ПКМ / Мышь</kbd> Вращение камеры</div>
        </div>
      </div>
    </div>
  );
};
