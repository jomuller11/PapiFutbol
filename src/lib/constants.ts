export const TEAM_COLORS = [
  { hex: '#dc2626', name: 'Rojo' },
  { hex: '#ea580c', name: 'Naranja' },
  { hex: '#ca8a04', name: 'Dorado' },
  { hex: '#16a34a', name: 'Verde' },
  { hex: '#059669', name: 'Esmeralda' },
  { hex: '#0891b2', name: 'Cian' },
  { hex: '#2563eb', name: 'Azul' },
  { hex: '#1e3a8a', name: 'Azul marino' },
  { hex: '#7c3aed', name: 'Violeta' },
  { hex: '#c026d3', name: 'Magenta' },
  { hex: '#be185d', name: 'Rosa' },
  { hex: '#44403c', name: 'Grafito' },
] as const;

export const VALID_COLORS = TEAM_COLORS.map(c => c.hex);
