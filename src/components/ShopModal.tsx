import React, { useState, useEffect } from 'react';
import { PlayerUpgrades, SkinType } from '../types/game';
import { X, Sparkles, Coins, Zap, Shield, Heart, Snowflake, Crown, Check, Play, Flame } from 'lucide-react';
import { sounds } from '../audio/soundEngine';

interface ShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  coins: number;
  upgrades: PlayerUpgrades;
  onUpgrade: (type: 'snowballDamage' | 'maxHpLevel' | 'staminaSpeed' | 'sculptSpeed', cost: number) => void;
  onSelectSkin: (skin: SkinType, cost?: number) => void;
  onDoubleCoins: () => void;
}

const UPGRADE_COSTS: Record<'snowballDamage' | 'maxHpLevel' | 'staminaSpeed' | 'sculptSpeed', number[]> = {
  snowballDamage: [50, 110, 220, 450],
  maxHpLevel: [40, 90, 190, 380],
  staminaSpeed: [45, 95, 200, 400],
  sculptSpeed: [60, 120, 250, 480],
};

const SKINS: Array<{
  id: SkinType;
  name: string;
  desc: string;
  cost: number;
  icon: string;
  color: string;
}> = [
  {
    id: 'classic',
    name: 'Вязаная шапочка',
    desc: 'Уютная теплая шапка с помпоном',
    cost: 0,
    icon: '🧣',
    color: 'from-sky-500 to-blue-600',
  },
  {
    id: 'santa',
    name: 'Колпак Санты',
    desc: 'Праздничный красный колпак с белым мехом',
    cost: 150,
    icon: '🎅',
    color: 'from-red-500 to-rose-700',
  },
  {
    id: 'crown',
    name: 'Золотая Корона',
    desc: 'Королевский венец Снежного Короля',
    cost: 300,
    icon: '👑',
    color: 'from-amber-400 to-yellow-600',
  },
  {
    id: 'frost',
    name: 'Ледяной Кристалл',
    desc: 'Магическая корона из вечного северного льда',
    cost: 450,
    icon: '❄️',
    color: 'from-cyan-400 to-teal-600',
  },
];

export const ShopModal: React.FC<ShopModalProps> = ({
  isOpen,
  onClose,
  coins,
  upgrades,
  onUpgrade,
  onSelectSkin,
  onDoubleCoins,
}) => {
  const [activeTab, setActiveTab] = useState<'upgrades' | 'skins'>('upgrades');
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [adTimer, setAdTimer] = useState(5);
  const [adFinished, setAdFinished] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (isWatchingAd) {
      setAdTimer(5);
      setAdFinished(false);
      interval = setInterval(() => {
        setAdTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setAdFinished(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isWatchingAd]);

  if (!isOpen) return null;

  const handleClaimAdReward = () => {
    sounds.playCoin();
    onDoubleCoins();
    setIsWatchingAd(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md">
      {/* Rewarded Video Ad Modal */}
      {isWatchingAd && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg">
          <div className="relative w-full max-w-md bg-slate-900 border-2 border-amber-400/70 rounded-3xl p-6 text-center shadow-[0_0_50px_rgba(251,191,36,0.3)] flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-400/40 flex items-center justify-center text-3xl mb-4 animate-bounce">
              🎁
            </div>
            <div className="text-xs uppercase font-mono font-bold tracking-widest text-amber-400 mb-1">
              Рекламный Спонсор: Северный Экспресс
            </div>
            <h3 className="text-xl font-black text-white mb-2">Новогодний Подарок Снеговичку!</h3>
            <p className="text-xs text-slate-400 mb-6">
              Смотрите праздничный ролик, чтобы получить удвоение всех ваших золотых монет!
            </p>

            {/* Countdown animation */}
            <div className="w-full bg-slate-800 rounded-full h-3 mb-4 overflow-hidden border border-slate-700">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-yellow-300 transition-all duration-1000 rounded-full"
                style={{ width: `${((5 - adTimer) / 5) * 100}%` }}
              />
            </div>

            {!adFinished ? (
              <div className="text-sm font-mono font-bold text-amber-300 animate-pulse mb-2">
                Награда через: {adTimer} сек...
              </div>
            ) : (
              <button
                onClick={handleClaimAdReward}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-500/30 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Coins className="w-5 h-5 fill-slate-950" /> Забрать удвоенные монеты (x2)!
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Shop Container */}
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-3xl p-5 sm:p-7 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-400/40 flex items-center justify-center text-xl shadow-inner">
              🎄
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                Новогодний Магазин
                <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-400/30">
                  Зима 2026
                </span>
              </h2>
              <p className="text-xs text-slate-400">Улучшайте снеговика за монеты из подарков!</p>
            </div>
          </div>

          {/* Coins Badge & Close */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 font-mono font-bold text-sm shadow-sm">
              <Coins className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span>{coins}</span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Double Coins Ad Promo Banner */}
        <div className="my-3 p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-orange-500/20 border border-amber-400/40 flex items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-400/20 text-amber-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-black text-amber-300">
                Удвоить все собранные монеты! (x2)
              </div>
              <div className="text-[11px] text-slate-300">Короткий ролик (5 сек) удвоит ваш баланс монет</div>
            </div>
          </div>
          <button
            onClick={() => setIsWatchingAd(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5 shrink-0"
          >
            <Play className="w-3.5 h-3.5 fill-slate-950" /> Смотреть x2
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => setActiveTab('upgrades')}
            className={`flex-1 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
              activeTab === 'upgrades'
                ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/25'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            ⚡ Боевые Улучшения
          </button>
          <button
            onClick={() => setActiveTab('skins')}
            className={`flex-1 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
              activeTab === 'skins'
                ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/25'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            🎅 Скины & Головные Уборы
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3">
          {activeTab === 'upgrades' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* 1. Snowball Damage */}
              {(() => {
                const lvl = upgrades.snowballDamage;
                const maxLvl = 4;
                const cost = lvl < maxLvl ? UPGRADE_COSTS.snowballDamage[lvl] : null;
                const canAfford = cost !== null && coins >= cost;

                return (
                  <div className="p-3.5 rounded-2xl bg-slate-800/70 border border-slate-700 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                          <Flame className="w-4 h-4" /> Плотность снежков
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-400">Ур. {lvl}/{maxLvl}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mb-3">
                        +15% урона от каждого снежка (+{lvl * 15}% сейчас)
                      </p>
                    </div>

                    {cost !== null ? (
                      <button
                        onClick={() => canAfford && onUpgrade('snowballDamage', cost)}
                        disabled={!canAfford}
                        className={`w-full py-2 px-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                          canAfford
                            ? 'bg-amber-400 text-slate-950 hover:bg-amber-300 shadow-md'
                            : 'bg-slate-700/60 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <Coins className="w-3.5 h-3.5" /> Улучшить за {cost}
                      </button>
                    ) : (
                      <div className="py-2 text-center text-xs font-bold text-emerald-400 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                        ✓ МАКСИМУМ
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* 2. Max HP */}
              {(() => {
                const lvl = upgrades.maxHpLevel;
                const maxLvl = 4;
                const cost = lvl < maxLvl ? UPGRADE_COSTS.maxHpLevel[lvl] : null;
                const canAfford = cost !== null && coins >= cost;

                return (
                  <div className="p-3.5 rounded-2xl bg-slate-800/70 border border-slate-700 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                          <Heart className="w-4 h-4" /> Теплый шарф
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-400">Ур. {lvl}/{maxLvl}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mb-3">
                        +25 HP к здоровью снеговика ({100 + lvl * 25} HP сейчас)
                      </p>
                    </div>

                    {cost !== null ? (
                      <button
                        onClick={() => canAfford && onUpgrade('maxHpLevel', cost)}
                        disabled={!canAfford}
                        className={`w-full py-2 px-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                          canAfford
                            ? 'bg-amber-400 text-slate-950 hover:bg-amber-300 shadow-md'
                            : 'bg-slate-700/60 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <Coins className="w-3.5 h-3.5" /> Улучшить за {cost}
                      </button>
                    ) : (
                      <div className="py-2 text-center text-xs font-bold text-emerald-400 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                        ✓ МАКСИМУМ
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* 3. Stamina / Dash */}
              {(() => {
                const lvl = upgrades.staminaSpeed;
                const maxLvl = 4;
                const cost = lvl < maxLvl ? UPGRADE_COSTS.staminaSpeed[lvl] : null;
                const canAfford = cost !== null && coins >= cost;

                return (
                  <div className="p-3.5 rounded-2xl bg-slate-800/70 border border-slate-700 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
                          <Zap className="w-4 h-4" /> Коньки-скороходы
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-400">Ур. {lvl}/{maxLvl}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mb-3">
                        +20% быстрее восстановление энергии и скольжение (+{lvl * 20}%)
                      </p>
                    </div>

                    {cost !== null ? (
                      <button
                        onClick={() => canAfford && onUpgrade('staminaSpeed', cost)}
                        disabled={!canAfford}
                        className={`w-full py-2 px-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                          canAfford
                            ? 'bg-amber-400 text-slate-950 hover:bg-amber-300 shadow-md'
                            : 'bg-slate-700/60 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <Coins className="w-3.5 h-3.5" /> Улучшить за {cost}
                      </button>
                    ) : (
                      <div className="py-2 text-center text-xs font-bold text-emerald-400 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                        ✓ МАКСИМУМ
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* 4. Sculpt Speed */}
              {(() => {
                const lvl = upgrades.sculptSpeed;
                const maxLvl = 4;
                const cost = lvl < maxLvl ? UPGRADE_COSTS.sculptSpeed[lvl] : null;
                const canAfford = cost !== null && coins >= cost;

                return (
                  <div className="p-3.5 rounded-2xl bg-slate-800/70 border border-slate-700 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                          <Snowflake className="w-4 h-4" /> Мастер лепки
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-400">Ур. {lvl}/{maxLvl}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mb-3">
                        Снежки в ладонях лепятся на +25% быстрее! (+{lvl * 25}%)
                      </p>
                    </div>

                    {cost !== null ? (
                      <button
                        onClick={() => canAfford && onUpgrade('sculptSpeed', cost)}
                        disabled={!canAfford}
                        className={`w-full py-2 px-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                          canAfford
                            ? 'bg-amber-400 text-slate-950 hover:bg-amber-300 shadow-md'
                            : 'bg-slate-700/60 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <Coins className="w-3.5 h-3.5" /> Улучшить за {cost}
                      </button>
                    ) : (
                      <div className="py-2 text-center text-xs font-bold text-emerald-400 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                        ✓ МАКСИМУМ
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SKINS.map((skin) => {
                const isUnlocked = upgrades.unlockedSkins.includes(skin.id);
                const isSelected = upgrades.activeSkin === skin.id;
                const canAfford = coins >= skin.cost;

                return (
                  <div
                    key={skin.id}
                    className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-sky-500/15 border-sky-400 shadow-lg shadow-sky-500/10'
                        : 'bg-slate-800/70 border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${skin.color} flex items-center justify-center text-lg shadow-md`}
                          >
                            {skin.icon}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-white">{skin.name}</div>
                            <div className="text-[10px] text-slate-400">{skin.desc}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3">
                      {isSelected ? (
                        <div className="py-1.5 px-3 rounded-xl bg-sky-500/20 border border-sky-400/40 text-sky-300 font-bold text-xs flex items-center justify-center gap-1.5">
                          <Check className="w-3.5 h-3.5" /> Надето
                        </div>
                      ) : isUnlocked ? (
                        <button
                          onClick={() => onSelectSkin(skin.id)}
                          className="w-full py-1.5 px-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs uppercase tracking-wider transition-all"
                        >
                          Надеть
                        </button>
                      ) : (
                        <button
                          onClick={() => canAfford && onSelectSkin(skin.id, skin.cost)}
                          disabled={!canAfford}
                          className={`w-full py-1.5 px-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                            canAfford
                              ? 'bg-amber-400 text-slate-950 hover:bg-amber-300 shadow-md'
                              : 'bg-slate-700/60 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          <Coins className="w-3.5 h-3.5" /> Разблокировать ({skin.cost})
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
