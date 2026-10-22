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

// 1. GET: Ambil semua pengajuan surat warga
router.get('/', async (req, res) => {
  try {
    const lettersRef = db.ref('letters');
    const snapshot = await lettersRef.once('value');

    const letters = [];
    if (snapshot.exists()) {
      snapshot.forEach(childSnapshot => {
        letters.push({
          id: childSnapshot.key,
          ...childSnapshot.val()
        });
      });
      // Urutkan dari yang terbaru
      letters.reverse();
    }

    res.json(letters);
  } catch (error) {
    console.error('Error GET Letters:', error);
    res.status(500).json({ 
      message: 'Terjadi kesalahan server saat mengambil data pengajuan surat.',
      error: error.message 
    });
  }
});

// 2. POST: Simpan pengajuan surat baru
router.post('/', upload.array('dokumenFiles'), async (req, res) => {
  try {
    const { nama, nik, phone, alamat, jenisSurat, catatan, berkas } = req.body;
    
    let parsedBerkas = [];
    if (typeof berkas === 'string') {
      try {
        parsedBerkas = JSON.parse(berkas);
      } catch (e) {
        parsedBerkas = [];
      }
    } else if (Array.isArray(berkas)) {
      parsedBerkas = berkas;
    }

    if (req.files && req.files.length > 0) {
      let fileIndex = 0;
      parsedBerkas = parsedBerkas.map(item => {
        if (item.type === 'file' && req.files[fileIndex]) {
          const uploadedFile = req.files[fileIndex];
          fileIndex++;
          return {
            ...item,
            name: `${getBaseUrl(req)}/uploads/${uploadedFile.filename}`
          };
        }
        return item;
      });
    }

    const resiId = `SRT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    await db.ref(`letters/${resiId}`).set({
      nama: nama || '',
      nik: nik || '',
      phone: phone || '',
      alamat: alamat || '',
      jenis_surat: jenisSurat || '',
      catatan: catatan || '',
      berkas: parsedBerkas,
      contacted: false,
      created_at: new Date().toISOString()
    });

    res.json({ 
      message: 'Pengajuan surat berhasil dikirim!', 
      id: resiId 
    });
  } catch (error) {
    console.error('Error POST Letter:', error);
    res.status(500).json({ message: 'Gagal menyimpan pengajuan surat ke Realtime Database: ' + error.message });
  }
});

// 3. PATCH: Update status kontak pengajuan surat
router.patch('/:id/contact', async (req, res) => {
  const { id } = req.params;
  const { contacted } = req.body;

  try {
    await db.ref(`letters/${id}`).update({
      contacted: Boolean(contacted)
    });
    res.json({ message: 'Status kontak berhasil diperbarui' });
  } catch (error) {
    console.error('Error PATCH Letter Contact:', error);
    res.status(500).json({ message: 'Gagal memperbarui status kontak: ' + error.message });
  }
});

module.exports = router;