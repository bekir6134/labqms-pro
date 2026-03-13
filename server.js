require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const cors = require('cors');

const app = express(); // İŞTE HATAYA SEBEP OLAN EKSİK SATIR BUYDU!
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); 

// Neon.tech PostgreSQL Bağlantısı
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// TEST YOLU
app.get('/api/test', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({ success: true, message: "Bağlantı Başarılı!", time: result.rows[0].now });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- MÜŞTERİLER API ---

// 1. LİSTELEME
app.get('/api/musteriler', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM musteriler ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. KAYDET VEYA GÜNCELLE
app.post('/api/musteriler', async (req, res) => {
    try {
        const { id, firma_adi, yetkililer, telefonlar, sertifika_mailleri, fatura_mailleri, il, ilce, adres, vergi_dairesi, vergi_no } = req.body;
        
        if (id) {
            // GÜNCELLEME
            const query = `UPDATE musteriler SET firma_adi=$1, yetkililer=$2, telefonlar=$3, sertifika_mailleri=$4, fatura_mailleri=$5, il=$6, ilce=$7, adres=$8, vergi_dairesi=$9, vergi_no=$10 WHERE id=$11 RETURNING *`;
            const result = await pool.query(query, [firma_adi, JSON.stringify(yetkililer), JSON.stringify(telefonlar), JSON.stringify(sertifika_mailleri), JSON.stringify(fatura_mailleri), il, ilce, adres, vergi_dairesi, vergi_no, id]);
            res.json(result.rows[0]);
        } else {
            // YENİ KAYIT
            const query = `INSERT INTO musteriler (firma_adi, yetkililer, telefonlar, sertifika_mailleri, fatura_mailleri, il, ilce, adres, vergi_dairesi, vergi_no) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`;
            const result = await pool.query(query, [firma_adi, JSON.stringify(yetkililer), JSON.stringify(telefonlar), JSON.stringify(sertifika_mailleri), JSON.stringify(fatura_mailleri), il, ilce, adres, vergi_dairesi, vergi_no]);
            res.json(result.rows[0]);
        }
    } catch (err) {
        console.error("Hata:", err.message);
        res.status(500).json({ error: "Sunucu Hatası" });
    }
});


// --- KATEGORİ YÖNETİMİ API ---

// 1. Tüm Kategorileri Getir
app.get('/api/kategoriler', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM kategoriler ORDER BY kategori_adi ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Yeni Kategori Ekle
app.post('/api/kategoriler', async (req, res) => {
    try {
        const { kategori_adi } = req.body;
        const result = await pool.query(
            'INSERT INTO kategoriler (kategori_adi) VALUES ($1) RETURNING *',
            [kategori_adi]
        );
        res.json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') { // Benzersizlik hatası
            return res.status(400).json({ error: "Bu kategori zaten mevcut." });
        }
        res.status(500).json({ error: err.message });
    }
});

// 3. Kategori Sil
app.delete('/api/kategoriler/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM kategoriler WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// CİHAZ KÜTÜPHANESİ API YOLLARI

// 1. Listeleme (Kategorilerle Birlikte)
app.get('/api/cihaz-kutuphanesi', async (req, res) => {
    try {
        const query = `
            SELECT ck.*, k.kategori_adi 
            FROM cihaz_kutuphanesi ck 
            INNER JOIN kategoriler k ON ck.kategori_id = k.id 
            ORDER BY ck.cihaz_adi ASC`;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Kaydetme
app.post('/api/cihaz-kutuphanesi', async (req, res) => {
    try {
        const { kategori_id, cihaz_adi, periyot, fiyat, para_birimi } = req.body;
        const query = `
            INSERT INTO cihaz_kutuphanesi (kategori_id, cihaz_adi, periyot, fiyat, para_birimi) 
            VALUES ($1, $2, $3, $4, $5) RETURNING *`;
        const result = await pool.query(query, [kategori_id, cihaz_adi, periyot, fiyat, para_birimi]);
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Kayıt Hatası:", err.message);
        res.status(500).json({ error: "Veritabanı kayıt hatası." });
    }
});

// TEKLİF HAZIRLAMA API'LERİ

// 1. Teklif için müşteri ve cihaz bilgilerini getiren endpoint
app.get('/api/teklif-on-veriler', async (req, res) => {
    try {
        const musteriler = await pool.query('SELECT id, firma_adi FROM musteriler ORDER BY firma_adi ASC');
        const cihazlar = await pool.query(`
            SELECT ck.id, ck.cihaz_adi, ck.fiyat, ck.para_birimi, k.kategori_adi 
            FROM cihaz_kutuphanesi ck 
            JOIN kategoriler k ON ck.kategori_id = k.id 
            ORDER BY ck.cihaz_adi ASC`);
        
        res.json({
            musteriler: musteriler.rows,
            cihazlar: cihazlar.rows
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// --- TALİMATLAR (PROSEDÜR) API ---

app.get('/api/talimatlar', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM talimatlar ORDER BY talimat_kodu ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/talimatlar', async (req, res) => {
    try {
        const { talimat_adi, talimat_kodu, olcme_araligi } = req.body;
        const result = await pool.query(
            'INSERT INTO talimatlar (talimat_adi, talimat_kodu, olcme_araligi) VALUES ($1, $2, $3) RETURNING *',
            [talimat_adi, talimat_kodu, olcme_araligi]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Referans Cihazları Getir (Son kalibrasyon bilgileriyle beraber)
app.get('/api/referans-cihazlar', async (req, res) => {
    try {
        const query = `
            SELECT rc.*, k.kategori_adi, rt.sertifika_no, rt.sonraki_kal_tarihi
            FROM referans_cihazlar rc
            LEFT JOIN kategoriler k ON rc.kategori_id = k.id
            LEFT JOIN (
                SELECT DISTINCT ON (referans_id) * FROM referans_takip 
                ORDER BY referans_id, kal_tarihi DESC
            ) rt ON rc.id = rt.referans_id`;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) { res.status(500).send(err.message); }
});


app.listen(PORT, () => {
    console.log(`🚀 Sunucu ${PORT} portunda başarıyla ayağa kalktı.`);
});