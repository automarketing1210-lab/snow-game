import React, { useState, useRef, useCallback } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/HUD';
import { AnalysisModal } from './components/AnalysisModal';
import { SettingsModal } from './components/SettingsModal';
import { GameOverModal } from './components/GameOverModal';
import { TouchControls } from './components/TouchControls';
import { GameMode, Difficulty, AimMode, ActivePowerUp, GameStats, FloatingText } from './types/game';
import { sounds } from './audio/soundEngine';
import { Play, BookOpen, SlidersHorizontal, Volume2, VolumeX, Shield, Zap, Sparkles, Target } from 'lucide-react';

export default function App() {
  const [hasStarted, setHasStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [gameMode, setGameMode] = useState<GameMode>('duel');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [aimMode, setAimMode] = useState<AimMode>('manual');

  // Audio settings
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.5);

  // In-Game UI states
  const [playerHp, setPlayerHp] = useState(100);
  const [enemyHp, setEnemyHp] = useState(100);
  const [bossHp, setBossHp] = useState<number | undefined>(undefined);
  const [maxBossHp, setMaxBossHp] = useState<number | undefined>(undefined);
  const [stamina, setStamina] = useState(100);
  const [charge, setCharge] = useState(0);
  const [activePowerUps, setActivePowerUps] = useState<ActivePowerUp[]>([]);
  const [wave, setWave] = useState(1);
  const [remainingEnemies, setRemainingEnemies] = useState(1);

  // Modals
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [gameOverWinner, setGameOverWinner] = useState<'blue' | 'red' | null>(null);

  // Match stats
  const statsRef = useRef<GameStats>({
    shotsFired: 0,
    shotsHit: 0,
    headshots: 0,
    damageDealt: 0,
    damageReceived: 0,
    powerupsCollected: 0,
    wave: 1,
    survivalKills: 0,
    timeSurvived: 0,
  });

  // Touch action reference for mobile/tablets
  const touchActionRef = useRef({
    moveX: 0,
    moveY: 0,
    lookX: 0,
    lookY: 0,
    isShooting: false,
    isCharging: false,
    doDash: false,
  });

  // Floating text badges
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);

  const handleFloatingText = useCallback((text: FloatingText) => {
    setFloatingTexts((prev) => [...prev.slice(-6), text]);
    setTimeout(() => {
      setFloatingTexts((prev) => prev.filter((t) => t.id !== text.id));
    }, 1200);
  }, []);

  const handleHpChange = useCallback(
    (blue: number, red: number, boss?: number, maxBoss?: number) => {
      setPlayerHp(blue);
      setEnemyHp(red);
      setBossHp(boss);
      setMaxBossHp(maxBoss);
    },
    []
  );

  const handleWaveChange = useCallback((newWave: number, remaining: number) => {
    setWave(newWave);
    setRemainingEnemies(remaining);
    statsRef.current.wave = newWave;
  }, []);

  const handleGameOver = useCallback((winner: 'blue' | 'red', finalStats: GameStats) => {
    setGameOverWinner(winner);
  }, []);

  const resetGame = () => {
    statsRef.current = {
      shotsFired: 0,
      shotsHit: 0,
      headshots: 0,
      damageDealt: 0,
      damageReceived: 0,
      powerupsCollected: 0,
      wave: 1,
      survivalKills: 0,
      timeSurvived: 0,
    };
    setPlayerHp(100);
    setEnemyHp(100);
    setBossHp(undefined);
    setStamina(100);
    setCharge(0);
    setActivePowerUps([]);
    setWave(1);
    setRemainingEnemies(1);
    setGameOverWinner(null);
    setIsPaused(false);
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    sounds.setMuted(nextMuted);
  };

  const handleVolumeChange = (vol: number) => {
    setVolume(vol);
    sounds.setVolume(vol);
    if (isMuted && vol > 0) {
      setIsMuted(false);
      sounds.setMuted(false);
    }
  };

  const startGame = () => {
    sounds.resume();
    setHasStarted(true);
    resetGame();
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* 3D WebGL Canvas Layer */}
      {hasStarted && (
        <GameCanvas
          gameMode={gameMode}
          difficulty={difficulty}
          aimMode={aimMode}
          isPaused={isPaused || isAnalysisOpen || isSettingsOpen || gameOverWinner !== null}
          onHpChange={handleHpChange}
          onStaminaChange={setStamina}
          onChargeChange={setCharge}
          onActivePowerUpsChange={setActivePowerUps}
          onFloatingText={handleFloatingText}
          onGameOver={handleGameOver}
          onWaveChange={handleWaveChange}
          statsRef={statsRef}
          touchActionRef={touchActionRef}
        />
      )}

      {/* Floating combat texts */}
      <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
        {floatingTexts.map((ft) => (
          <div
            key={ft.id}
            className="animate-float-up text-lg md:text-2xl font-black font-mono tracking-wider drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
            style={{ color: ft.color }}
          >
            {ft.text}
          </div>
        ))}
      </div>

      {/* HUD Layer */}
      {hasStarted && !gameOverWinner && (
        <>
          <HUD
            playerHp={playerHp}
            enemyHp={enemyHp}
            bossHp={bossHp}
            maxBossHp={maxBossHp}
            stamina={stamina}
            charge={charge}
            activePowerUps={activePowerUps}
            gameMode={gameMode}
            difficulty={difficulty}
            aimMode={aimMode}
            wave={wave}
            remainingEnemies={remainingEnemies}
            isMuted={isMuted}
            onToggleMute={toggleMute}
            onTogglePause={() => setIsPaused((prev) => !prev)}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenAnalysis={() => setIsAnalysisOpen(true)}
            onRestart={resetGame}
          />
          <TouchControls touchActionRef={touchActionRef} />
        </>
      )}

      {/* START SCREEN */}
      {!hasStarted && (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950">
          <div className="relative w-full max-w-xl bg-slate-900/90 border border-slate-700/80 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-xl text-center flex flex-col items-center">
            {/* Header Badges */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-400/30 text-sky-400 text-xs font-semibold mb-4">
              <span>❄️</span>
              <span>Обновленная версия снежной битвы</span>
            </div>

            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white mb-2">
              SNOWBALL ARENA <span className="text-sky-400">3D</span>
            </h1>
            <p className="text-xs md:text-sm text-slate-300 max-w-md mb-6 leading-relaxed">
              Анализ и глубокое улучшение вашей игры: реальная баллистика прицела, разрушаемые укрытия, тактический рывок, хедшоты со сбиванием шляпы и процедурный звук.
            </p>

            {/* Feature Highlights Grid */}
            <div className="w-full grid grid-cols-3 gap-2.5 mb-6 text-left">
              <div className="p-3 rounded-xl bg-slate-800/70 border border-slate-700/60">
                <Target className="w-4 h-4 text-sky-400 mb-1.5" />
                <div className="text-xs font-bold text-white">Ручной прицел</div>
                <div className="text-[10px] text-slate-400">Честная баллистика вместо авто-аима</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/70 border border-slate-700/60">
                <Zap className="w-4 h-4 text-amber-400 mb-1.5" />
                <div className="text-xs font-bold text-white">Рывок и Заряд</div>
                <div className="text-[10px] text-slate-400">Shift для доджа, зажатие для мега-снежка</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/70 border border-slate-700/60">
                <Shield className="w-4 h-4 text-cyan-400 mb-1.5" />
                <div className="text-xs font-bold text-white">Укрытия & Бонусы</div>
                <div className="text-[10px] text-slate-400">Снежные форты и кристаллы способностей</div>
              </div>
            </div>

            {/* Quick Game Mode Selector */}
            <div className="w-full mb-6 text-left">
              <div className="text-xs font-semibold text-slate-400 mb-2">Выберите режим боя:</div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'duel', label: '⚔️ Дуэль 1v1', desc: 'Классический матч' },
                  { id: 'survival', label: '❄️ Выживание', desc: 'Волны снеговиков' },
                  { id: 'practice', label: '🎯 Тренировка', desc: 'Стрельба по мишеням' },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setGameMode(m.id as GameMode)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      gameMode === m.id
                        ? 'bg-sky-600/30 border-sky-400 text-white font-bold'
                        : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-xs">{m.label}</div>
                    <div className="text-[10px] opacity-75 font-normal">{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="w-full flex flex-col sm:flex-row gap-3">
              <button
                onClick={startGame}
                className="flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-base shadow-xl shadow-sky-500/30 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>Начать битву</span>
              </button>
              <button
                onClick={() => setIsAnalysisOpen(true)}
                className="py-3.5 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white font-semibold text-sm transition-all flex items-center justify-center gap-2"
              >
                <BookOpen className="w-4 h-4 text-sky-400" />
                <span>Читать анализ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAUSE MENU */}
      {isPaused && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl p-6 md:p-8 shadow-2xl text-center flex flex-col items-center">
            <h2 className="text-2xl font-black text-sky-400 tracking-wider mb-1">⏸ ПАУЗА</h2>
            <p className="text-xs text-slate-400 mb-6">Игра приостановлена</p>

            <div className="w-full space-y-2.5">
              <button
                onClick={() => setIsPaused(false)}
                className="w-full py-3 px-6 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm shadow-md transition-all active:scale-95"
              >
                Продолжить игру
              </button>
              <button
                onClick={resetGame}
                className="w-full py-2.5 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 transition-all"
              >
                Начать раунд заново
              </button>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="w-full py-2.5 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 transition-all flex items-center justify-center gap-1.5"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>Настройки и сложность</span>
              </button>
              <button
                onClick={() => setIsAnalysisOpen(true)}
                className="w-full py-2.5 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 transition-all flex items-center justify-center gap-1.5"
              >
                <BookOpen className="w-4 h-4 text-sky-400" />
                <span>Открыть отчет об улучшениях</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER SCREEN */}
      {gameOverWinner && (
        <GameOverModal
          winner={gameOverWinner}
          stats={statsRef.current}
          gameMode={gameMode}
          onRestart={resetGame}
          onOpenAnalysis={() => setIsAnalysisOpen(true)}
        />
      )}

      {/* SETTINGS MODAL */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        gameMode={gameMode}
        setGameMode={setGameMode}
        difficulty={difficulty}
        setDifficulty={setDifficulty}
        aimMode={aimMode}
        setAimMode={setAimMode}
        isMuted={isMuted}
        onToggleMute={toggleMute}
        volume={volume}
        onVolumeChange={handleVolumeChange}
        onRestart={resetGame}
      />

      {/* ANALYSIS MODAL */}
      <AnalysisModal
        isOpen={isAnalysisOpen}
        onClose={() => setIsAnalysisOpen(false)}
      />
    </div>
  );
}
