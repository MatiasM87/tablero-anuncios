import React, { useState, useEffect, useRef, useCallback } from 'react';
import FileViewer from '../components/FileViewer.jsx';
import { fetchItems, fetchSettings } from '../utils/api.js';

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

function Dots({ total, current }) {
  if (total <= 1) return null;
  return (
    <div className="flex gap-1.5 items-center">
      {Array.from({ length: Math.min(total, 12) }).map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i === current % 12 ? 'w-3 h-3 bg-white' : 'w-2 h-2 bg-white/30'
          }`}
        />
      ))}
      {total > 12 && <span className="text-white/40 text-xs ml-1">+{total - 12}</span>}
    </div>
  );
}

export default function Display() {
  const [items, setItems] = useState([]);
  const [settings, setSettings] = useState({ autoAdvance: true });
  const [loading, setLoading] = useState(true);

  // Slide state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(true);

  // Use refs to avoid stale closures in callbacks
  const itemsRef = useRef([]);
  const currentIndexRef = useRef(0);
  const currentPageRef = useRef(1);
  const totalPagesRef = useRef(1);
  const autoAdvanceRef = useRef(true);

  itemsRef.current = items;
  currentIndexRef.current = currentIndex;
  currentPageRef.current = currentPage;
  totalPagesRef.current = totalPages;
  autoAdvanceRef.current = settings.autoAdvance;

  const sortItems = (raw) => {
    return [...raw].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return a.order - b.order;
    });
  };

  // Initial load + periodic refresh (picks up admin changes)
  useEffect(() => {
    const load = async () => {
      try {
        const [rawItems, cfg] = await Promise.all([fetchItems(), fetchSettings()]);
        const sorted = sortItems(rawItems);
        setItems(sorted);
        setSettings(cfg);
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

  // Advance to next slide (cross-fade → swap content → fade in)
  const advance = useCallback(() => {
    if (!autoAdvanceRef.current) return;

    const page = currentPageRef.current;
    const total = totalPagesRef.current;
    const idx = currentIndexRef.current;
    const items = itemsRef.current;

    if (items.length === 0) return;

    setVisible(false);

    setTimeout(() => {
      setProgress(0);
      if (page < total) {
        const next = page + 1;
        setCurrentPage(next);
        currentPageRef.current = next;
      } else {
        const nextIdx = (idx + 1) % items.length;
        setCurrentIndex(nextIdx);
        currentIndexRef.current = nextIdx;
        setCurrentPage(1);
        currentPageRef.current = 1;
        setTotalPages(1);
        totalPagesRef.current = 1;
      }
      setVisible(true);
    }, 500);
  }, []);

  // Timer + progress bar per slide
  useEffect(() => {
    if (loading || items.length === 0) return;

    const item = items[currentIndex];
    if (!item) return;

    const duration = (item.duration || 10) * 1000;
    const startAt = Date.now();

    const tickId = setInterval(() => {
      const elapsed = Date.now() - startAt;
      setProgress(Math.min((elapsed / duration) * 100, 100));
    }, 100);

    const timeoutId = setTimeout(advance, duration);

    return () => {
      clearInterval(tickId);
      clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, currentPage, loading, items.length]);

  const handleTotalPages = useCallback((n) => {
    setTotalPages(n);
    totalPagesRef.current = n;
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

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

  const item = items[currentIndex];

  return (
    <div className="w-screen h-screen bg-black overflow-hidden relative select-none">
      {/* Content area — full screen */}
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{ opacity: visible ? 1 : 0 }}
      >
        <FileViewer item={item} page={currentPage} onTotalPages={handleTotalPages} />
      </div>

      {/* Bottom overlay bar */}
      <div className="absolute bottom-0 left-0 right-0 z-10">
        {/* Info bar */}
        <div className="flex items-center justify-between px-6 py-2 bg-gradient-to-t from-black/80 to-transparent">
          <span className="text-white/80 text-sm font-medium truncate max-w-xs">
            {item.name}
          </span>
          <div className="flex items-center gap-4">
            {item.type === 'pdf' && totalPages > 1 && (
              <span className="text-white/50 text-xs tabular-nums">
                {currentPage} / {totalPages}
              </span>
            )}
            <Dots total={items.length} current={currentIndex} />
            <Clock />
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-white/10">
          <div
            className="h-full bg-blue-500 transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>
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
