import React, { useState } from 'react';
import { GripVertical, Pin, PinOff, Trash2, Clock, FileImage, FileText, Globe, CheckCircle2 } from 'lucide-react';
import { updateItem, deleteItem } from '../utils/api.js';

function TypeBadge({ type }) {
  const map = {
    image: { label: 'Imagen', color: 'bg-green-100 text-green-700', icon: <FileImage size={12} /> },
    pdf: { label: 'PDF', color: 'bg-red-100 text-red-700', icon: <FileText size={12} /> },
    docx: { label: 'Word', color: 'bg-blue-100 text-blue-700', icon: <FileText size={12} /> },
    url: { label: 'URL', color: 'bg-purple-100 text-purple-700', icon: <Globe size={12} /> },
  };
  const info = map[type] || { label: type, color: 'bg-gray-100 text-gray-700', icon: null };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${info.color}`}>
      {info.icon} {info.label}
    </span>
  );
}

function Thumbnail({ item }) {
  const bg = {
    image: 'bg-green-50',
    pdf: 'bg-red-50',
    docx: 'bg-blue-50',
    url: 'bg-purple-50',
  }[item.type] || 'bg-gray-50';

  if (item.type === 'image') {
    return (
      <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
        <img src={`/uploads/${item.filename}`} alt="" className="w-full h-full object-cover" />
      </div>
    );
  }

  const icons = {
    pdf: <FileText size={28} className="text-red-400" />,
    docx: <FileText size={28} className="text-blue-400" />,
    url: <Globe size={28} className="text-purple-400" />,
  };

  return (
    <div className={`w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0 ${bg}`}>
      {icons[item.type] || <FileText size={28} className="text-gray-400" />}
    </div>
  );
}

export default function ItemCard({ item, onUpdate, onDelete, dragHandle }) {
  const [duration, setDuration] = useState(item.duration);
  const [editingDuration, setEditingDuration] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDurationBlur = async () => {
    setEditingDuration(false);
    const val = Math.max(1, Math.min(300, duration));
    setDuration(val);
    if (val !== item.duration) {
      const updated = await updateItem(item.id, { duration: val });
      onUpdate(updated);
    }
  };

  const handlePin = async () => {
    const updated = await updateItem(item.id, { pinned: !item.pinned });
    onUpdate(updated);
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    setDeleting(true);
    await deleteItem(item.id);
    onDelete(item.id);
  };

  return (
    <div className={`
      flex items-center gap-4 bg-white rounded-xl border p-4 shadow-sm transition-all
      ${item.pinned ? 'border-amber-300 ring-1 ring-amber-200' : 'border-gray-200 hover:border-gray-300'}
      ${deleting ? 'opacity-50' : ''}
    `}>
      {/* Drag handle */}
      <div {...dragHandle} className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing flex-shrink-0">
        <GripVertical size={20} />
      </div>

      {/* Thumbnail */}
      <Thumbnail item={item} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-gray-800 truncate">{item.name}</p>
          {item.pinned && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
              <Pin size={10} /> Fijado
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <TypeBadge type={item.type} />
          {/* Duration editor */}
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <Clock size={12} />
            {editingDuration ? (
              <input
                type="number"
                value={duration}
                min={1}
                max={300}
                onChange={(e) => setDuration(Number(e.target.value))}
                onBlur={handleDurationBlur}
                onKeyDown={(e) => e.key === 'Enter' && handleDurationBlur()}
                autoFocus
                className="w-16 border-b border-blue-500 text-sm text-gray-700 focus:outline-none bg-transparent text-center"
              />
            ) : (
              <button
                onClick={() => setEditingDuration(true)}
                className="hover:text-blue-600 transition-colors font-medium"
                title="Click para editar tiempo"
              >
                {duration}s/pág
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Pin toggle */}
        <button
          onClick={handlePin}
          title={item.pinned ? 'Desfijar' : 'Fijar primero'}
          className={`p-2 rounded-lg transition-colors ${
            item.pinned
              ? 'text-amber-500 bg-amber-50 hover:bg-amber-100'
              : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50'
          }`}
        >
          {item.pinned ? <PinOff size={18} /> : <Pin size={18} />}
        </button>

        {/* Delete */}
        <button
          onClick={handleDelete}
          title={confirmDelete ? 'Click de nuevo para confirmar' : 'Eliminar'}
          className={`p-2 rounded-lg transition-colors ${
            confirmDelete
              ? 'text-white bg-red-500 hover:bg-red-600'
              : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
          }`}
        >
          {confirmDelete ? <CheckCircle2 size={18} /> : <Trash2 size={18} />}
        </button>
      </div>
    </div>
  );
}
