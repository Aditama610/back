const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const letterRoutes = require('./routes/letters');
const facilityRoutes = require('./routes/facilities');
const newsRoutes = require('./routes/news');

const app = express();

app.use(cors());

// 1. KEAMANAN HEADER
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false
}));

// 2. KEAMANAN CORS
app.use(cors({
  origin: ['http://localhost:5173', 'https://domain-frontend-anda.com'], // Izinkan frontend lokal dan produksi
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// 3. PEMBATASAN UKURAN BODY
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 4. RATE LIMITING
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: 'Terlalu banyak permintaan dari IP ini, silakan coba lagi nanti.'
});
app.use('/api/', limiter);

// 5. MEMASTIKAN FOLDER UPLOADS ADA
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 6. ROUTING UTAMA
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/letters', letterRoutes);
app.use('/api/facilities', facilityRoutes);
app.use('/api/news', newsRoutes);

// 7. SERVING STATIC FILES
app.use('/uploads', express.static(uploadDir, {
  setHeaders: (res) => {
    res.set('Access-Control-Allow-Origin', '*');
  }
}));

// 8. GLOBAL ERROR HANDLER
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack);
  res.header("Access-Control-Allow-Origin", "*");
  res.status(err.status || 500).json({
    message: err.message || 'Terjadi kesalahan internal pada server.',
  });
});

// 9. PORT DINAMIS
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server Express berjalan secara aman di port ${PORT}`);
});

module.exports = app;