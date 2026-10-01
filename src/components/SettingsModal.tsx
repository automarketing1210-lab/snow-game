import React from 'react';
import { GameMode, Difficulty, AimMode } from '../types/game';
import { X, Volume2, VolumeX, Crosshair, Swords, Sparkles, ShieldAlert } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameMode: GameMode;
  setGameMode: (mode: GameMode) => void;
  difficulty: Difficulty;
  setDifficulty: (diff: Difficulty) => void;
  aimMode: AimMode;
  setAimMode: (mode: AimMode) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
  onRestart: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  gameMode,
  setGameMode,
  difficulty,
  setDifficulty,
  aimMode,
  setAimMode,
  isMuted,
  onToggleMute,
  volume,
  onVolumeChange,
  onRestart,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl text-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
          <h3 className="font-bold text-base text-white flex items-center gap-2">
            <span>⚙️</span> Настройки и Режимы
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          {/* Game Mode */}
          <div>
            <label className="font-semibold text-slate-300 block mb-1.5 flex items-center gap-1.5">
              <Swords className="w-3.5 h-3.5 text-sky-400" /> Режим игры
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'duel', label: '1v1 Дуэль' },
                { id: 'survival', label: 'Выживание' },
                { id: 'practice', label: 'Тир' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setGameMode(m.id as GameMode);
                    onRestart();
                  }}
                  className={`py-2 px-3 rounded-lg font-medium text-center transition-all ${
                    gameMode === m.id
                      ? 'bg-sky-600 text-white font-bold shadow-md'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-750'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <label className="font-semibold text-slate-300 block mb-1.5 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> Сложность соперника
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: 'easy', label: 'Легко' },
                { id: 'normal', label: 'Обычный' },
                { id: 'hard', label: 'Хардкор' },
                { id: 'boss', label: '👑 Босс' },
              ].map((d) => (
                <button
                  key={d.id}
                  onClick={() => {
                    setDifficulty(d.id as Difficulty);
                    onRestart();
                  }}
                  className={`py-1.5 px-2 rounded-lg font-medium text-center transition-all ${
                    difficulty === d.id
                      ? 'bg-amber-600 text-white font-bold shadow-md'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Aim Mode (Manual vs Original Auto-aim) */}
          <div>
            <label className="font-semibold text-slate-300 block mb-1.5 flex items-center gap-1.5">
              <Crosshair className="w-3.5 h-3.5 text-emerald-400" /> Режим прицеливания
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setAimMode('manual')}
                className={`py-2 px-3 rounded-lg text-left transition-all ${
                  aimMode === 'manual'
                    ? 'bg-emerald-600 text-white font-bold shadow-md'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-bold">Ручной прицел</div>
                <div className="text-[10px] opacity-80">Честная баллистика в центр экрана</div>
              </button>
              <button
                onClick={() => setAimMode('auto')}
                className={`py-2 px-3 rounded-lg text-left transition-all ${
                  aimMode === 'auto'
                    ? 'bg-emerald-600 text-white font-bold shadow-md'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-bold">Авто-наведение</div>
                <div className="text-[10px] opacity-80">Как в исходном коде</div>
              </button>
            </div>
          </div>

          {/* Sound Volume */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5 text-sky-400" />}
                Громкость звуковых эффектов
              </span>
              <button
                onClick={onToggleMute}
                className="text-[11px] text-sky-400 hover:underline font-medium"
              >
                {isMuted ? 'Включить' : 'Заглушить'}
              </button>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-full accent-sky-500 cursor-pointer"
            />
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition-all active:scale-95"
          >
            Применить и закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
