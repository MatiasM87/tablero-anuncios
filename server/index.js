const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
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
  settings: {
    autoAdvance: true,
    defaultDuration: 10,
    title: {
      enabled: false,
      text: '',
      font: 'sans',
      size: 'medium',
      color: '#ffffff',
      background: '#111827',
    },
  },
  pages: [
    { id: 'page-1', name: 'Página 1', template: 'single', zoneAssignments: [] },
  ],
};

const DEFAULT_PASSWORD = 'admin123';
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 días

function hashPassword(password, salt) {
  return crypto.scryptSync(String(password), salt, 64).toString('hex');
}

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
  // Migrate pre-multi-page databases: the single template + zoneAssignments
  // they had becomes the one and only page.
  if (!db.pages) {
    db.pages = [{
      id: uuidv4(),
      name: 'Página 1',
      template: db.layout?.template || 'single',
      zoneAssignments: db.zoneAssignments || [],
    }];
    delete db.layout;
    delete db.zoneAssignments;
    saveDB(db);
  }
  // Fill in settings added after the DB was created (e.g. the display title)
  db.settings = {
    ...DEFAULT_DB.settings,
    ...db.settings,
    title: { ...DEFAULT_DB.settings.title, ...(db.settings?.title || {}) },
  };
  // First run: create the default admin credential (must be changed on first login)
  if (!db.auth) {
    const salt = crypto.randomBytes(16).toString('hex');
    db.auth = {
      salt,
      passwordHash: hashPassword(DEFAULT_PASSWORD, salt),
      mustChange: true,
      tokens: [],
    };
    saveDB(db);
  }
  return db;
}

function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));

function getRequestToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

function isValidToken(db, token) {
  if (!token) return false;
  const now = Date.now();
  db.auth.tokens = db.auth.tokens.filter(t => now - t.createdAt < TOKEN_TTL_MS);
  return db.auth.tokens.some(t => t.token === token);
}

// Protects every write endpoint. Reads stay open: the TV display needs
// items/settings/pages without logging in.
function requireAuth(req, res, next) {
  const db = getDB();
  if (!isValidToken(db, getRequestToken(req))) {
    return res.status(401).json({ error: 'No autorizado. Iniciá sesión de nuevo.' });
  }
  next();
}

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  const { password } = req.body || {};
  const db = getDB();
  if (!password || hashPassword(password, db.auth.salt) !== db.auth.passwordHash) {
    return res.status(401).json({ error: 'Clave incorrecta' });
  }
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  // Prune expired sessions and cap how many stay stored
  db.auth.tokens = db.auth.tokens.filter(t => now - t.createdAt < TOKEN_TTL_MS).slice(-20);
  db.auth.tokens.push({ token, createdAt: now });
  saveDB(db);
  res.json({ token, mustChange: db.auth.mustChange });
});

// GET /api/auth/check — is this token still a valid session?
app.get('/api/auth/check', (req, res) => {
  const db = getDB();
  const ok = isValidToken(db, getRequestToken(req));
  res.json({ ok, mustChange: ok ? db.auth.mustChange : false });
});

// POST /api/auth/password — change the admin password
app.post('/api/auth/password', requireAuth, (req, res) => {
  const { newPassword } = req.body || {};
  if (!newPassword || String(newPassword).trim().length < 4) {
    return res.status(400).json({ error: 'La clave debe tener al menos 4 caracteres' });
  }
  if (String(newPassword) === DEFAULT_PASSWORD) {
    return res.status(400).json({ error: 'Elegí una clave distinta a la predeterminada' });
  }
  const db = getDB();
  const salt = crypto.randomBytes(16).toString('hex');
  db.auth.salt = salt;
  db.auth.passwordHash = hashPassword(newPassword, salt);
  db.auth.mustChange = false;
  saveDB(db);
  res.json({ ok: true });
});

// POST /api/auth/logout
app.post('/api/auth/logout', requireAuth, (req, res) => {
  const db = getDB();
  const token = getRequestToken(req);
  db.auth.tokens = db.auth.tokens.filter(t => t.token !== token);
  saveDB(db);
  res.json({ ok: true });
});


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
app.post('/api/items', requireAuth, upload.single('file'), async (req, res) => {
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
app.post('/api/items/url', requireAuth, (req, res) => {
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
app.put('/api/items/reorder', requireAuth, (req, res) => {
  const { orderedIds } = req.body;
  if (!Array.isArray(orderedIds)) return res.status(400).json({ error: 'orderedIds requerido' });

  const db = getDB();
  const itemMap = Object.fromEntries(db.items.map(i => [i.id, i]));
  db.items = orderedIds.map((id, index) => ({ ...itemMap[id], order: index }));
  saveDB(db);
  res.json(db.items);
});

// PUT /api/items/:id — update item properties
app.put('/api/items/:id', requireAuth, (req, res) => {
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
app.delete('/api/items/:id', requireAuth, (req, res) => {
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
  db.pages = db.pages.map(p => ({
    ...p,
    zoneAssignments: p.zoneAssignments.filter(a => a.itemId !== req.params.id),
  }));
  saveDB(db);
  res.json({ ok: true });
});

// GET /api/settings
app.get('/api/settings', (req, res) => {
  const db = getDB();
  res.json(db.settings);
});

// PUT /api/settings
app.put('/api/settings', requireAuth, (req, res) => {
  const db = getDB();
  const patch = { ...req.body };
  if (patch.title) {
    patch.title = {
      ...db.settings.title,
      ...patch.title,
      text: String(patch.title.text ?? db.settings.title.text).slice(0, 120),
    };
  }
  db.settings = { ...db.settings, ...patch };
  saveDB(db);
  res.json(db.settings);
});

// GET /api/pages — ordered list of pages the board cycles through; each page
// has its own layout template and per-zone document assignments
app.get('/api/pages', (req, res) => {
  const db = getDB();
  res.json(db.pages);
});

// PUT /api/pages — replace the full page list (add/remove/reorder/edit)
app.put('/api/pages', requireAuth, (req, res) => {
  const { pages } = req.body;
  if (!Array.isArray(pages) || pages.length === 0) {
    return res.status(400).json({ error: 'pages debe ser un array con al menos una página' });
  }

  const db = getDB();
  const itemIds = new Set(db.items.map(i => i.id));

  db.pages = pages.map((page, pageIndex) => {
    const template = LAYOUT_TEMPLATES[page.template] ? page.template : 'single';
    const validZoneIds = LAYOUT_TEMPLATES[template];
    const zoneAssignments = Array.isArray(page.zoneAssignments)
      ? page.zoneAssignments
          .filter(a => validZoneIds.includes(a.zoneId) && itemIds.has(a.itemId))
          .map((a, index) => ({
            id: a.id || uuidv4(),
            zoneId: a.zoneId,
            itemId: a.itemId,
            order: index,
            duration: a.duration ? Math.max(1, parseInt(a.duration)) : null,
          }))
      : [];

    return {
      id: page.id || uuidv4(),
      name: (page.name || '').trim() || `Página ${pageIndex + 1}`,
      template,
      zoneAssignments,
    };
  });

  saveDB(db);
  res.json(db.pages);
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
