import { initializeApp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-app.js";
import { getDatabase, ref, push, onValue, remove } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-database.js";

// ==========================================
// 1. SETTING PASSWORD ADMIN & FIREBASE
// ==========================================
const ADMIN_USER = "JAWIR";     // <-- Ubah Username Sesukamu
const ADMIN_PASS = "GAYGAY"; // <-- Ubah Password Sesukamu

const firebaseConfig = {
  apiKey: "AIzaSyCdcWq_LFYTGE1tiyEqXsfOwTZJg3m27gk",
  authDomain: "kas-villa-jawir-de05b.firebaseapp.com",
  databaseURL: "https://kas-villa-jawir-de05b-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "kas-villa-jawir-de05b",
  storageBucket: "kas-villa-jawir-de05b.firebasestorage.app",
  messagingSenderId: "943097856108",
  appId: "1:943097856108:web:f037ae8890a9fe47d19849"
};

const appFb = initializeApp(firebaseConfig);
const database = getDatabase(appFb);
const kasRef = ref(database, 'kas_villa');
const trashRef = ref(database, 'sampah_kas'); // Tempat buang history hapus

let chartInstance = null; // Variabel penyimpan diagram

// Utility Format Uang
const formatRupiah = (angka) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);

// ==========================================
// 2. KONTROL TAMPILAN (UI)
// ==========================================
// Elemen Halaman Utama
const mainPage = document.getElementById('main-page');
const formEl = document.getElementById('savings-form');
const nameInput = document.getElementById('name-input');
const amountInput = document.getElementById('amount-input');
const historyEl = document.getElementById('history-list');
const balanceEl = document.getElementById('total-balance');

// Elemen Halaman Admin
const adminPage = document.getElementById('admin-page');
const trashListEl = document.getElementById('trash-list');
const btnShowLogin = document.getElementById('btn-show-login');
const btnCloseAdmin = document.getElementById('btn-close-admin');

// Elemen Modal Login
const loginModal = document.getElementById('login-modal');
const btnCancelLogin = document.getElementById('btn-cancel-login');
const btnLogin = document.getElementById('btn-login');
const inputUser = document.getElementById('admin-user');
const inputPass = document.getElementById('admin-pass');
const loginError = document.getElementById('login-error');


// ==========================================
// 3. LOGIKA APLIKASI
// ==========================================

// --- Fitur Halaman Utama ---
formEl.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    const amount = parseFloat(amountInput.value);

    if (name && amount > 0) {
        const dateNow = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
        push(kasRef, { name, amount, date: dateNow });
        nameInput.value = ''; amountInput.value = '';
    }
});

// Listener Firebase: Saat Data Uang Berubah
onValue(kasRef, (snapshot) => {
    const data = snapshot.val() || {};
    const trxList = Object.entries(data).reverse();
    
    // Hitung Saldo
    const totalBalance = Object.values(data).reduce((sum, item) => sum + (item.amount || 0), 0);
    balanceEl.textContent = formatRupiah(totalBalance);

    // Tampilkan Riwayat Utama
    historyEl.innerHTML = trxList.length === 0 ? '<p class="empty-state">Belum ada setoran.</p>' : '';
    trxList.forEach(([key, trx]) => {
        // Data dititipkan di HTML agar bisa diambil saat menghapus
        const btnBatal = `<button class="btn-delete" data-id="${key}" data-name="${trx.name}" data-amount="${trx.amount}" data-date="${trx.date}">Batal</button>`;
        historyEl.innerHTML += `
            <div class="history-item">
                <div class="history-info"><strong>${trx.name}</strong><small>${trx.date}</small></div>
                <div class="history-right">
                    <div class="history-amount">+ ${formatRupiah(trx.amount)}</div>
                    ${btnBatal}
                </div>
            </div>
        `;
    });

    // Update Grafik Admin otomatis setiap ada data baru
    renderChart(data);
});

// Fitur Hapus (Soft Delete)
historyEl.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-delete')) {
        const id = e.target.getAttribute('data-id');
        // Bungkus data untuk dilempar ke tempat sampah
        const trashData = {
            name: e.target.getAttribute('data-name'),
            amount: parseFloat(e.target.getAttribute('data-amount')),
            date_entry: e.target.getAttribute('data-date'),
            date_deleted: new Date().toLocaleString('id-ID')
        };
        
        // 1. Simpan ke database 'sampah_kas'
        push(trashRef, trashData);
        // 2. Hapus dari database utama
        remove(ref(database, `kas_villa/${id}`));
    }
});


// --- Fitur Admin & Login ---
btnShowLogin.addEventListener('click', () => loginModal.classList.remove('hidden'));
btnCancelLogin.addEventListener('click', () => {
    loginModal.classList.add('hidden');
    loginError.style.display = 'none';
    inputUser.value = ''; inputPass.value = '';
});

btnLogin.addEventListener('click', () => {
    if (inputUser.value === ADMIN_USER && inputPass.value === ADMIN_PASS) {
        loginModal.classList.add('hidden');
        mainPage.classList.add('hidden');
        adminPage.classList.remove('hidden');
        inputUser.value = ''; inputPass.value = '';
        loginError.style.display = 'none';
    } else {
        loginError.style.display = 'block';
    }
});

btnCloseAdmin.addEventListener('click', () => {
    adminPage.classList.add('hidden');
    mainPage.classList.remove('hidden');
});

// Listener Firebase: Riwayat yang dihapus (Hanya muncul di Admin)
onValue(trashRef, (snapshot) => {
    const data = snapshot.val() || {};
    const trashArr = Object.values(data).reverse();
    
    trashListEl.innerHTML = trashArr.length === 0 ? '<p class="empty-state">Belum ada riwayat penghapusan.</p>' : '';
    trashArr.forEach(trx => {
        trashListEl.innerHTML += `
            <div class="history-item">
                <div class="history-info">
                    <strong>${trx.name} (Batal)</strong>
                    <small>Setor: ${trx.date_entry} | Dihapus: ${trx.date_deleted}</small>
                </div>
                <div class="history-amount negative">- ${formatRupiah(trx.amount)}</div>
            </div>
        `;
    });
});

// --- Fitur Diagram Chart.js ---
function renderChart(data) {
    const ctx = document.getElementById('myChart');
    if (!ctx) return;

    // Kelompokkan total uang berdasarkan tanggal
    const groupedData = {};
    Object.values(data).forEach(trx => {
        if (groupedData[trx.date]) {
            groupedData[trx.date] += trx.amount;
        } else {
            groupedData[trx.date] = trx.amount;
        }
    });

    const labels = Object.keys(groupedData); // Tanggal-tanggal
    const totals = Object.values(groupedData); // Total Rupiah

    // Hapus diagram lama kalau sudah ada, supaya bisa digambar ulang saat data berubah
    if (chartInstance) {
        chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
        type: 'bar', // Bisa diganti 'line' kalau mau garis
        data: {
            labels: labels,
            datasets: [{
                label: 'Total Setoran (Rp)',
                data: totals,
                backgroundColor: '#118ee9',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}
