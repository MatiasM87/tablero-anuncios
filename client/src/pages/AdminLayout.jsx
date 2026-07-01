import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { GripVertical, Trash2, Monitor, ArrowLeft, LayoutGrid } from 'lucide-react';
import { fetchItems, fetchLayout, updateLayout } from '../utils/api.js';
import { LAYOUT_TEMPLATES, getTemplate } from '../constants/layouts.js';

function MiniPreview({ template }) {
  const cellIds = new Set(template.gridTemplateAreas.match(/[a-z]/g));
  return (
    <div
      className="grid gap-0.5 w-16 h-11 rounded overflow-hidden bg-gray-300"
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

export default function AdminLayout() {
  const [items, setItems] = useState([]);
  const [templateId, setTemplateId] = useState('single');
  const [assignmentsByZone, setAssignmentsByZone] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const [rawItems, layout] = await Promise.all([fetchItems(), fetchLayout()]);
      setItems(rawItems);
      setTemplateId(layout.template);

      const grouped = {};
      [...layout.zoneAssignments].sort((a, b) => a.order - b.order).forEach(a => {
        grouped[a.zoneId] = grouped[a.zoneId] || [];
        grouped[a.zoneId].push(a);
      });
      setAssignmentsByZone(grouped);
      setLoading(false);
    })();
  }, []);

  const template = getTemplate(templateId);

  const handleAdd = (zoneId, itemId) => {
    setAssignmentsByZone(prev => {
      const list = prev[zoneId] || [];
      const newAssignment = { id: crypto.randomUUID(), zoneId, itemId, duration: null };
      return { ...prev, [zoneId]: [...list, newAssignment] };
    });
    setSaved(false);
  };

  const handleRemove = (zoneId, assignmentId) => {
    setAssignmentsByZone(prev => ({
      ...prev,
      [zoneId]: (prev[zoneId] || []).filter(a => a.id !== assignmentId),
    }));
    setSaved(false);
  };

  const handleDurationChange = (zoneId, assignmentId, value) => {
    const duration = value === '' ? null : Math.max(1, Number(value));
    setAssignmentsByZone(prev => ({
      ...prev,
      [zoneId]: (prev[zoneId] || []).map(a => (a.id === assignmentId ? { ...a, duration } : a)),
    }));
    setSaved(false);
  };

  const handleZoneDragEnd = (zoneId, result) => {
    if (!result.destination) return;
    setAssignmentsByZone(prev => {
      const list = Array.from(prev[zoneId] || []);
      const [moved] = list.splice(result.source.index, 1);
      list.splice(result.destination.index, 0, moved);
      return { ...prev, [zoneId]: list };
    });
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const zoneAssignments = template.zones.flatMap(zone => assignmentsByZone[zone.id] || []);
    await updateLayout({ template: templateId, zoneAssignments });
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/admin" className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft size={18} />
            </a>
            <LayoutGrid size={20} className="text-gray-400" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Distribución de pantalla</h1>
              <p className="text-xs text-gray-400">Elegí cuántas zonas mostrar y qué documentos van en cada una</p>
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

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Plantilla</h2>
        <TemplatePicker value={templateId} onChange={(id) => { setTemplateId(id); setSaved(false); }} />

        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Contenido por zona</h2>
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
              onAdd={handleAdd}
              onRemove={handleRemove}
              onDurationChange={handleDurationChange}
              onDragEnd={handleZoneDragEnd}
            />
          ))
        )}
      </main>
    </div>
  );
}
