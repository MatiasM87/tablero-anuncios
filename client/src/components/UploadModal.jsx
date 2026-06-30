import React, { useState, useRef, useCallback } from 'react';
import { X, Upload, Link, FileImage, FileText, Globe } from 'lucide-react';
import { uploadFile, addUrl } from '../utils/api.js';

const ACCEPT = '.jpg,.jpeg,.png,.gif,.webp,.svg,.pdf,.doc,.docx';

function DropZone({ onFile, disabled }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }, [onFile]);

  return (
    <div
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`
        border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors
        ${dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <Upload className="mx-auto mb-3 text-gray-400" size={40} />
      <p className="text-lg font-medium text-gray-700">
        Arrastrá un archivo o hacé click para seleccionar
      </p>
      <p className="mt-1 text-sm text-gray-400">
        Imágenes, PDF, Word — hasta 100 MB
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => e.target.files[0] && onFile(e.target.files[0])}
        disabled={disabled}
      />
    </div>
  );
}

function FileTypeIcon({ name }) {
  const ext = name?.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return <FileImage size={20} className="text-green-500" />;
  if (ext === 'pdf') return <FileText size={20} className="text-red-500" />;
  if (['doc', 'docx'].includes(ext)) return <FileText size={20} className="text-blue-500" />;
  return <FileText size={20} className="text-gray-400" />;
}

export default function UploadModal({ onClose, onAdded, defaultDuration = 10 }) {
  const [tab, setTab] = useState('file'); // 'file' | 'url'
  const [selectedFile, setSelectedFile] = useState(null);
  const [name, setName] = useState('');
  const [duration, setDuration] = useState(defaultDuration);
  const [url, setUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const handleFile = (file) => {
    setSelectedFile(file);
    setName(file.name.replace(/\.[^.]+$/, ''));
    setError('');
  };

  const handleSubmitFile = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setError('');
    // Simulate progress while uploading
    const tick = setInterval(() => setProgress(p => Math.min(p + 8, 90)), 200);
    try {
      const item = await uploadFile(selectedFile, name || selectedFile.name, duration);
      clearInterval(tick);
      setProgress(100);
      setTimeout(() => { onAdded(item); onClose(); }, 400);
    } catch (err) {
      clearInterval(tick);
      setProgress(0);
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitUrl = async () => {
    if (!url.trim()) return;
    setUploading(true);
    setError('');
    try {
      const item = await addUrl(url.trim(), name || url.trim(), duration);
      onAdded(item);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800">Agregar contenido</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={22} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setTab('file')}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors
              ${tab === 'file' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Upload size={16} /> Subir archivo
          </button>
          <button
            onClick={() => setTab('url')}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors
              ${tab === 'url' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Globe size={16} /> URL / Google Docs
          </button>
        </div>

        <div className="p-6 space-y-5">
          {tab === 'file' ? (
            <>
              {selectedFile ? (
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border">
                  <FileTypeIcon name={selectedFile.name} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">{selectedFile.name}</p>
                    <p className="text-sm text-gray-400">{(selectedFile.size / 1024 / 1024).toFixed(1)} MB</p>
                  </div>
                  <button onClick={() => setSelectedFile(null)} className="text-gray-400 hover:text-gray-600">
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <DropZone onFile={handleFile} disabled={uploading} />
              )}
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
              <div className="relative">
                <Link size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://docs.google.com/presentation/d/..."
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <p className="mt-1.5 text-xs text-gray-400">
                Google Docs, Slides y Sheets se convierten automáticamente al formato embed
              </p>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre (opcional)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Comunicado mensual"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tiempo en pantalla: <span className="font-bold text-blue-600">{duration}s</span> por página
            </label>
            <input
              type="range"
              min={3}
              max={120}
              step={1}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-0.5">
              <span>3s</span><span>30s</span><span>60s</span><span>120s</span>
            </div>
          </div>

          {/* Progress */}
          {uploading && progress > 0 && (
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={tab === 'file' ? handleSubmitFile : handleSubmitUrl}
            disabled={uploading || (tab === 'file' ? !selectedFile : !url.trim())}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {uploading ? 'Subiendo…' : 'Agregar'}
          </button>
        </div>
      </div>
    </div>
  );
}
