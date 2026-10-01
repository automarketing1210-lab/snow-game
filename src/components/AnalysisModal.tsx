import React, { useState } from 'react';
import { X, CheckCircle2, AlertTriangle, Lightbulb, Zap, Shield, Target, Volume2, Cpu, Eye, Sparkles } from 'lucide-react';

interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AnalysisModal: React.FC<AnalysisModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'gameplay' | 'ai' | 'audio' | 'tech'>('overview');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Анализ кода и предложения по улучшению игры</h2>
              <p className="text-xs text-slate-400">Детальный аудит 3D Snowball Fight и обзор реализованных решений</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 py-2.5 bg-slate-950/50 border-b border-slate-800 overflow-x-auto">
          {[
            { id: 'overview', label: 'Обзор и слабые места', icon: AlertTriangle },
            { id: 'gameplay', label: 'Механика и геймплей', icon: Target },
            { id: 'ai', label: 'Искусственный интеллект', icon: Cpu },
            { id: 'audio', label: 'Звуковой дизайн', icon: Volume2 },
            { id: 'tech', label: 'Архитектура и графика', icon: Eye },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm leading-relaxed">
          {activeTab === 'overview' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200">
                <h3 className="font-bold text-amber-300 text-sm mb-1 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Главная проблема исходного файла
                </h3>
                <p className="text-xs leading-relaxed text-amber-200/90">
                  В оригинальном файле была хорошая база Three.js графики, однако присутствовал критический недостаток геймдизайна: 
                  <strong> при нажатии Space/ЛКМ снежок автоматически наводился во врага</strong> по формуле параболы. 
                  Игрок вообще не целился, а только ходил WASD. В игре также полностью отсутствовал звук, укрытия, тактические маневры и разнообразие режимов.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60">
                  <h4 className="font-bold text-red-400 mb-2 flex items-center gap-2">
                    <span>❌</span> Что было в исходнике
                  </h4>
                  <ul className="text-xs space-y-2 text-slate-300">
                    <li>• Автоприцел: снежки всегда летели в центр врага без участия игрока.</li>
                    <li>• 0 звуков: ни броска, ни шагов, ни попаданий, ни победного фанфара.</li>
                    <li>• Примитивный бот: шел по прямой и стрелял строго раз в 2.2 секунды.</li>
                    <li>• Плоская линейность: одинаковый урон 10 HP в любую точку, нет критов.</li>
                    <li>• Пустая арена: негде укрыться, нет интерактивных объектов и бонусов.</li>
                    <li>• Только 1 режим: одиночный бой 1 на 1 до 100 HP.</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/50 border border-sky-500/30">
                  <h4 className="font-bold text-sky-400 mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Что мы внедрили в обновленной версии
                  </h4>
                  <ul className="text-xs space-y-2 text-slate-300">
                    <li>• <strong>Ручной прицел (Crosshair Aim)</strong> с честной 3D-баллистикой и упреждением.</li>
                    <li>• <strong>Заряжаемый выстрел</strong>: зажатие ЛКМ создает огромный мега-снежок с сильным уроном.</li>
                    <li>• <strong>Тактический рывок (Dash)</strong> на Shift с кадрами неуязвимости (i-frames).</li>
                    <li>• <strong>Локализованный урон (Headshot)</strong>: попадание в голову сбивает шапку и наносит 2.2x урон!</li>
                    <li>• <strong>Разрушаемые снежные форты</strong>: можно прятаться за ледяными стенами.</li>
                    <li>• <strong>Процедурный аудио-движок Web Audio API</strong> с синтезом всех звуков без внешних файлов!</li>
                    <li>• <strong>3 режима игры</strong>: Дуэль 1v1, Волны выживания (Survival) и Тир.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'gameplay' && (
            <div className="space-y-4">
              <h3 className="font-bold text-white text-base">Глубокие улучшения боевой системы</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60">
                  <div className="flex items-center gap-2 font-semibold text-sky-400 text-xs mb-1">
                    <Zap className="w-4 h-4" /> Заряжаемый мега-снежок (Charge Shot)
                  </div>
                  <p className="text-xs text-slate-300">
                    Удержание кнопки броска накапливает энергию. Мега-снежок увеличивается в размере в 1.8 раза, летит быстрее, наносит 30 урона и создает мощную ударную волну.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60">
                  <div className="flex items-center gap-2 font-semibold text-emerald-400 text-xs mb-1">
                    <Shield className="w-4 h-4" /> Тактический рывок / Додж (Dash)
                  </div>
                  <p className="text-xs text-slate-300">
                    Нажатие клавиши Shift расходует шкалу выносливости (Stamina) и дает мгновенное ускорение с частицами снега, позволяя уворачиваться от летящих снарядов.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60">
                  <div className="flex items-center gap-2 font-semibold text-amber-400 text-xs mb-1">
                    <Target className="w-4 h-4" /> Хедшоты со сбиванием шляпы
                  </div>
                  <p className="text-xs text-slate-300">
                    Прицельное попадание в голову снеговика не просто отнимает больше здоровья, но и физически срывает его цилиндр или корону, который улетает в воздух!
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60">
                  <div className="flex items-center gap-2 font-semibold text-cyan-400 text-xs mb-1">
                    <Sparkles className="w-4 h-4" /> Спавн кристаллов-бонусов (Power-ups)
                  </div>
                  <p className="text-xs text-slate-300">
                    На поле боя периодически появляются кристаллы: <strong>Тройной выстрел (веер)</strong>, <strong>Ледяной щит</strong> (поглощает удары), <strong>Скорострел</strong> и <strong>Восстановление снега (+35 HP)</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-4">
              <h3 className="font-bold text-white text-base">Интеллект противника (Smart AI)</h3>
              <p className="text-xs text-slate-300">
                В исходнике бот был чисто статическим механизмом с таймером <code>snowman2.lastShot &gt; 2.2</code>. 
                Мы переписали ИИ на модель стейт-машины:
              </p>
              <div className="space-y-2.5">
                <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/60 flex items-start gap-3">
                  <span className="text-sky-400 font-mono text-xs font-bold shrink-0">01</span>
                  <div className="text-xs">
                    <strong className="text-white">Реакция уклонения (Dodge AI):</strong> бот сканирует приближающиеся снаряды игрока. Если синий снежок находится ближе 12 единиц, снеговик совершает боковой прыжок (стрейф).
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/60 flex items-start gap-3">
                  <span className="text-sky-400 font-mono text-xs font-bold shrink-0">02</span>
                  <div className="text-xs">
                    <strong className="text-white">Стрельба на упреждение (Predictive Aiming):</strong> враг учитывает вектор текущей скорости игрока и рассчитывает упреждение, делая стрельбу динамичной и опасной на сложности Hard.
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/60 flex items-start gap-3">
                  <span className="text-sky-400 font-mono text-xs font-bold shrink-0">03</span>
                  <div className="text-xs">
                    <strong className="text-white">Босс «Король Снеговик»:</strong> увеличенная модель, золотая корона, 250 HP, веерные залпы и агрессивная тактика сокращения дистанции.
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'audio' && (
            <div className="space-y-4">
              <h3 className="font-bold text-white text-base">Процедурный аудио-движок Web Audio API</h3>
              <p className="text-xs text-slate-300">
                Вместо загрузки внешних mp3/wav файлов, которые могут не загрузиться или заблокироваться политикой браузера, мы разработали встроенный генератор звуков:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/60">
                  <strong className="text-sky-300 block mb-1">💨 Свист броска:</strong>
                  Фильтрованный белый шум с динамическим экспоненциальным сдвигом частоты полосового фильтра (Bandpass).
                </div>
                <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/60">
                  <strong className="text-sky-300 block mb-1">💥 Шлепок снега:</strong>
                  Сочетание низкочастотного осциллятора (sine 160Hz) и мягкого шума для имитации рассыпающегося снега.
                </div>
                <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/60">
                  <strong className="text-sky-300 block mb-1">🔔 Звонкий хедшот:</strong>
                  Дополнительный гармонический колокольчик (1200Hz), сигнализирующий о сбитой шапке.
                </div>
                <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/60">
                  <strong className="text-sky-300 block mb-1">❄️ Хруст шагов:</strong>
                  Короткие импульсы микро-шума при беге по сугробам.
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tech' && (
            <div className="space-y-4">
              <h3 className="font-bold text-white text-base">Архитектура и производительность</h3>
              <ul className="text-xs space-y-2.5 text-slate-300">
                <li className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/60">
                  <strong className="text-white">React + Three.js компонентность:</strong> логика рендеринга изолирована в <code>GameCanvas</code>, что исключает утечки памяти (memory leaks) и корректно освобождает WebGL контекст.
                </li>
                <li className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/60">
                  <strong className="text-white">Мягкие тени PCFSoftShadowMap & ACES Filmic Tone Mapping:</strong> реалистичная цветопередача снега без пересвета (anti-burnout).
                </li>
                <li className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/60">
                  <strong className="text-white">Пул частиц (Particle Pooling):</strong> снежинки и всплески ударов переиспользуются, обеспечивая стабильные 60 FPS даже на слабых устройствах.
                </li>
                <li className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/60">
                  <strong className="text-white">Поддержка мобильных устройств:</strong> адаптивный виртуальный джойстик и тач-кнопки броска/рывка.
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/90">
          <span className="text-xs text-slate-400">Нажмите ESC или закройте окно, чтобы продолжить бой</span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-lg transition-all active:scale-95"
          >
            Вернуться в игру 🎮
          </button>
        </div>
      </div>
    </div>
  );
};
