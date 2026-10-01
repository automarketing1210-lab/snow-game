export type GameMode = 'duel' | 'survival' | 'practice';
export type Difficulty = 'easy' | 'normal' | 'hard' | 'boss';
export type AimMode = 'manual' | 'auto';

export interface PowerUp {
  id: string;
  type: 'triple' | 'shield' | 'rapid' | 'heal';
  position: [number, number, number];
  mesh?: any;
  duration: number; // in seconds
}

export interface ActivePowerUp {
  type: 'triple' | 'shield' | 'rapid' | 'heal';
  expiresAt: number;
}

export interface FloatingText {
  id: string;
  text: string;
  color: string;
  x: number;
  y: number;
  z: number;
  life: number;
  maxLife: number;
}

export interface GameStats {
  shotsFired: number;
  shotsHit: number;
  headshots: number;
  damageDealt: number;
  damageReceived: number;
  powerupsCollected: number;
  wave: number;
  survivalKills: number;
  timeSurvived: number;
}

export interface DestructibleCover {
  id: string;
  x: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  hp: number;
  maxHp: number;
  mesh?: any;
}
