const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function readData() {
  if (!fs.existsSync(DATA_FILE)) return { infoKelas: {}, siswa: [], pemasukan: [], pengeluaran: [] };
  const rawData = fs.readFileSync(DATA_FILE);
  return JSON.parse(rawData);
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

app.get('/api/dashboard', (req, res) => {
  const data = readData();
  const totalMasuk = data.pemasukan.reduce((sum, item) => sum + item.nominal, 0);
  const totalKeluar = data.pengeluaran.reduce((sum, item) => sum + item.nominal, 0);
  const saldo = totalMasuk - totalKeluar;

  res.json({
    infoKelas: data.infoKelas,
    saldo,
    totalMasuk,
    totalKeluar,
    siswa: data.siswa,
    pemasukan: data.pemasukan,
    pengeluaran: data.pengeluaran
  });
});

app.post('/api/pemasukan', (req, res) => {
  const { pin, siswaId, mingguKe, nominal } = req.body;
  const data = readData();

  if (pin !== data.infoKelas.pinAdmin) {
    return res.status(401).json({ success: false, message: 'PIN Admin Salah!' });
  }

  const siswaObj = data.siswa.find(s => s.id === parseInt(siswaId));
  const transaksiBaru = {
    id: 'IN-' + Date.now(),
    siswaId: parseInt(siswaId),
    namaSiswa: siswaObj ? siswaObj.nama : 'Anonim',
    mingguKe: parseInt(mingguKe),
    nominal: parseInt(nominal),
    tanggal: new Date().toLocaleDateString('id-ID')
  };

  data.pemasukan.push(transaksiBaru);
  saveData(data);
  res.json({ success: true, message: 'Pembayaran kas berhasil dicatat!' });
});

app.post('/api/pengeluaran', (req, res) => {
  const { pin, keterangan, nominal } = req.body;
  const data = readData();

  if (pin !== data.infoKelas.pinAdmin) {
    return res.status(401).json({ success: false, message: 'PIN Admin Salah!' });
  }

  const pengeluaranBaru = {
    id: 'OUT-' + Date.now(),
    keterangan,
    nominal: parseInt(nominal),
    tanggal: new Date().toLocaleDateString('id-ID')
  };

  data.pengeluaran.push(pengeluaranBaru);
  saveData(data);
  res.json({ success: true, message: 'Pengeluaran berhasil dicatat!' });
});

app.listen(PORT, () => {
  console.log(`Server Kas Kelas berjalan di http://localhost:${PORT}`);
});