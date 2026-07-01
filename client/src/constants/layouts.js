// Each template defines a CSS grid + an ordered list of zones.
// zone.id matches the zoneId stored in server zoneAssignments.
export const LAYOUT_TEMPLATES = {
  single: {
    label: 'Pantalla completa',
    description: '1 zona',
    gridTemplateColumns: '1fr',
    gridTemplateRows: '1fr',
    gridTemplateAreas: '"a"',
    zones: [{ id: 'a', label: 'Zona única' }],
  },
  'split-2v': {
    label: '2 zonas verticales',
    description: 'Lado a lado',
    gridTemplateColumns: '1fr 1fr',
    gridTemplateRows: '1fr',
    gridTemplateAreas: '"a b"',
    zones: [
      { id: 'a', label: 'Zona izquierda' },
      { id: 'b', label: 'Zona derecha' },
    ],
  },
  'split-2h': {
    label: '2 zonas horizontales',
    description: 'Una arriba, una abajo',
    gridTemplateColumns: '1fr',
    gridTemplateRows: '1fr 1fr',
    gridTemplateAreas: '"a" "b"',
    zones: [
      { id: 'a', label: 'Zona superior' },
      { id: 'b', label: 'Zona inferior' },
    ],
  },
  'split-3-left': {
    label: '3 zonas — columna grande',
    description: '1 vertical grande + 2 horizontales',
    gridTemplateColumns: '2fr 1fr',
    gridTemplateRows: '1fr 1fr',
    gridTemplateAreas: '"a b" "a c"',
    zones: [
      { id: 'a', label: 'Zona vertical (grande)' },
      { id: 'b', label: 'Zona horizontal 1' },
      { id: 'c', label: 'Zona horizontal 2' },
    ],
  },
  'split-3-top': {
    label: '3 zonas — fila grande',
    description: '1 horizontal grande + 2 verticales',
    gridTemplateColumns: '1fr 1fr',
    gridTemplateRows: '2fr 1fr',
    gridTemplateAreas: '"a a" "b c"',
    zones: [
      { id: 'a', label: 'Zona horizontal (grande)' },
      { id: 'b', label: 'Zona vertical 1' },
      { id: 'c', label: 'Zona vertical 2' },
    ],
  },
  'grid-4': {
    label: '4 zonas',
    description: 'Grilla 2x2',
    gridTemplateColumns: '1fr 1fr',
    gridTemplateRows: '1fr 1fr',
    gridTemplateAreas: '"a b" "c d"',
    zones: [
      { id: 'a', label: 'Zona 1' },
      { id: 'b', label: 'Zona 2' },
      { id: 'c', label: 'Zona 3' },
      { id: 'd', label: 'Zona 4' },
    ],
  },
};

export const getTemplate = (id) => LAYOUT_TEMPLATES[id] || LAYOUT_TEMPLATES.single;
