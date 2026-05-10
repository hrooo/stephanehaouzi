import { createAvatar, type Style } from "@dicebear/core";
import {
  funEmoji,
  bottts,
  lorelei,
  micah,
  bigSmile,
  avataaars,
  pixelArt,
  thumbs,
} from "@dicebear/collection";

export type AvatarStyle = keyof typeof STYLES;

// Chaque collection a son propre type d'options : on les regroupe dans un map
// dont les valeurs sont des Style<any> pour pouvoir factoriser createAvatar().
export const STYLES: Record<string, Style<Record<string, unknown>>> = {
  "fun-emoji": funEmoji as unknown as Style<Record<string, unknown>>,
  bottts: bottts as unknown as Style<Record<string, unknown>>,
  lorelei: lorelei as unknown as Style<Record<string, unknown>>,
  micah: micah as unknown as Style<Record<string, unknown>>,
  "big-smile": bigSmile as unknown as Style<Record<string, unknown>>,
  avataaars: avataaars as unknown as Style<Record<string, unknown>>,
  "pixel-art": pixelArt as unknown as Style<Record<string, unknown>>,
  thumbs: thumbs as unknown as Style<Record<string, unknown>>,
};

export const STYLE_LABELS: Record<AvatarStyle, string> = {
  "fun-emoji": "Emojis fun",
  bottts: "Robots",
  lorelei: "Portraits",
  micah: "Minimaliste",
  "big-smile": "Cartoon souriant",
  avataaars: "Avataaars classiques",
  "pixel-art": "Pixel art",
  thumbs: "Pouce",
};

export const STYLE_KEYS: AvatarStyle[] = Object.keys(STYLES) as AvatarStyle[];

export function isAvatarStyle(value: string): value is AvatarStyle {
  return value in STYLES;
}

/** Génère une string SVG représentant l'avatar (rendu côté serveur). */
export function renderAvatarSvg(style: string, seed: string): string {
  const styleKey = isAvatarStyle(style) ? style : "fun-emoji";
  const collection = STYLES[styleKey];
  const safeSeed = seed && seed.trim() ? seed.trim() : "anonymous";
  return createAvatar(collection, {
    seed: safeSeed,
    size: 128,
    radius: 50,
  }).toString();
}

/** Encode l'SVG en data URI utilisable dans `<img src=...>`. */
export function avatarDataUri(style: string, seed: string): string {
  const svg = renderAvatarSvg(style, seed);
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
