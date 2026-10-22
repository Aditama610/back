const express = require('express');
const router = express.Router();
const db = require('../config/firebase');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const cleanFileName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + cleanFileName);
  }
});

const upload = multer({ storage: storage });

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

// 1. GET: Ambil semua berita
router.get('/', async (req, res) => {
  try {
    const snapshot = await db.ref('news').once('value');

    const newsList = [];
    if (snapshot.exists()) {
      snapshot.forEach(childSnapshot => {
        newsList.push({
          id: childSnapshot.key,
          ...childSnapshot.val()
        });
      });
      newsList.reverse();
    }

    res.json(newsList);
  } catch (error) {
    console.error('Error GET News:', error);
    res.status(500).json({ 
      message: 'Gagal mengambil data berita',
      error: error.message 
    });
  }
});

// 2. POST: Tambah berita baru
router.post('/', upload.single('imageFile'), async (req, res) => {
  try {
    const { title, date, summary, content, existingImage } = req.body;
    
    let imagePath = null;
    if (req.file) {
      imagePath = `${getBaseUrl(req)}/uploads/${req.file.filename}`;
    } else if (existingImage && existingImage !== 'undefined') {
      imagePath = existingImage;
    }

    const newNewsRef = db.ref('news').push();
    await newNewsRef.set({
      title: title || '',
      date: date || '',
      summary: summary || '',
      content: content || '',
      image: imagePath,
      created_at: new Date().toISOString()
    });

    res.json({ message: 'Berita berhasil ditambahkan', id: newNewsRef.key });
  } catch (error) {
    console.error('Error POST News:', error);
    res.status(500).json({ message: 'Gagal menambahkan berita: ' + error.message });
  }
});

// 3. PUT: Edit berita
router.put('/:id', upload.single('imageFile'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, date, summary, content, existingImage } = req.body;

    let imagePath = null;
    if (req.file) {
      imagePath = `${getBaseUrl(req)}/uploads/${req.file.filename}`;
    } else if (existingImage && existingImage !== 'undefined') {
      imagePath = existingImage;
    }

    await db.ref(`news/${id}`).update({
      title: title || '',
      date: date || '',
      summary: summary || '',
      content: content || '',
      image: imagePath,
      updated_at: new Date().toISOString()
    });

    res.json({ message: 'Berita berhasil diperbarui' });
  } catch (error) {
    console.error('Error PUT News:', error);
    res.status(500).json({ message: 'Gagal memperbarui berita: ' + error.message });
  }
});

// 4. DELETE: Hapus berita
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.ref(`news/${id}`).remove();
    res.json({ message: 'Berita berhasil dihapus' });
  } catch (error) {
    console.error('Error DELETE News:', error);
    res.status(500).json({ message: 'Gagal menghapus berita: ' + error.message });
  }
});

module.exports = router;