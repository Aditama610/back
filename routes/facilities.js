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

// 1. GET: Ambil semua data fasilitas
router.get('/', async (req, res) => {
  try {
    const snapshot = await db.ref('facilities').once('value');

    const facilities = [];
    if (snapshot.exists()) {
      snapshot.forEach(childSnapshot => {
        facilities.push({
          id: childSnapshot.key,
          ...childSnapshot.val()
        });
      });
      facilities.reverse();
    }

    res.json(facilities);
  } catch (error) {
    console.error('Error GET Facilities:', error);
    res.status(500).json({ 
      message: 'Gagal mengambil data fasilitas', 
      error: error.message 
    });
  }
});

// 2. POST: Tambah fasilitas baru
router.post('/', upload.single('imageFile'), async (req, res) => {
  try {
    const { name, address, category, existingImage } = req.body;
    
    let imagePath = null;
    if (req.file) {
      imagePath = `${getBaseUrl(req)}/uploads/${req.file.filename}`;
    } else if (existingImage && existingImage !== 'undefined') {
      imagePath = existingImage;
    }

    const newFacilityRef = db.ref('facilities').push();
    await newFacilityRef.set({
      name: name || '',
      address: address || '',
      category: category || 'Instansi & Pelayanan',
      image: imagePath,
      created_at: new Date().toISOString()
    });

    res.json({ message: 'Fasilitas berhasil ditambahkan', id: newFacilityRef.key });
  } catch (error) {
    console.error('Error POST Facility:', error);
    res.status(500).json({ message: 'Gagal menambahkan fasilitas: ' + error.message });
  }
});

// 3. PUT: Edit data fasilitas
router.put('/:id', upload.single('imageFile'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, category, existingImage } = req.body;

    let imagePath = null;
    if (req.file) {
      imagePath = `${getBaseUrl(req)}/uploads/${req.file.filename}`;
    } else if (existingImage && existingImage !== 'undefined') {
      imagePath = existingImage;
    }

    await db.ref(`facilities/${id}`).update({
      name: name || '',
      address: address || '',
      category: category || 'Instansi & Pelayanan',
      image: imagePath,
      updated_at: new Date().toISOString()
    });

    res.json({ message: 'Fasilitas berhasil diperbarui' });
  } catch (error) {
    console.error('Error PUT Facility:', error);
    res.status(500).json({ message: 'Gagal memperbarui fasilitas: ' + error.message });
  }
});

// 4. DELETE: Hapus fasilitas
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.ref(`facilities/${id}`).remove();
    res.json({ message: 'Fasilitas berhasil dihapus' });
  } catch (error) {
    console.error('Error DELETE Facility:', error);
    res.status(500).json({ message: 'Gagal menghapus fasilitas: ' + error.message });
  }
});

module.exports = router;