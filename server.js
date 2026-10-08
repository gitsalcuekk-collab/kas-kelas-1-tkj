const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function readData() {
  if (!fs.existsSync(DATA_FILE)) {
    const initialData = {
      namaKelas: "TKJ 1",
      pemasukan: [],
      pengeluaran: [],
      siswa: [],
      riwayat: []
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  const rawData = fs.readFileSync(DATA_FILE);
  return JSON.parse(rawData);
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Endpoint untuk mendapatkan seluruh data dashboard
app.get('/api/dashboard', (req, res) => {
  const data = readData();
  
  const totalPemasukan = (data.pemasukan || []).reduce((acc, item) => acc + item.jumlah, 0);
  const totalPengeluaran = (data.pengeluaran || []).reduce((acc, item) => acc + item.jumlah, 0);
  const saldo = totalPemasukan - totalPengeluaran;

  res.json({
    namaKelas: data.namaKelas,
    totalPemasukan,
    totalPengeluaran,
    saldo,
    pemasukan: data.pemasukan || [],
    pengeluaran: data.pengeluaran || [],
    siswa: data.siswa || [],
    riwayat: data.riwayat || []
  });
});

// Endpoint untuk menambah Pemasukan / Pengeluaran (dengan autentikasi username & password)
app.post('/api/transaksi', (req, res) => {
  const { username, password, jenis, jumlah, keterangan, namaSiswa, absen } = req.body;

  // Verifikasi Username dan Password Admin
  if (username !== 'Suci' || password !== 'suci22') {
    return res.status(401).json({ success: false, message: 'Username atau Password Admin salah!' });
  }

  if (!jumlah || jumlah <= 0 || !keterangan) {
    return res.status(400).json({ success: false, message: 'Jumlah dan keterangan harus diisi dengan benar!' });
  }

  const data = readData();
  const witaTime = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

  const transaksiBaru = {
    id: Date.now(),
    jumlah: Number(jumlah),
    keterangan,
    namaSiswa: namaSiswa || '-',
    absen: absen || '-',
    tanggal: witaTime,
    ditambahkanOleh: username
  };

  if (jenis === 'pemasukan') {
    data.pemasukan.push(transaksiBaru);
  } else if (jenis === 'pengeluaran') {
    data.pengeluaran.push(transaksiBaru);
  } else {
    return res.status(400).json({ success: false, message: 'Jenis transaksi tidak valid!' });
  }

  data.riwayat.unshift({
    id: Date.now(),
    jenis: jenis.toUpperCase(),
    keterangan: `${keterangan} ${namaSiswa ? `(Siswa: ${namaSiswa} - Absen${absen})` : ''}`,
    jumlah: Number(jumlah),
    oleh: username,
    waktu: witaTime
  });

  writeData(data);
  res.json({ success: true, message: 'Transaksi berhasil ditambahkan!' });
});

app.delete('/api/transaksi/:id', (req, res) => {
  const { username, password } = req.body;
  const { id } = req.params;

  if (username !== 'Suci' || password !== 'suci22') {
    return res.status(401).json({ success: false, message: 'Username atau Password Admin salah!' });
  }

  const data = readData();
  
  data.pemasukan = data.pemasukan.filter(item => item.id !== Number(id));
  data.pengeluaran = data.pengeluaran.filter(item => item.id !== Number(id));
  data.riwayat = data.riwayat.filter(item => item.id !== Number(id));

  writeData(data);
  res.json({ success: true, message: 'Transaksi berhasil dihapus!' });
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server Kas Kelas berjalan di http://localhost:${PORT}`);
  });
}

module.exports = app;