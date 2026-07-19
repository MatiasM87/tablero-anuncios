import React, { useState, useEffect, useCallback, useRef } from 'react';
import PageStage from '../components/PageStage.jsx';
import { fetchItems, fetchSettings, fetchPages } from '../utils/api.js';
import { getTitleFont, getTitleSize } from '../constants/title.js';
import { isScheduleActive } from '../utils/schedule.js';

// Full-width bar across the top of the board. Long titles are cut off with an
// ellipsis instead of wrapping or shrinking the content area further.
function TitleBar({ title }) {
  return (
    <header
      className="w-full flex-shrink-0 flex items-center overflow-hidden px-[3vw]"
      style={{ background: title.background || '#111827' }}
    >
      <h1
        className="w-full text-center truncate whitespace-nowrap leading-tight py-[1vh] font-bold"
        style={{
          color: title.color || '#ffffff',
          fontFamily: getTitleFont(title.font).css,
          fontSize: getTitleSize(title.size).css,
        }}
      >
        {title.text}
      </h1>
    </header>
  );
}

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

export default function Display() {
  const [items, setItems] = useState([]);
  const [settings, setSettings] = useState({ autoAdvance: true });
  const [pages, setPages] = useState([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [visit, setVisit] = useState(0);
  const [loading, setLoading] = useState(true);
  // Re-evaluated periodically so scheduled pages engage/release on time
  // without waiting for the 30s data refresh.
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(id);
  }, []);

  // A page inside its scheduled window takes over the whole board (first one
  // in the list wins if several overlap). Outside of any window, the normal
  // rotation runs — skipping pages marked "solo en su horario".
  let visiblePages = pages;
  const scheduledPage = pages.find(p => isScheduleActive(p.schedule, now));
  if (scheduledPage) {
    visiblePages = [scheduledPage];
  } else {
    visiblePages = pages.filter(p => !(p.schedule?.enabled && p.schedule.hideOutside));
    if (visiblePages.length === 0) visiblePages = pages;
  }

  const pagesRef = useRef([]);
  pagesRef.current = visiblePages;

  useEffect(() => {
    const load = async () => {
      try {
        const [rawItems, cfg, rawPages] = await Promise.all([fetchItems(), fetchSettings(), fetchPages()]);
        setItems(rawItems);
        setSettings(cfg);
        setPages(rawPages);
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

  // Keep the current page in range if the visible list shrinks (pages removed
  // server-side, or a scheduled page taking over / releasing the board)
  useEffect(() => {
    if (pageIndex >= visiblePages.length && visiblePages.length > 0) setPageIndex(0);
  }, [visiblePages.length, pageIndex]);

  // Called once every zone on the current page has shown its whole queue at
  // least once. With a single page there's nowhere to advance to, so it just
  // keeps looping in place exactly like a single-screen board always has.
  const handlePageComplete = useCallback(() => {
    const total = pagesRef.current.length;
    if (total <= 1) return;
    setPageIndex(i => (i + 1) % total);
    setVisit(v => v + 1);
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

  const page = visiblePages[pageIndex] || visiblePages[0];
  if (!page) return null;

  const title = settings.title;
  const showTitle = Boolean(title?.enabled && title.text?.trim());

  return (
    <div className="w-screen h-screen bg-black overflow-hidden select-none flex flex-col">
      {showTitle && <TitleBar title={title} />}

      <div className="relative flex-1 min-h-0">
        {/* Keyed by page id + visit count: only remounts (resetting every zone
            back to its first document) when we deliberately move to another
            page, never on the 30s background data refresh. */}
        <PageStage
          key={`${page.id}-${visit}`}
          page={page}
          items={items}
          autoAdvance={settings.autoAdvance}
          onPageComplete={handlePageComplete}
        />

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
    </div>
  );
}
