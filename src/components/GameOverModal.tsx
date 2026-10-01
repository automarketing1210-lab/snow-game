import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { GameStats, GameMode } from '../types/game';
import { Trophy, Skull, RotateCcw, Target, Shield, Zap, Sparkles, BookOpen } from 'lucide-react';

interface GameOverModalProps {
  winner: 'blue' | 'red';
  stats: GameStats;
  gameMode: GameMode;
  onRestart: () => void;
  onOpenAnalysis: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  winner,
  stats,
  gameMode,
  onRestart,
  onOpenAnalysis,
}) => {
  const isVictory = winner === 'blue';
  const accuracy = stats.shotsFired > 0 ? Math.round((stats.shotsHit / stats.shotsFired) * 100) : 0;

  useEffect(() => {
    if (isVictory) {
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#38bdf8', '#60a5fa', '#93c5fd', '#ffffff'],
      });
    }
  }, [isVictory]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl p-6 md:p-8 shadow-2xl text-center flex flex-col items-center">
        {/* Victory / Defeat Badge */}
        <div
          className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-4 shadow-xl ${
            isVictory
              ? 'bg-sky-500/20 text-sky-400 border border-sky-400/40 shadow-sky-500/20'
              : 'bg-red-500/20 text-red-400 border border-red-400/40 shadow-red-500/20'
          }`}
        >
          {isVictory ? <Trophy className="w-10 h-10 animate-bounce" /> : <Skull className="w-10 h-10" />}
        </div>

        <h2
          className={`text-3xl md:text-4xl font-black tracking-tight mb-1 ${
            isVictory ? 'text-sky-400' : 'text-red-400'
          }`}
        >
          {isVictory ? 'ПОБЕДА СИНИХ!' : 'СНЕГОВИК ТАЕТ...'}
        </h2>
        <p className="text-xs text-slate-400 mb-6">
          {isVictory
            ? 'Ледяная арена покорена! Отличная меткость и тактика!'
            : 'Красный противник оказался быстрее. Попробуйте еще раз!'}
        </p>

        {/* Match Statistics Grid */}
        <div className="w-full grid grid-cols-2 gap-2.5 mb-6 text-left">
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Точность</div>
              <div className="text-base font-bold text-white font-mono">{accuracy}%</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Хедшоты</div>
              <div className="text-base font-bold text-amber-300 font-mono">{stats.headshots}</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Урон нанесен</div>
              <div className="text-base font-bold text-emerald-400 font-mono">{stats.damageDealt}</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Бонусов взято</div>
              <div className="text-base font-bold text-purple-300 font-mono">{stats.powerupsCollected}</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-2.5">
          <button
            onClick={onRestart}
            className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-sky-500/25 transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Играть снова</span>
          </button>

          <button
            onClick={onOpenAnalysis}
            className="w-full py-2.5 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white font-semibold text-xs transition-all flex items-center justify-center gap-2"
          >
            <BookOpen className="w-4 h-4" />
            <span>Смотреть анализ и улучшения игры</span>
          </button>
        </div>
      </div>
    </div>
  );
};
