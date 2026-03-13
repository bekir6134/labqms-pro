require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
// "public" klasöründeki HTML/CSS dosyalarını dışarıya sunar
app.use(express.static(path.join(__dirname, 'public'))); 

// Neon.tech PostgreSQL Bağlantı Havuzu
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Neon için SSL zorunludur
});

// Veritabanı bağlantı testi (Tarayıcıda /api/test yazarak kontrol edebilirsin)
app.get('/api/test', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({ success: true, message: "Neon.tech Veritabanı Bağlantısı Başarılı!", time: result.rows[0].now });
    } catch (err) {
        res.status(500).json({ error: "Veritabanı Hatası: " + err.message });
    }
});

// --- MÜŞTERİLER (CRM) API YOLLARI ---

// 1. Veritabanındaki tüm müşterileri HTML'e gönder (LİSTELEME)
app.get('/api/musteriler', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM musteriler ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Müşteriler getirilirken hata oluştu." });
    }
});

// 2. HTML'den gelen yeni müşteri verisini veritabanına yaz (KAYDETME)
app.post('/api/musteriler', async (req, res) => {
    try {
        // Ön yüzden gelen kutuların içindeki verileri alıyoruz
        const { firma_adi, yetkili_kisi, telefon, email, adres } = req.body;
        
        // Veritabanına (Neon) yazıyoruz
        const yeniMusteri = await pool.query(
            'INSERT INTO musteriler (firma_adi, yetkili_kisi, telefon, email, adres) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [firma_adi, yetkili_kisi, telefon, email, adres]
        );
        
        res.json(yeniMusteri.rows[0]); // Başarı mesajını geri döndür
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Müşteri kaydedilirken hata oluştu." });
    }
});

// Sunucuyu Başlat
app.listen(PORT, () => {
    console.log(`🚀 LabQMS Sunucusu ${PORT} portunda çalışıyor.`);
});