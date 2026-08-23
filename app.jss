// Import Firebase Realtime Database langsung via CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-app.js";
import { getDatabase, ref, push, onValue } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-database.js";

// =========================================================
// GANTI BAGIAN INI DENGAN FIREBASE CONFIG MILIKMU
// =========================================================
const firebaseConfig = {
    apiKey: "AIzaSyCdcWq_LFYTGE1tiyEqXsfOwTZJg3m27gk",
  authDomain: "kas-villa-jawir-de05b.firebaseapp.com",
  databaseURL: "https://kas-villa-jawir-de05b-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "kas-villa-jawir-de05b",
  storageBucket: "kas-villa-jawir-de05b.firebasestorage.app",
  messagingSenderId: "943097856108",
  appId: "1:943097856108:web:f037ae8890a9fe47d19849"
};
// Inisialisasi Firebase
const firebaseApp = initializeApp(firebaseConfig);
const database = getDatabase(firebaseApp);
const dbRef = ref(database, 'kas_villa');

// Utility: Format Angka ke Rupiah
const formatRupiah = (angka) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(angka);
};

// Class Pengelola Tampilan (UI)
class UIController {
    constructor() {
        this.balanceEl = document.getElementById('total-balance');
        this.historyEl = document.getElementById('history-list');
        this.formEl = document.getElementById('savings-form');
        this.nameInput = document.getElementById('name-input');
        this.amountInput = document.getElementById('amount-input');
    }

    updateTotal(total) {
        this.balanceEl.textContent = formatRupiah(total);
    }

    renderHistory(transactions) {
        this.historyEl.innerHTML = '';

        if (!transactions || Object.keys(transactions).length === 0) {
            this.historyEl.innerHTML = '<p class="empty-state">Belum ada setoran masuk.</p>';
            return;
        }

        // Urutkan transaksi dari yang paling baru
        const trxList = Object.values(transactions).reverse();

        trxList.forEach(trx => {
            const div = document.createElement('div');
            div.className = 'history-item';
            div.innerHTML = `
                <div class="history-info">
                    <strong>${trx.name}</strong>
                    <small>${trx.date}</small>
                </div>
                <div class="history-amount">
                    + ${formatRupiah(trx.amount)}
                </div>
            `;
            this.historyEl.appendChild(div);
        });
    }

    clearForm() {
        this.nameInput.value = '';
        this.amountInput.value = '';
    }
}

// Class Utama Aplikasi
class App {
    constructor(ui) {
        this.ui = ui;

        // Listener saat tombol Catat Setoran diklik
        this.ui.formEl.addEventListener('submit', (e) => this.handleSubmit(e));

        // Listener Realtime Firebase (Otomatis update di semua device)
        onValue(dbRef, (snapshot) => {
            const data = snapshot.val() || {};
            this.updateApp(data);
        });
    }

    handleSubmit(e) {
        e.preventDefault();
        const name = this.ui.nameInput.value.trim();
        const amount = parseFloat(this.ui.amountInput.value);

        if (name && amount > 0) {
            const newTrx = {
                name: name,
                amount: amount,
                date: new Date().toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                })
            };

            // Simpan ke database online Firebase
            push(dbRef, newTrx);
            this.ui.clearForm();
        }
    }

    updateApp(data) {
        const trxList = Object.values(data);
        const totalBalance = trxList.reduce((sum, item) => sum + (item.amount || 0), 0);

        this.ui.renderHistory(data);
        this.ui.updateTotal(totalBalance);
    }
}

// Jalankan Aplikasi
const ui = new UIController();
const app = new App(ui);
