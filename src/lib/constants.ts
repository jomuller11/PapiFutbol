export const TEAM_COLORS = [
  { hex: '#ffffff', name: 'Blanco' },
  { hex: '#000000', name: 'Negro' },
  { hex: '#dc2626', name: 'Rojo' },
  { hex: '#ea580c', name: 'Naranja' },
  { hex: '#facc15', name: 'Amarillo' },
  { hex: '#ca8a04', name: 'Dorado' },
  { hex: '#16a34a', name: 'Verde' },
  { hex: '#059669', name: 'Esmeralda' },
  { hex: '#0891b2', name: 'Cian' },
  { hex: '#2563eb', name: 'Azul' },
  { hex: '#1e3a8a', name: 'Azul marino' },
  { hex: '#7c3aed', name: 'Violeta' },
  { hex: '#c026d3', name: 'Magenta' },
  { hex: '#ec4899', name: 'Rosa' },
  { hex: '#be185d', name: 'Rosa oscuro' },
  { hex: '#44403c', name: 'Grafito' },
] as const;

export const VALID_COLORS = TEAM_COLORS.map(c => c.hex);

export function isLightColor(hex: string) {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return false;

  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);

  if ([r, g, b].some(Number.isNaN)) return false;

  const luminance = (r * 299 + g * 587 + b * 114) / 1000;
  return luminance >= 160;
}

export function getTeamColorBackground(
  team?: { color?: string | null; secondary_color?: string | null } | null,
  fallback = '#94a3b8'
) {
  if (!team?.color) return fallback;
  if (!team.secondary_color) return team.color;
  return `linear-gradient(135deg, ${team.color} 0%, ${team.color} 50%, ${team.secondary_color} 50%, ${team.secondary_color} 100%)`;
}
