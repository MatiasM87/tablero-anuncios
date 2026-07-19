import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { GripVertical, Trash2, Monitor, ArrowLeft, Layers, Plus, CheckCircle2, CalendarClock } from 'lucide-react';
import { fetchItems, fetchPages, updatePages } from '../utils/api.js';
import { LAYOUT_TEMPLATES, getTemplate } from '../constants/layouts.js';
import { DAY_LABELS } from '../utils/schedule.js';

const DEFAULT_SCHEDULE = { enabled: false, days: [1, 2, 3, 4, 5], start: '08:00', end: '12:00', hideOutside: false };

function SchedulePanel({ schedule, onChange }) {
  const value = { ...DEFAULT_SCHEDULE, ...(schedule || {}) };
  const patch = (data) => onChange({ ...value, ...data });

  const toggleDay = (day) => {
    const days = value.days.includes(day)
      ? value.days.filter(d => d !== day)
      : [...value.days, day].sort();
    patch({ days });
  };

  const overnight = value.start && value.end && value.end <= value.start;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-gray-800 flex items-center gap-2">
            <CalendarClock size={16} className="text-gray-400" /> Horario programado
          </p>
          <p className="text-sm text-gray-400 mt-0.5">
            Durante este horario el tablero muestra <span className="font-medium">solo esta página</span>, sin rotar a las demás
          </p>
        </div>
        <button
          onClick={() => patch({ enabled: !value.enabled })}
          className={`relative inline-flex h-7 w-12 rounded-full transition-colors flex-shrink-0 ${
            value.enabled ? 'bg-blue-600' : 'bg-gray-300'
          }`}
        >
          <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            value.enabled ? 'translate-x-6' : 'translate-x-1'
          }`} />
        </button>
      </div>

      {value.enabled && (
        <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
          {/* Days of week */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Días</label>
            <div className="flex flex-wrap gap-2">
              {DAY_LABELS.map((label, day) => (
                <button
                  key={day}
                  onClick={() => toggleDay(day)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    value.days.includes(day)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {value.days.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">Elegí al menos un día para que el horario tenga efecto</p>
            )}
          </div>

          {/* Time range */}
          <div className="flex items-end gap-4 flex-wrap">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
              <input
                type="time"
                value={value.start}
                onChange={(e) => e.target.value && patch({ start: e.target.value })}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
              <input
                type="time"
                value={value.end}
                onChange={(e) => e.target.value && patch({ end: e.target.value })}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
              />
            </div>
            {overnight && (
              <p className="text-xs text-gray-400 pb-2">Cruza la medianoche: termina al día siguiente</p>
            )}
          </div>

          {/* Outside-window behavior */}
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={value.hideOutside}
              onChange={(e) => patch({ hideOutside: e.target.checked })}
              className="mt-0.5 accent-blue-600"
            />
            <span className="text-sm text-gray-600">
              Mostrar esta página <span className="font-medium">solo en su horario</span>
              <span className="block text-xs text-gray-400">Si no está tildado, fuera del horario la página participa de la rotación normal</span>
            </span>
          </label>

          <p className="text-xs text-gray-400">
            Si dos páginas programadas coinciden en horario, se muestra la primera de la lista.
          </p>
        </div>
      )}
    </div>
  );
}

function MiniPreview({ template }) {
  const cellIds = new Set(template.gridTemplateAreas.match(/[a-z]/g));
  return (
    <div
      className="grid gap-0.5 w-16 h-11 rounded overflow-hidden bg-gray-300 flex-shrink-0"
      style={{
        gridTemplateColumns: template.gridTemplateColumns,
        gridTemplateRows: template.gridTemplateRows,
        gridTemplateAreas: template.gridTemplateAreas,
      }}
    >
      {[...cellIds].map(id => (
        <div key={id} style={{ gridArea: id }} className="bg-blue-400" />
      ))}
    </div>
  );
}

function TemplatePicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
      {Object.entries(LAYOUT_TEMPLATES).map(([id, tpl]) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${
            value === id ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-300' : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <MiniPreview template={tpl} />
          <div>
            <p className="text-sm font-medium text-gray-800">{tpl.label}</p>
            <p className="text-xs text-gray-400">{tpl.description}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

function ZonePanel({ zone, assignments, allItems, onAdd, onRemove, onDurationChange, onDragEnd }) {
  const [selectedItemId, setSelectedItemId] = useState('');
  const availableItems = allItems.filter(i => !assignments.some(a => a.itemId === i.id));

  const handleAdd = () => {
    if (!selectedItemId) return;
    onAdd(zone.id, selectedItemId);
    setSelectedItemId('');
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-gray-800">{zone.label}</h3>
        <span className="text-xs text-gray-400">{assignments.length} documento{assignments.length !== 1 ? 's' : ''}</span>
      </div>

      <DragDropContext onDragEnd={(result) => onDragEnd(zone.id, result)}>
        <Droppable droppableId={`zone-${zone.id}`}>
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2 mb-3">
              {assignments.length === 0 && (
                <p className="text-sm text-gray-400 italic py-2">Sin documentos asignados todavía</p>
              )}
              {assignments.map((a, index) => {
                const item = allItems.find(i => i.id === a.itemId);
                if (!item) return null;
                return (
                  <Draggable key={a.id} draggableId={a.id} index={index}>
                    {(dragProvided, snapshot) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        className={`flex items-center gap-3 border rounded-lg px-3 py-2 ${
                          snapshot.isDragging ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <span {...dragProvided.dragHandleProps} className="text-gray-300 hover:text-gray-500 cursor-grab">
                          <GripVertical size={16} />
                        </span>
                        <span className="flex-1 text-sm text-gray-700 truncate">{item.name}</span>
                        <input
                          type="number"
                          min={1}
                          max={300}
                          placeholder={`${item.duration}s`}
                          value={a.duration ?? ''}
                          onChange={(e) => onDurationChange(zone.id, a.id, e.target.value)}
                          title="Duración en esta zona (segundos). Vacío = usar la del documento"
                          className="w-16 text-sm border border-gray-200 rounded px-2 py-1 text-center focus:outline-none focus:border-blue-400"
                        />
                        <button
                          onClick={() => onRemove(zone.id, a.id)}
                          className="text-gray-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <div className="flex items-center gap-2">
        <select
          value={selectedItemId}
          onChange={(e) => setSelectedItemId(e.target.value)}
          className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:border-blue-400"
        >
          <option value="">Elegir documento para agregar…</option>
          {availableItems.map(i => (
            <option key={i.id} value={i.id}>{i.name}</option>
          ))}
        </select>
        <button
          onClick={handleAdd}
          disabled={!selectedItemId}
          className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-40 hover:bg-blue-700 transition-colors"
        >
          Agregar
        </button>
      </div>
    </div>
  );
}

function PageListItem({ page, index, selected, onSelect, onRemove, canRemove, dragHandle }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const template = getTemplate(page.template);

  const handleRemoveClick = (e) => {
    e.stopPropagation();
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    onRemove(page.id);
  };

  return (
    <div
      onClick={() => onSelect(page.id)}
      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
        selected ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-300' : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <div {...dragHandle} className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing flex-shrink-0">
        <GripVertical size={18} />
      </div>
      <MiniPreview template={template} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate flex items-center gap-1.5">
          {page.name}
          {page.schedule?.enabled && (
            <CalendarClock size={13} className="text-blue-500 flex-shrink-0" title="Con horario programado" />
          )}
        </p>
        <p className="text-xs text-gray-400">
          {template.label}
          {page.schedule?.enabled && (
            <span className="text-blue-500"> · {page.schedule.start}–{page.schedule.end}</span>
          )}
        </p>
      </div>
      {canRemove && (
        <button
          onClick={handleRemoveClick}
          title={confirmDelete ? 'Click de nuevo para confirmar' : 'Eliminar página'}
          className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
            confirmDelete ? 'text-white bg-red-500 hover:bg-red-600' : 'text-gray-300 hover:text-red-500 hover:bg-red-50'
          }`}
        >
          {confirmDelete ? <CheckCircle2 size={16} /> : <Trash2 size={16} />}
        </button>
      )}
    </div>
  );
}

export default function AdminLayout() {
  const [items, setItems] = useState([]);
  const [pages, setPages] = useState([]);
  const [selectedPageId, setSelectedPageId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const [rawItems, rawPages] = await Promise.all([fetchItems(), fetchPages()]);
      setItems(rawItems);
      setPages(rawPages);
      setSelectedPageId(rawPages[0]?.id ?? null);
      setLoading(false);
    })();
  }, []);

  const selectedPage = pages.find(p => p.id === selectedPageId) || null;

  const groupByZone = (zoneAssignments) => {
    const grouped = {};
    [...zoneAssignments].sort((a, b) => a.order - b.order).forEach(a => {
      grouped[a.zoneId] = grouped[a.zoneId] || [];
      grouped[a.zoneId].push(a);
    });
    return grouped;
  };

  const patchSelectedPage = (updater) => {
    setPages(prev => prev.map(p => (p.id === selectedPageId ? updater(p) : p)));
    setSaved(false);
  };

  const handleAddPage = () => {
    const newPage = {
      id: crypto.randomUUID(),
      name: `Página ${pages.length + 1}`,
      template: 'single',
      zoneAssignments: [],
    };
    setPages(prev => [...prev, newPage]);
    setSelectedPageId(newPage.id);
    setSaved(false);
  };

  const handleRemovePage = (id) => {
    if (pages.length <= 1) return;
    setPages(prev => {
      const next = prev.filter(p => p.id !== id);
      if (selectedPageId === id) setSelectedPageId(next[0]?.id ?? null);
      return next;
    });
    setSaved(false);
  };

  const handleReorderPages = (result) => {
    if (!result.destination) return;
    setPages(prev => {
      const next = Array.from(prev);
      const [moved] = next.splice(result.source.index, 1);
      next.splice(result.destination.index, 0, moved);
      return next;
    });
    setSaved(false);
  };

  const handleNameChange = (name) => {
    patchSelectedPage(p => ({ ...p, name }));
  };

  const handleTemplateChange = (templateId) => {
    patchSelectedPage(p => ({ ...p, template: templateId }));
  };

  const handleAddAssignment = (zoneId, itemId) => {
    patchSelectedPage(p => ({
      ...p,
      zoneAssignments: [...p.zoneAssignments, { id: crypto.randomUUID(), zoneId, itemId, duration: null }],
    }));
  };

  const handleRemoveAssignment = (zoneId, assignmentId) => {
    patchSelectedPage(p => ({
      ...p,
      zoneAssignments: p.zoneAssignments.filter(a => a.id !== assignmentId),
    }));
  };

  const handleDurationChange = (zoneId, assignmentId, value) => {
    const duration = value === '' ? null : Math.max(1, Number(value));
    patchSelectedPage(p => ({
      ...p,
      zoneAssignments: p.zoneAssignments.map(a => (a.id === assignmentId ? { ...a, duration } : a)),
    }));
  };

  const handleZoneDragEnd = (zoneId, result) => {
    if (!result.destination) return;
    patchSelectedPage(p => {
      const zoneItems = p.zoneAssignments.filter(a => a.zoneId === zoneId).sort((a, b) => a.order - b.order);
      const others = p.zoneAssignments.filter(a => a.zoneId !== zoneId);
      const [moved] = zoneItems.splice(result.source.index, 1);
      zoneItems.splice(result.destination.index, 0, moved);
      const reindexed = zoneItems.map((a, idx) => ({ ...a, order: idx }));
      return { ...p, zoneAssignments: [...others, ...reindexed] };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    const savedPages = await updatePages(pages);
    setPages(savedPages);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  const template = selectedPage ? getTemplate(selectedPage.template) : null;
  const assignmentsByZone = selectedPage ? groupByZone(selectedPage.zoneAssignments) : {};

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/admin" className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft size={18} />
            </a>
            <Layers size={20} className="text-gray-400" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Páginas</h1>
              <p className="text-xs text-gray-400">El tablero pasa de una página a la siguiente cuando todas sus zonas terminan de mostrar sus documentos</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
            >
              <Monitor size={16} /> Ver tablero
            </a>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Guardando…' : saved ? 'Guardado ✓' : 'Guardar'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
        {/* Page list */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Páginas ({pages.length})
          </h2>
          <DragDropContext onDragEnd={handleReorderPages}>
            <Droppable droppableId="pages-list">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                  {pages.map((page, index) => (
                    <Draggable key={page.id} draggableId={page.id} index={index}>
                      {(dragProvided) => (
                        <div ref={dragProvided.innerRef} {...dragProvided.draggableProps}>
                          <PageListItem
                            page={page}
                            index={index}
                            selected={page.id === selectedPageId}
                            onSelect={setSelectedPageId}
                            onRemove={handleRemovePage}
                            canRemove={pages.length > 1}
                            dragHandle={dragProvided.dragHandleProps}
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

          <button
            onClick={handleAddPage}
            className="mt-3 w-full py-2.5 border-2 border-dashed border-gray-300 rounded-xl text-gray-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-all text-sm font-medium flex items-center justify-center gap-2"
          >
            <Plus size={16} /> Agregar página
          </button>
        </div>

        {/* Selected page editor */}
        <div>
          {!selectedPage ? (
            <p className="text-gray-400 text-sm">Elegí o creá una página para editarla.</p>
          ) : (
            <>
              <input
                type="text"
                value={selectedPage.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="text-lg font-semibold text-gray-800 border-b border-transparent hover:border-gray-200 focus:border-blue-400 focus:outline-none mb-6 px-1 py-1 w-full"
                placeholder="Nombre de la página"
              />

              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Plantilla</h3>
              <TemplatePicker value={selectedPage.template} onChange={handleTemplateChange} />

              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Programación</h3>
              <SchedulePanel
                schedule={selectedPage.schedule}
                onChange={(schedule) => patchSelectedPage(p => ({ ...p, schedule }))}
              />

              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Contenido por zona</h3>
              {items.length === 0 ? (
                <p className="text-gray-400 text-sm">
                  Todavía no hay documentos subidos. <a href="/admin" className="text-blue-600 underline">Agregá contenido primero</a>.
                </p>
              ) : (
                template.zones.map(zone => (
                  <ZonePanel
                    key={zone.id}
                    zone={zone}
                    assignments={assignmentsByZone[zone.id] || []}
                    allItems={items}
                    onAdd={handleAddAssignment}
                    onRemove={handleRemoveAssignment}
                    onDurationChange={handleDurationChange}
                    onDragEnd={handleZoneDragEnd}
                  />
                ))
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
