export type GameMode = 'duel' | 'survival' | 'practice';
export type Difficulty = 'easy' | 'normal' | 'hard' | 'boss';
export type AimMode = 'manual' | 'auto';

export type PickupType = 'sack' | 'gift_bag' | 'chest';
export type SkinType = 'classic' | 'santa' | 'crown' | 'frost';

export interface PlayerUpgrades {
  snowballDamage: number; // 0..4 (+15% damage per level)
  maxHpLevel: number;     // 0..4 (+25 HP per level)
  staminaSpeed: number;   // 0..4 (+20% faster stamina recovery)
  sculptSpeed: number;    // 0..4 (+25% faster snowball crafting)
  activeSkin: SkinType;
  unlockedSkins: SkinType[];
}

export interface PowerUp {
  id: string;
  type: 'triple' | 'shield' | 'rapid' | 'heal' | 'sack' | 'gift_bag' | 'chest';
  position: [number, number, number];
  mesh?: any;
  duration: number; // in seconds
}

export interface ActivePowerUp {
  type: 'triple' | 'shield' | 'rapid' | 'heal' | 'mega';
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
