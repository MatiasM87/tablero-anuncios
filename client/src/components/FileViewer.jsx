import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjs from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const pdfCache = {};

function PdfViewer({ url, page, onTotalPages }) {
  const canvasRef = useRef(null);
  const [error, setError] = useState(null);
  const pdfRef = useRef(null);

  const loadAndRender = useCallback(async () => {
    try {
      setError(null);
      let pdf = pdfRef.current || pdfCache[url];
      if (!pdf) {
        pdf = await pdfjs.getDocument({ url, withCredentials: false }).promise;
        pdfCache[url] = pdf;
        pdfRef.current = pdf;
      }
      onTotalPages?.(pdf.numPages);

      const pdfPage = await pdf.getPage(page);
      const canvas = canvasRef.current;
      if (!canvas) return;

      const viewport = pdfPage.getViewport({ scale: 1 });
      const scaleX = (window.innerWidth * 0.98) / viewport.width;
      const scaleY = (window.innerHeight * 0.92) / viewport.height;
      const scale = Math.min(scaleX, scaleY);

      const scaledVp = pdfPage.getViewport({ scale });
      canvas.width = scaledVp.width;
      canvas.height = scaledVp.height;

      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      await pdfPage.render({ canvasContext: ctx, viewport: scaledVp }).promise;
    } catch (err) {
      console.error('PDF error:', err);
      setError(err.message);
    }
  }, [url, page, onTotalPages]);

  useEffect(() => {
    loadAndRender();
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
    <div className="flex items-center justify-center w-full h-full bg-gray-900">
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
