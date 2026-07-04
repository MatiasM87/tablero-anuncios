import React, { useRef, useCallback } from 'react';
import Zone from './Zone.jsx';
import { getTemplate } from '../constants/layouts.js';

const sortByPinnedThenOrder = (raw) => {
  return [...raw].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return a.order - b.order;
  });
};

// Resolves each zone's ordered slide list ({ item, duration }) from the
// page's assignment table. Falls back to the full playlist in the single
// zone when no assignments exist yet (keeps pre-existing single-screen
// boards working without requiring anyone to re-assign their documents).
function buildZoneSlides(template, items, zoneAssignments) {
  const itemsById = Object.fromEntries(items.map(i => [i.id, i]));

  if (zoneAssignments.length === 0 && template.zones.length === 1) {
    const slides = sortByPinnedThenOrder(items).map(item => ({ item, duration: item.duration }));
    return { [template.zones[0].id]: slides };
  }

  const result = {};
  for (const zone of template.zones) {
    result[zone.id] = zoneAssignments
      .filter(a => a.zoneId === zone.id)
      .sort((a, b) => a.order - b.order)
      .map(a => {
        const item = itemsById[a.itemId];
        if (!item) return null;
        return { item, duration: a.duration || item.duration };
      })
      .filter(Boolean);
  }
  return result;
}

// Renders one page's zone grid and waits for every zone to finish at least
// one full lap through its assigned documents (every page of every PDF
// included) before telling the parent to move to the next page — a zone
// showing a single one-page image and a zone showing a 10-page PDF both get
// to finish their queue before the page changes.
export default function PageStage({ page, items, autoAdvance, onPageComplete }) {
  const template = getTemplate(page.template);
  const zoneSlides = buildZoneSlides(template, items, page.zoneAssignments || []);

  const completedZonesRef = useRef(new Set());
  const firedRef = useRef(false);

  const handleZoneComplete = useCallback((zoneId) => {
    if (firedRef.current) return;
    completedZonesRef.current.add(zoneId);
    if (completedZonesRef.current.size >= template.zones.length) {
      firedRef.current = true;
      onPageComplete();
    }
  }, [template.zones.length, onPageComplete]);

  return (
    <div
      className="w-full h-full grid gap-0.5 bg-gray-800"
      style={{
        gridTemplateColumns: template.gridTemplateColumns,
        gridTemplateRows: template.gridTemplateRows,
        gridTemplateAreas: template.gridTemplateAreas,
      }}
    >
      {template.zones.map(zone => (
        <div key={zone.id} style={{ gridArea: zone.id }} className="min-w-0 min-h-0">
          <Zone
            slides={zoneSlides[zone.id] || []}
            autoAdvance={autoAdvance}
            label={zone.label}
            onCycleComplete={() => handleZoneComplete(zone.id)}
          />
        </div>
      ))}
    </div>
  );
}
