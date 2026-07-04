const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const mammoth = require('mammoth');

const app = express();
const PORT = process.env.PORT || 3001;

const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

[UPLOADS_DIR, DATA_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const DEFAULT_DB = {
  items: [],
  settings: { autoAdvance: true, defaultDuration: 10 },
  layout: { template: 'single' },
  zoneAssignments: [],
};

// Maps each layout template to its valid zone ids (used to validate assignments)
const LAYOUT_TEMPLATES = {
  single: ['a'],
  'split-2v': ['a', 'b'],
  'split-2h': ['a', 'b'],
  'split-3-left': ['a', 'b', 'c'],
  'split-3-top': ['a', 'b', 'c'],
  'split-3v': ['a', 'b', 'c'],
  'grid-4': ['a', 'b', 'c', 'd'],
};

function getDB() {
  let db;
  try {
    db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch {
    db = structuredClone(DEFAULT_DB);
  }
  // Backfill fields for databases created before multi-zone layouts existed
  if (!db.layout) db.layout = structuredClone(DEFAULT_DB.layout);
  if (!db.zoneAssignments) db.zoneAssignments = [];
  return db;
}

function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));


const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp|svg|pdf|doc|docx)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no soportado'));
    }
  },
});

function getFileType(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext)) return 'image';
  if (ext === '.pdf') return 'pdf';
  if (['.doc', '.docx'].includes(ext)) return 'docx';
  return 'unknown';
}

// TV-optimized CSS injected into mammoth HTML output
const TV_CSS = `
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    font-size: 2.2vw;
    line-height: 1.7;
    color: #1a1a1a;
    background: #fff;
    padding: 4vw 6vw;
  }
  h1 { font-size: 4.5vw; font-weight: 700; margin-bottom: 2vw; color: #111; }
  h2 { font-size: 3.5vw; font-weight: 600; margin-bottom: 1.5vw; color: #222; }
  h3 { font-size: 3vw; font-weight: 600; margin-bottom: 1vw; }
  p { margin-bottom: 1.5vw; }
  ul, ol { padding-left: 3vw; margin-bottom: 1.5vw; }
  li { margin-bottom: 0.8vw; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 2vw; }
  th, td { border: 1px solid #ddd; padding: 1vw; text-align: left; }
  th { background: #f5f5f5; font-weight: 600; }
  img { max-width: 100%; height: auto; }
  strong { font-weight: 700; }
  em { font-style: italic; }
</style>
`;

// GET /api/items
app.get('/api/items', (req, res) => {
  const db = getDB();
  res.json(db.items);
});

// POST /api/items — upload file
app.post('/api/items', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' });

  const db = getDB();
  const { originalname, filename } = req.file;
  const type = getFileType(originalname);
  const duration = Math.max(1, parseInt(req.body.duration) || db.settings.defaultDuration);

  const item = {
    id: uuidv4(),
    name: req.body.name || originalname,
    originalName: originalname,
    filename,
    type,
    duration,
    pinned: false,
    order: db.items.length,
    createdAt: new Date().toISOString(),
  };

  if (type === 'docx') {
    try {
      const filePath = path.join(UPLOADS_DIR, filename);
      const result = await mammoth.convertToHtml({ path: filePath });
      const htmlFilename = `${path.basename(filename, path.extname(filename))}.html`;
      const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8">${TV_CSS}</head><body>${result.value}</body></html>`;
      fs.writeFileSync(path.join(UPLOADS_DIR, htmlFilename), htmlContent);
      item.htmlFilename = htmlFilename;
    } catch (err) {
      console.error('Error convirtiendo DOCX:', err);
    }
  }

  db.items.push(item);
  saveDB(db);
  res.json(item);
});

// POST /api/items/url — add URL item (Google Docs, Slides, web pages)
app.post('/api/items/url', (req, res) => {
  const { url, name, duration } = req.body;
  if (!url) return res.status(400).json({ error: 'URL requerida' });

  const db = getDB();

  // Auto-convert Google Docs/Slides to embed URL
  let embedUrl = url;
  const gdocsMatch = url.match(/docs\.google\.com\/(document|presentation|spreadsheets)\/d\/([^/]+)/);
  if (gdocsMatch) {
    const [, type, id] = gdocsMatch;
    if (type === 'document') embedUrl = `https://docs.google.com/document/d/${id}/preview`;
    else if (type === 'presentation') embedUrl = `https://docs.google.com/presentation/d/${id}/embed?start=false&loop=false`;
    else if (type === 'spreadsheets') embedUrl = `https://docs.google.com/spreadsheets/d/${id}/preview`;
  }

  const item = {
    id: uuidv4(),
    name: name || url,
    url: embedUrl,
    originalUrl: url,
    type: 'url',
    duration: Math.max(5, parseInt(duration) || 30),
    pinned: false,
    order: db.items.length,
    createdAt: new Date().toISOString(),
  };

  db.items.push(item);
  saveDB(db);
  res.json(item);
});

// PUT /api/items/reorder — drag & drop reorder
app.put('/api/items/reorder', (req, res) => {
  const { orderedIds } = req.body;
  if (!Array.isArray(orderedIds)) return res.status(400).json({ error: 'orderedIds requerido' });

  const db = getDB();
  const itemMap = Object.fromEntries(db.items.map(i => [i.id, i]));
  db.items = orderedIds.map((id, index) => ({ ...itemMap[id], order: index }));
  saveDB(db);
  res.json(db.items);
});

// PUT /api/items/:id — update item properties
app.put('/api/items/:id', (req, res) => {
  const db = getDB();
  const idx = db.items.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'No encontrado' });

  // If pinning this item, unpin all others first
  if (req.body.pinned === true) {
    db.items.forEach(item => { item.pinned = false; });
  }

  db.items[idx] = { ...db.items[idx], ...req.body };
  saveDB(db);
  res.json(db.items[idx]);
});

// DELETE /api/items/:id
app.delete('/api/items/:id', (req, res) => {
  const db = getDB();
  const item = db.items.find(i => i.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'No encontrado' });

  if (item.filename) {
    const fp = path.join(UPLOADS_DIR, item.filename);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  }
  if (item.htmlFilename) {
    const hp = path.join(UPLOADS_DIR, item.htmlFilename);
    if (fs.existsSync(hp)) fs.unlinkSync(hp);
  }

  db.items = db.items.filter(i => i.id !== req.params.id);
  db.zoneAssignments = db.zoneAssignments.filter(a => a.itemId !== req.params.id);
  saveDB(db);
  res.json({ ok: true });
});

// GET /api/settings
app.get('/api/settings', (req, res) => {
  const db = getDB();
  res.json(db.settings);
});

// PUT /api/settings
app.put('/api/settings', (req, res) => {
  const db = getDB();
  db.settings = { ...db.settings, ...req.body };
  saveDB(db);
  res.json(db.settings);
});

// GET /api/layout — current template + per-zone document assignments
app.get('/api/layout', (req, res) => {
  const db = getDB();
  res.json({ template: db.layout.template, zoneAssignments: db.zoneAssignments });
});

// PUT /api/layout — replace template and/or zone assignments
app.put('/api/layout', (req, res) => {
  const { template, zoneAssignments } = req.body;
  const db = getDB();

  if (template !== undefined) {
    if (!LAYOUT_TEMPLATES[template]) {
      return res.status(400).json({ error: 'Plantilla de layout inválida' });
    }
    db.layout.template = template;
  }

  if (zoneAssignments !== undefined) {
    if (!Array.isArray(zoneAssignments)) {
      return res.status(400).json({ error: 'zoneAssignments debe ser un array' });
    }
    const validZoneIds = LAYOUT_TEMPLATES[db.layout.template];
    const itemIds = new Set(db.items.map(i => i.id));
    const cleaned = zoneAssignments.filter(a => validZoneIds.includes(a.zoneId) && itemIds.has(a.itemId));
    db.zoneAssignments = cleaned.map((a, index) => ({
      id: a.id || uuidv4(),
      zoneId: a.zoneId,
      itemId: a.itemId,
      order: index,
      duration: a.duration ? Math.max(1, parseInt(a.duration)) : null,
    }));
  }

  saveDB(db);
  res.json({ template: db.layout.template, zoneAssignments: db.zoneAssignments });
});

// Serve React app in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Tablero de Anuncios — servidor en http://localhost:${PORT}`);
  console.log(`Admin: http://localhost:${PORT === 3001 ? 5173 : PORT}/admin`);
});
