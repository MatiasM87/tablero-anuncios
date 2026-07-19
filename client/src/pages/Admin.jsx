import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, Settings, Monitor, Pin, Clock, RefreshCw, ChevronDown, ChevronUp, Layers, Type, Lock, LogOut } from 'lucide-react';
import { fetchItems, fetchSettings, updateSettings, reorderItems, changePassword, logout } from '../utils/api.js';
import ItemCard from '../components/ItemCard.jsx';
import UploadModal from '../components/UploadModal.jsx';
import { TITLE_FONTS, TITLE_SIZES, getTitleFont } from '../constants/title.js';

const DEFAULT_TITLE = { enabled: false, text: '', font: 'sans', size: 'medium', color: '#ffffff', background: '#111827' };

function TitlePanel({ settings, onChange }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState({ ...DEFAULT_TITLE, ...(settings.title || {}) });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setTitle({ ...DEFAULT_TITLE, ...(settings.title || {}) });
  }, [settings.title]);

  const patch = (data) => {
    setTitle(prev => ({ ...prev, ...data }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await onChange({ title });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2 text-gray-700 font-medium">
          <Type size={18} className="text-gray-400" />
          Título del tablero
          {title.enabled && title.text.trim() && (
            <span className="text-xs bg-green-50 text-green-600 border border-green-200 rounded-full px-2 py-0.5">Activo</span>
          )}
        </div>
        {open ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-5 border-t border-gray-100 pt-4">
          {/* Enable toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-800">Mostrar título</p>
              <p className="text-sm text-gray-400">Barra en la parte superior de la pantalla principal</p>
            </div>
            <button
              onClick={() => patch({ enabled: !title.enabled })}
              className={`relative inline-flex h-7 w-12 rounded-full transition-colors ${
                title.enabled ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                title.enabled ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {/* Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Texto</label>
            <input
              type="text"
              value={title.text}
              maxLength={120}
              onChange={(e) => patch({ text: e.target.value })}
              placeholder="Ej: Novedades de la semana"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            />
            <p className="text-xs text-gray-400 mt-1">Si el título es muy largo, en pantalla se corta con «…»</p>
          </div>

          {/* Font + size */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de fuente</label>
              <select
                value={title.font}
                onChange={(e) => patch({ font: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
              >
                {Object.entries(TITLE_FONTS).map(([id, f]) => (
                  <option key={id} value={id}>{f.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tamaño</label>
              <select
                value={title.size}
                onChange={(e) => patch({ size: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
              >
                {Object.entries(TITLE_SIZES).map(([id, s]) => (
                  <option key={id} value={id}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Colors */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Color del texto</label>
              <input
                type="color"
                value={title.color}
                onChange={(e) => patch({ color: e.target.value })}
                className="w-full h-10 border border-gray-200 rounded-lg cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Color de la barra</label>
              <input
                type="color"
                value={title.background}
                onChange={(e) => patch({ background: e.target.value })}
                className="w-full h-10 border border-gray-200 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* Preview */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vista previa</label>
            <div
              className="rounded-lg overflow-hidden px-4 py-3"
              style={{ background: title.background }}
            >
              <p
                className="text-center truncate whitespace-nowrap font-bold"
                style={{
                  color: title.color,
                  fontFamily: getTitleFont(title.font).css,
                  fontSize: title.size === 'small' ? '1rem' : title.size === 'large' ? '1.8rem' : '1.35rem',
                }}
              >
                {title.text.trim() || 'Título del tablero'}
              </p>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-40 hover:bg-blue-700 transition-colors"
          >
            {saving ? 'Guardando…' : saved ? 'Guardado ✓' : 'Guardar título'}
          </button>
        </div>
      )}
    </div>
  );
}

function SecurityPanel() {
  const [open, setOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleChange = async () => {
    if (newPassword.trim().length < 4) {
      setError('La clave debe tener al menos 4 caracteres');
      return;
    }
    if (newPassword !== confirm) {
      setError('Las claves no coinciden');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await changePassword(newPassword);
      setNewPassword('');
      setConfirm('');
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.message || 'No se pudo cambiar la clave');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    window.location.reload();
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2 text-gray-700 font-medium">
          <Lock size={18} className="text-gray-400" />
          Seguridad
        </div>
        {open ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-gray-100 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
              placeholder="Nueva clave"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            />
            <input
              type="password"
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setError(''); }}
              placeholder="Repetir clave"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex items-center justify-between">
            <button
              onClick={handleChange}
              disabled={saving || !newPassword || !confirm}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-40 hover:bg-blue-700 transition-colors"
            >
              {saving ? 'Guardando…' : saved ? 'Clave cambiada ✓' : 'Cambiar clave'}
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut size={15} /> Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsPanel({ settings, onChange }) {
  const [open, setOpen] = useState(false);
  const [duration, setDuration] = useState(settings.defaultDuration || 10);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const updated = await onChange({ defaultDuration: duration });
    setDuration(updated.defaultDuration);
    setSaving(false);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2 text-gray-700 font-medium">
          <Settings size={18} className="text-gray-400" />
          Configuración global
        </div>
        {open ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-5 border-t border-gray-100 pt-4">
          {/* Auto-advance toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-800">Avance automático</p>
              <p className="text-sm text-gray-400">Pasa al siguiente elemento automáticamente</p>
            </div>
            <button
              onClick={() => onChange({ autoAdvance: !settings.autoAdvance })}
              className={`relative inline-flex h-7 w-12 rounded-full transition-colors ${
                settings.autoAdvance ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                settings.autoAdvance ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {/* Default duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duración predeterminada: <span className="font-bold text-blue-600">{duration}s</span> por página
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={3}
                max={120}
                step={1}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="flex-1 accent-blue-600"
              />
              <button
                onClick={handleSave}
                disabled={saving || duration === settings.defaultDuration}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-40 hover:bg-blue-700 transition-colors"
              >
                {saving ? '…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ onAdd }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <span className="text-7xl mb-4">📋</span>
      <h3 className="text-2xl font-semibold text-gray-700 mb-2">Sin contenido</h3>
      <p className="text-gray-400 mb-6">Subí tu primer archivo para que aparezca en el tablero</p>
      <button
        onClick={onAdd}
        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
      >
        <Plus size={20} /> Agregar contenido
      </button>
    </div>
  );
}

export default function Admin() {
  const [items, setItems] = useState([]);
  const [settings, setSettings] = useState({ autoAdvance: true, defaultDuration: 10 });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [pinnedCount, setPinnedCount] = useState(0);

  const load = async () => {
    const [rawItems, cfg] = await Promise.all([fetchItems(), fetchSettings()]);
    const sorted = [...rawItems].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return a.order - b.order;
    });
    setItems(sorted);
    setSettings(cfg);
    setPinnedCount(sorted.filter(i => i.pinned).length);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSettingsChange = async (data) => {
    const updated = await updateSettings(data);
    setSettings(updated);
    return updated;
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const reordered = Array.from(items);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    setItems(reordered);

    await reorderItems(reordered.map(i => i.id));
  };

  const handleUpdate = (updated) => {
    setItems(prev => {
      const next = prev.map(i => (i.id === updated.id ? updated : i));
      // If pinned changed, re-sort
      return [...next].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return a.order - b.order;
      });
    });
    setPinnedCount(items.filter(i => i.id === updated.id ? updated.pinned : i.pinned).length);
  };

  const handleDelete = (id) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const handleAdded = (item) => {
    setItems(prev => [...prev, item]);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📋</span>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Tablero de Anuncios</h1>
              <p className="text-xs text-gray-400">Panel de administración</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Actualizar"
            >
              <RefreshCw size={18} />
            </button>
            <a
              href="/admin/layout"
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              <Layers size={16} /> Páginas
            </a>
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
            >
              <Monitor size={16} /> Ver tablero
            </a>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus size={16} /> Agregar
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Stats bar */}
        {items.length > 0 && (
          <div className="flex gap-4 mb-6 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-gray-500 bg-white px-4 py-2 rounded-xl border border-gray-200">
              <span className="font-semibold text-gray-800">{items.length}</span> elementos
            </div>
            {pinnedCount > 0 && (
              <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-4 py-2 rounded-xl border border-amber-200">
                <Pin size={14} /> <span className="font-semibold">{pinnedCount}</span> fijado
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-500 bg-white px-4 py-2 rounded-xl border border-gray-200">
              <Clock size={14} />
              Duración media:{' '}
              <span className="font-semibold text-gray-800">
                {Math.round(items.reduce((a, i) => a + i.duration, 0) / items.length)}s
              </span>
            </div>
          </div>
        )}

        {/* Settings */}
        <SettingsPanel settings={settings} onChange={handleSettingsChange} />
        <TitlePanel settings={settings} onChange={handleSettingsChange} />
        <SecurityPanel />

        {/* Items list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState onAdd={() => setShowModal(true)} />
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                Contenido ({items.length})
              </h2>
              <p className="text-xs text-gray-400">Arrastrá para reordenar</p>
            </div>

            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="items-list">
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="space-y-3"
                  >
                    {items.map((item, index) => (
                      <Draggable key={item.id} draggableId={item.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={snapshot.isDragging ? 'opacity-90 scale-[1.01]' : ''}
                          >
                            <ItemCard
                              item={item}
                              onUpdate={handleUpdate}
                              onDelete={handleDelete}
                              dragHandle={provided.dragHandleProps}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>

            {/* Add more button at bottom */}
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-all text-sm font-medium flex items-center justify-center gap-2"
            >
              <Plus size={16} /> Agregar más contenido
            </button>
          </>
        )}
      </main>

      {showModal && (
        <UploadModal
          defaultDuration={settings.defaultDuration}
          onClose={() => setShowModal(false)}
          onAdded={handleAdded}
        />
      )}
    </div>
  );
}
