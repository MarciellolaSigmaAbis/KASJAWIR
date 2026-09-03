import { initializeApp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-app.js";
import { getDatabase, ref, push, onValue, remove } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-database.js";

// ==========================================
// 1. SETTING PASSWORD ADMIN & FIREBASE
// ==========================================
const ADMIN_USER = "Jawir";     // Username Admin
const ADMIN_PASS = "GAYGAY"; // Password Admin

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
const trashRef = ref(database, 'sampah_kas');

let chartInstance = null;

// Format Rupiah
const formatRupiah = (angka) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);

// Elemen DOM
const mainPage = document.getElementById('main-page');
const adminPage = document.getElementById('admin-page');
const balanceEl = document.getElementById('total-balance');
const historyEl = document.getElementById('history-list');

// Modal Input Setoran
const inputModal = document.getElementById('input-modal');
const btnOpenInput = document.getElementById('btn-open-input');
const btnCloseInput = document.getElementById('btn-close-input');
const savingsForm = document.getElementById('savings-form');
const nameInput = document.getElementById('name-input');
const amountInput = document.getElementById('amount-input');

// Secret Admin & Modal Login
const btnSecretAdmin = document.getElementById('btn-secret-admin');
const loginModal = document.getElementById('login-modal');
const btnCancelLogin = document.getElementById('btn-cancel-login');
const btnLogin = document.getElementById('btn-login');
const inputUser = document.getElementById('admin-user');
const inputPass = document.getElementById('admin-pass');
const loginError = document.getElementById('login-error');
const btnCloseAdmin = document.getElementById('btn-close-admin');
const trashListEl = document.getElementById('trash-list');

// ==========================================
// 2. LOGIKA MODAL INPUT NOMINAL
// ==========================================
btnOpenInput.addEventListener('click', () => inputModal.classList.remove('hidden'));
btnCloseInput.addEventListener('click', () => inputModal.classList.add('hidden'));

savingsForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    const amount = parseFloat(amountInput.value);

    if (name && amount > 0) {
        const dateNow = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
        push(kasRef, { name, amount, date: dateNow });
        
        nameInput.value = '';
        amountInput.value = '';
        inputModal.classList.add('hidden');
    }
});

// ==========================================
// 3. LISTEN DATA FIREBASE (REALTIME)
// ==========================================
onValue(kasRef, (snapshot) => {
    const data = snapshot.val() || {};
    const trxList = Object.entries(data).reverse();
    
    // Hitung Total Saldo
    const totalBalance = Object.values(data).reduce((sum, item) => sum + (item.amount || 0), 0);
    balanceEl.textContent = formatRupiah(totalBalance);

    // Render Riwayat
    historyEl.innerHTML = trxList.length === 0 ? '<p class="empty-state">Belum ada setoran.</p>' : '';
    trxList.forEach(([key, trx]) => {
        const btnBatal = `<button class="btn-delete" data-id="${key}" data-name="${trx.name}" data-amount="${trx.amount}" data-date="${trx.date}">Batal</button>`;
        historyEl.innerHTML += `
            <div class="history-item">
                <div class="history-info">
                    <strong>${trx.name}</strong>
                    <small>${trx.date}</small>
                </div>
                <div class="history-right">
                    <div class="history-amount">+ ${formatRupiah(trx.amount)}</div>
                    ${btnBatal}
                </div>
            </div>
        `;
    });

    renderChart(data);
});

// Pembatalan / Soft Delete Data
historyEl.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-delete')) {
        const id = e.target.getAttribute('data-id');
        const trashData = {
            name: e.target.getAttribute('data-name'),
            amount: parseFloat(e.target.getAttribute('data-amount')),
            date_entry: e.target.getAttribute('data-date'),
            date_deleted: new Date().toLocaleString('id-ID')
        };
        
        push(trashRef, trashData);
        remove(ref(database, `kas_villa/${id}`));
    }
});

// ==========================================
// 4. LOGIKA SECRET ADMIN LOGIN & DASHBOARD
// ==========================================
btnSecretAdmin.addEventListener('click', () => loginModal.classList.remove('hidden'));

btnCancelLogin.addEventListener('click', () => {
    loginModal.classList.add('hidden');
    loginError.classList.add('hidden');
    inputUser.value = ''; inputPass.value = '';
});

btnLogin.addEventListener('click', () => {
    if (inputUser.value === ADMIN_USER && inputPass.value === ADMIN_PASS) {
        loginModal.classList.add('hidden');
        mainPage.classList.add('hidden');
        adminPage.classList.remove('hidden');
        inputUser.value = ''; inputPass.value = '';
        loginError.classList.add('hidden');
    } else {
        loginError.classList.remove('hidden');
    }
});

btnCloseAdmin.addEventListener('click', () => {
    adminPage.classList.add('hidden');
    mainPage.classList.remove('hidden');
});

// Render Log Trash Admin
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
                <div class="history-amount" style="color: #ff4d4f;">- ${formatRupiah(trx.amount)}</div>
            </div>
        `;
    });
});

// Chart.js untuk Admin
function renderChart(data) {
    const ctx = document.getElementById('myChart');
    if (!ctx) return;

    const groupedData = {};
    Object.values(data).forEach(trx => {
        groupedData[trx.date] = (groupedData[trx.date] || 0) + trx.amount;
    });

    const labels = Object.keys(groupedData);
    const totals = Object.values(groupedData);

    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Total Setoran (Rp)',
                data: totals,
                backgroundColor: '#118ee9',
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            scales: { y: { beginAtZero: true } }
        }
    });
}
