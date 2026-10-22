const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/firebase');

const JWT_SECRET = 'kelurahan_mallawa_secret_key_2026';

// 1. ENDPOINT REGISTER ADMIN
router.post('/register', async (req, res) => {
  const { nama_lengkap, username, password } = req.body;

  if (!nama_lengkap || !username || !password) {
    return res.status(400).json({ message: 'Semua field wajib diisi!' });
  }

  try {
    const adminRef = db.ref(`admins/${username}`);
    const snapshot = await adminRef.once('value');

    if (snapshot.exists()) {
      return res.status(400).json({ message: 'Username sudah terdaftar!' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await adminRef.set({
      nama_lengkap,
      username,
      password: hashedPassword,
      created_at: new Date().toISOString()
    });

    res.status(201).json({ message: 'Akun Admin berhasil dibuat! Silakan login.' });
  } catch (error) {
    console.error('Error Register Admin:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server saat registrasi: ' + error.message });
  }
});

// 2. ENDPOINT LOGIN ADMIN
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username dan Password wajib diisi!' });
  }

  try {
    const adminRef = db.ref(`admins/${username}`);
    const snapshot = await adminRef.once('value');

    if (!snapshot.exists()) {
      return res.status(401).json({ message: 'Username atau Password salah!' });
    }

    const admin = snapshot.val();

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Username atau Password salah!' });
    }

    const token = jwt.sign(
      { id: username, username: admin.username, nama: admin.nama_lengkap },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      message: 'Login Berhasil!',
      token,
      admin: {
        id: username,
        nama_lengkap: admin.nama_lengkap,
        username: admin.username
      }
    });
  } catch (error) {
    console.error('Error Login Admin:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server saat login: ' + error.message });
  }
});

module.exports = router;