const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../config/firebase');

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'official-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Hanya file gambar yang diperbolehkan!'), false);
    }
  }
});

const getBaseUrl = (req) => {
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  }
  const host = req.get('host');
  if (host && host.includes('railway.app')) {
    return `https://${host}`;
  }
  return `${req.protocol}://${host}`;
};

// 1. GET: Ambil data profil kelurahan
router.get('/', async (req, res) => {
  try {
    const snapshot = await db.ref('profiles/main_profile').once('value');

    if (!snapshot.exists()) {
      return res.status(404).json({ message: 'Data profil belum ditemukan' });
    }

    res.json({ id: 1, ...snapshot.val() });
  } catch (error) {
    console.error('Error GET Profile:', error);
    res.status(500).json({ 
      message: 'Terjadi kesalahan server saat mengambil data profil.',
      error: error.message 
    });
  }
});

// 2. PUT: Perbarui data profil kelurahan
router.put('/', async (req, res) => {
  const { name, district, regency, elevation, borders, visi, misi, stats, ageGroups, officials } = req.body;

  try {
    await db.ref('profiles/main_profile').update({
      name: name || '',
      district: district || '',
      regency: regency || '',
      elevation: elevation || '10 - 250 mdpl',
      borders: typeof borders === 'string' ? JSON.parse(borders || '{}') : (borders || {}),
      visi: visi || '',
      misi: typeof misi === 'string' ? JSON.parse(misi || '[]') : (misi || []),
      stats: typeof stats === 'string' ? JSON.parse(stats || '{}') : (stats || {}),
      age_groups: typeof ageGroups === 'string' ? JSON.parse(ageGroups || '[]') : (ageGroups || []),
      officials: typeof officials === 'string' ? JSON.parse(officials || '[]') : (officials || []),
      updated_at: new Date().toISOString()
    });

    res.json({ message: 'Profil kelurahan berhasil diperbarui!' });
  } catch (error) {
    console.error('Error PUT Profile:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server saat menyimpan profil: ' + error.message });
  }
});

// 3. POST: Upload Foto Profil Aparatur / Staf
router.post('/upload', (req, res) => {
  upload.single('photo')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'Ukuran foto melebihi batas maksimal 2 MB!' });
      }
      return res.status(400).json({ message: err.message });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Tidak ada file foto yang diunggah' });
    }

    res.json({
      message: 'Foto aparatur berhasil diunggah',
      filename: req.file.filename,
      url: `${getBaseUrl(req)}/uploads/${req.file.filename}`
    });
  });
});

module.exports = router;