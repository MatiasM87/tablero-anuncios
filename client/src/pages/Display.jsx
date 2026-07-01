import React, { useState, useEffect } from 'react';
import Zone from '../components/Zone.jsx';
import { fetchItems, fetchSettings, fetchLayout } from '../utils/api.js';
import { getTemplate } from '../constants/layouts.js';

function Clock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="text-white/70 text-sm font-mono tabular-nums">{time}</span>;
}

const sortByPinnedThenOrder = (raw) => {
  return [...raw].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return a.order - b.order;
  });
};

// Resolves each zone's ordered slide list ({ item, duration }) from the
// assignment table. Falls back to the full playlist in zone "a" when no
// assignments exist yet (keeps pre-existing single-screen boards working).
function buildZoneSlides(templateId, items, zoneAssignments) {
  const template = getTemplate(templateId);
  const itemsById = Object.fromEntries(items.map(i => [i.id, i]));

  if (zoneAssignments.length === 0 && templateId === 'single') {
    const slides = sortByPinnedThenOrder(items).map(item => ({ item, duration: item.duration }));
    return { a: slides };
  }

  const result = {};
  for (const zone of template.zones) {
    const forZone = zoneAssignments
      .filter(a => a.zoneId === zone.id)
      .sort((a, b) => a.order - b.order)
      .map(a => {
        const item = itemsById[a.itemId];
        if (!item) return null;
        return { item, duration: a.duration || item.duration };
      })
      .filter(Boolean);
    result[zone.id] = forZone;
  }
  return result;
}

export default function Display() {
  const [items, setItems] = useState([]);
  const [settings, setSettings] = useState({ autoAdvance: true });
  const [templateId, setTemplateId] = useState('single');
  const [zoneAssignments, setZoneAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [rawItems, cfg, layout] = await Promise.all([fetchItems(), fetchSettings(), fetchLayout()]);
        setItems(rawItems);
        setSettings(cfg);
        setTemplateId(layout.template);
        setZoneAssignments(layout.zoneAssignments);
        setLoading(false);
      } catch (err) {
        console.error('Error cargando datos:', err);
        setLoading(false);
      }
    };
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  if (loading) {
    return (
      <div className="w-screen h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xl opacity-50">Cargando…</p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="w-screen h-screen bg-gray-950 flex flex-col items-center justify-center gap-6 text-white">
        <span className="text-8xl">📋</span>
        <h1 className="text-4xl font-light opacity-70">Tablero de Anuncios</h1>
        <p className="text-xl opacity-40">No hay contenido todavía</p>
        <a
          href="/admin"
          className="mt-4 px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl text-lg font-medium transition-colors"
        >
          Ir al panel de administración →
        </a>
      </div>
    );
  }

  const template = getTemplate(templateId);
  const zoneSlides = buildZoneSlides(templateId, items, zoneAssignments);

  return (
    <div className="w-screen h-screen bg-black overflow-hidden relative select-none">
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
            <Zone slides={zoneSlides[zone.id] || []} autoAdvance={settings.autoAdvance} label={zone.label} />
          </div>
        ))}
      </div>

      {/* Global clock overlay */}
      <div className="absolute top-3 left-3 z-20 bg-black/40 rounded-lg px-3 py-1.5">
        <Clock />
      </div>

      {/* Admin shortcut — barely visible, hover to reveal */}
      <a
        href="/admin"
        className="absolute top-3 right-3 z-20 opacity-0 hover:opacity-100 transition-opacity duration-300 text-white/60 hover:text-white bg-black/40 rounded-lg px-3 py-1.5 text-xs"
      >
        Admin
      </a>
    </div>
  );
}
