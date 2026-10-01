import React, { useRef, useState, useEffect } from 'react';
import { Zap, Target } from 'lucide-react';

interface TouchControlsProps {
  touchActionRef: React.MutableRefObject<{
    moveX: number;
    moveY: number;
    lookX: number;
    lookY: number;
    isShooting: boolean;
    isCharging: boolean;
    doDash: boolean;
  }>;
}

export const TouchControls: React.FC<TouchControlsProps> = ({ touchActionRef }) => {
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const [stickPos, setStickPos] = useState({ x: 0, y: 0 });
  const [isDraggingJoystick, setIsDraggingJoystick] = useState(false);
  const activeTouchId = useRef<number | null>(null);

  useEffect(() => {
    const checkTouch = () => {
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    checkTouch();
  }, []);

  if (!isTouchDevice) return null;

  const handleJoystickStart = (e: React.TouchEvent) => {
    const touch = e.changedTouches[0];
    activeTouchId.current = touch.identifier;
    setIsDraggingJoystick(true);
    updateJoystick(touch.clientX, touch.clientY);
  };

  const handleJoystickMove = (e: React.TouchEvent) => {
    if (!isDraggingJoystick) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === activeTouchId.current) {
        updateJoystick(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
        break;
      }
    }
  };

  const handleJoystickEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === activeTouchId.current) {
        setIsDraggingJoystick(false);
        setStickPos({ x: 0, y: 0 });
        touchActionRef.current.moveX = 0;
        touchActionRef.current.moveY = 0;
        activeTouchId.current = null;
        break;
      }
    }
  };

  const updateJoystick = (clientX: number, clientY: number) => {
    if (!joystickBaseRef.current) return;
    const rect = joystickBaseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const maxRadius = rect.width / 2;
    const dist = Math.hypot(dx, dy);

    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);

    const x = Math.cos(angle) * clampedDist;
    const y = Math.sin(angle) * clampedDist;

    setStickPos({ x, y });

    // Normalize to -1..1
    touchActionRef.current.moveX = x / maxRadius;
    touchActionRef.current.moveY = y / maxRadius;
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex justify-between p-6 items-end select-none">
      {/* Left Virtual Joystick */}
      <div
        ref={joystickBaseRef}
        onTouchStart={handleJoystickStart}
        onTouchMove={handleJoystickMove}
        onTouchEnd={handleJoystickEnd}
        onTouchCancel={handleJoystickEnd}
        className="w-28 h-28 rounded-full bg-slate-900/60 border-2 border-slate-700/80 backdrop-blur-sm pointer-events-auto flex items-center justify-center relative touch-none shadow-xl"
      >
        <div
          className="w-12 h-12 rounded-full bg-sky-500/80 shadow-lg border border-white/60 pointer-events-none transition-transform"
          style={{
            transform: `translate(${stickPos.x}px, ${stickPos.y}px)`,
          }}
        />
      </div>

      {/* Right Action Buttons */}
      <div className="flex flex-col gap-3 pointer-events-auto items-end">
        {/* Dash Button */}
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            touchActionRef.current.doDash = true;
          }}
          className="w-16 h-16 rounded-full bg-amber-500/80 active:bg-amber-400 text-white font-bold flex flex-col items-center justify-center shadow-lg border-2 border-white/40 active:scale-95 transition-transform"
        >
          <Zap className="w-5 h-5" />
          <span className="text-[9px] uppercase tracking-wider">Рывок</span>
        </button>

        {/* Shoot & Charge Button */}
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            touchActionRef.current.isCharging = true;
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            touchActionRef.current.isCharging = false;
          }}
          className="w-20 h-20 rounded-full bg-gradient-to-tr from-sky-600 to-blue-500 active:from-sky-500 active:to-blue-400 text-white font-bold flex flex-col items-center justify-center shadow-2xl border-2 border-white/60 active:scale-95 transition-transform"
        >
          <Target className="w-6 h-6 mb-0.5" />
          <span className="text-[10px] uppercase font-bold tracking-wider">Бросок</span>
        </button>
      </div>
    </div>
  );
};
