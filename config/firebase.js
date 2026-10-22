const admin = require('firebase-admin');
const path = require('path');

const serviceAccountPath = path.join(__dirname, '../firebase-service-account.json');
const serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://web-kelurahan-be5bc-default-rtdb.asia-southeast1.firebasedatabase.app"
  });
}

const db = admin.database();

module.exports = db;