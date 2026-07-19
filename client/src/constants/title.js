// Font and size options for the configurable board title. Font stacks use
// widely-available system fonts so they render the same on TV browsers
// without downloading webfonts.
export const TITLE_FONTS = {
  sans: { label: 'Moderna (sans-serif)', css: "'Segoe UI', system-ui, -apple-system, sans-serif" },
  serif: { label: 'Clásica (serif)', css: "Georgia, 'Times New Roman', serif" },
  impact: { label: 'Gruesa (Impact)', css: "Impact, 'Arial Black', sans-serif" },
  mono: { label: 'Monoespaciada', css: "'Courier New', monospace" },
  cursive: { label: 'Cursiva', css: "'Comic Sans MS', 'Segoe Script', cursive" },
};

export const TITLE_SIZES = {
  small: { label: 'Chico', css: '3vh' },
  medium: { label: 'Mediano', css: '4.5vh' },
  large: { label: 'Grande', css: '6.5vh' },
};

export const getTitleFont = (id) => TITLE_FONTS[id] || TITLE_FONTS.sans;
export const getTitleSize = (id) => TITLE_SIZES[id] || TITLE_SIZES.medium;
