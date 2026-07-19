import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjs from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

// Keyed by url, stores the in-flight/resolved load promise (not the document
// itself) so concurrent viewers of the same PDF never trigger two loads.
const pdfCache = {};

function PdfViewer({ url, page, onTotalPages }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [error, setError] = useState(null);
  const pdfRef = useRef(null);
  const renderTaskRef = useRef(null);

  const loadAndRender = useCallback(async (cancelledRef) => {
    try {
      setError(null);
      let pdf = pdfRef.current;
      if (!pdf) {
        pdfCache[url] ||= pdfjs.getDocument({ url, withCredentials: false }).promise;
        pdf = await pdfCache[url];
        pdfRef.current = pdf;
      }
      if (cancelledRef?.current) return;
      onTotalPages?.(pdf.numPages);

      const pdfPage = await pdf.getPage(page);
      if (cancelledRef?.current) return;
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const { width: cw, height: ch } = container.getBoundingClientRect();
      const viewport = pdfPage.getViewport({ scale: 1 });
      const scaleX = (cw * 0.98) / viewport.width;
      const scaleY = (ch * 0.92) / viewport.height;
      const scale = Math.min(scaleX, scaleY);

      const scaledVp = pdfPage.getViewport({ scale });

      // Cancel any in-flight render before touching the canvas again —
      // pdf.js throws if two render() calls target the same canvas concurrently
      // (page changes and ResizeObserver firings can otherwise overlap).
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }

      // Render at higher density than the on-screen size for sharper text:
      // at least the device pixel ratio, and a minimum of 2x so 1080p TVs
      // (which report dpr 1) get a supersampled image the browser downscales.
      // Capped at 3x to keep canvas memory reasonable on TV hardware.
      const outputScale = Math.min(3, Math.max(window.devicePixelRatio || 1, 2));
      canvas.width = Math.floor(scaledVp.width * outputScale);
      canvas.height = Math.floor(scaledVp.height * outputScale);
      canvas.style.width = `${Math.floor(scaledVp.width)}px`;
      canvas.style.height = `${Math.floor(scaledVp.height)}px`;

      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const task = pdfPage.render({
        canvasContext: ctx,
        viewport: scaledVp,
        transform: [outputScale, 0, 0, outputScale, 0, 0],
      });
      renderTaskRef.current = task;
      await task.promise;
      if (renderTaskRef.current === task) renderTaskRef.current = null;
    } catch (err) {
      if (err?.name === 'RenderingCancelledException' || cancelledRef?.current) return;
      console.error('PDF error:', err);
      setError(err.message);
    }
  }, [url, page, onTotalPages]);

  useEffect(() => {
    const cancelledRef = { current: false };
    loadAndRender(cancelledRef);
    return () => {
      cancelledRef.current = true;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
    };
  }, [loadAndRender]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Debounced: on slow devices (TV hardware) a single render can take long
    // enough that the container settles into several resize entries while it
    // runs — re-rendering on every one just widens the window for the
    // cancel/render race instead of closing it.
    let timeoutId = null;
    const observer = new ResizeObserver(() => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => loadAndRender(), 200);
    });
    observer.observe(container);
    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, [loadAndRender]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full text-white gap-4">
        <span className="text-6xl">⚠️</span>
        <p className="text-2xl">Error al cargar el PDF</p>
        <p className="text-base opacity-60">{error}</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex items-center justify-center w-full h-full bg-gray-900">
      <canvas ref={canvasRef} className="shadow-2xl" />
    </div>
  );
}

export default function FileViewer({ item, page = 1, onTotalPages }) {
  if (!item) return null;

  if (item.type === 'image') {
    return (
      <div className="flex items-center justify-center w-full h-full bg-black">
        <img
          src={`/uploads/${item.filename}`}
          alt={item.name}
          className="max-w-full max-h-full object-contain"
          draggable={false}
        />
      </div>
    );
  }

  if (item.type === 'pdf') {
    return (
      <PdfViewer
        url={`/uploads/${item.filename}`}
        page={page}
        onTotalPages={onTotalPages}
      />
    );
  }

  if (item.type === 'docx') {
    const src = item.htmlFilename
      ? `/uploads/${item.htmlFilename}`
      : `/uploads/${item.filename}`;
    return (
      <iframe
        key={item.id}
        src={src}
        title={item.name}
        className="w-full h-full border-0 bg-white"
        sandbox="allow-same-origin"
      />
    );
  }

  if (item.type === 'url') {
    return (
      <iframe
        key={item.id}
        src={item.url}
        title={item.name}
        className="w-full h-full border-0"
        allow="autoplay"
      />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center w-full h-full text-white gap-4">
      <span className="text-8xl">📄</span>
      <p className="text-3xl opacity-70">Tipo de archivo no compatible</p>
    </div>
  );
}
