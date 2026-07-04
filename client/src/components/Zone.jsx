import React, { useState, useEffect, useRef, useCallback } from 'react';
import FileViewer from './FileViewer.jsx';

function Dots({ total, current }) {
  if (total <= 1) return null;
  return (
    <div className="flex gap-1.5 items-center">
      {Array.from({ length: Math.min(total, 12) }).map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i === current % 12 ? 'w-2.5 h-2.5 bg-white' : 'w-1.5 h-1.5 bg-white/30'
          }`}
        />
      ))}
      {total > 12 && <span className="text-white/40 text-xs ml-1">+{total - 12}</span>}
    </div>
  );
}

// Plays through an ordered list of { item, duration } entries on a loop,
// advancing pages within multi-page documents before moving to the next entry.
// Reports onCycleComplete() the instant it wraps back to the first entry —
// the parent page uses that to know this zone finished showing everything
// at least once, without caring how long that took.
export default function Zone({ slides, autoAdvance, label, onCycleComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(true);

  const slidesRef = useRef([]);
  const currentIndexRef = useRef(0);
  const currentPageRef = useRef(1);
  const totalPagesRef = useRef(1);
  const autoAdvanceRef = useRef(true);
  const onCycleCompleteRef = useRef(onCycleComplete);

  slidesRef.current = slides;
  currentIndexRef.current = currentIndex;
  currentPageRef.current = currentPage;
  totalPagesRef.current = totalPages;
  autoAdvanceRef.current = autoAdvance;
  onCycleCompleteRef.current = onCycleComplete;

  // Keep the current slide in range if the assigned list shrinks
  useEffect(() => {
    if (currentIndex >= slides.length) {
      setCurrentIndex(0);
      setCurrentPage(1);
      setTotalPages(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides.length]);

  // An empty zone has nothing to lap through — signal completion right away
  // so it never holds up the page it belongs to.
  useEffect(() => {
    if (slides.length === 0) onCycleCompleteRef.current?.();
  }, [slides.length]);

  const advance = useCallback(() => {
    if (!autoAdvanceRef.current) return;

    const page = currentPageRef.current;
    const total = totalPagesRef.current;
    const idx = currentIndexRef.current;
    const list = slidesRef.current;

    if (list.length === 0) return;

    setVisible(false);

    setTimeout(() => {
      setProgress(0);
      if (page < total) {
        const next = page + 1;
        setCurrentPage(next);
        currentPageRef.current = next;
      } else {
        const nextIdx = (idx + 1) % list.length;
        if (nextIdx === 0) onCycleCompleteRef.current?.();
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

  useEffect(() => {
    if (slides.length === 0) return;
    const slide = slides[currentIndex];
    if (!slide) return;

    const duration = (slide.duration || 10) * 1000;
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
  }, [currentIndex, currentPage, slides.length]);

  const handleTotalPages = useCallback((n) => {
    setTotalPages(n);
    totalPagesRef.current = n;
  }, []);

  if (slides.length === 0) {
    return (
      <div className="w-full h-full bg-gray-950 flex flex-col items-center justify-center gap-2 text-white/40">
        <span className="text-4xl">📋</span>
        <p className="text-sm">{label ? `${label}: sin contenido` : 'Sin contenido'}</p>
      </div>
    );
  }

  const slide = slides[currentIndex];

  return (
    <div className="w-full h-full bg-black overflow-hidden relative select-none">
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{ opacity: visible ? 1 : 0 }}
      >
        <FileViewer item={slide.item} page={currentPage} onTotalPages={handleTotalPages} />
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-10">
        <div className="flex items-center justify-between px-3 py-1.5 bg-gradient-to-t from-black/80 to-transparent">
          <span className="text-white/80 text-xs font-medium truncate max-w-[60%]">
            {slide.item.name}
          </span>
          <div className="flex items-center gap-2">
            {slide.item.type === 'pdf' && totalPages > 1 && (
              <span className="text-white/50 text-[10px] tabular-nums">
                {currentPage} / {totalPages}
              </span>
            )}
            <Dots total={slides.length} current={currentIndex} />
          </div>
        </div>
        <div className="h-1 bg-white/10">
          <div
            className="h-full bg-blue-500 transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
