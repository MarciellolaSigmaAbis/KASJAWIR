// Tambahan: kita meng-import fitur "remove" dari Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-app.js";
import { getDatabase, ref, push, onValue, remove } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-database.js";

// =========================================================
// PASTE FIREBASE CONFIG KAMU DI SINI LAGI
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

const firebaseApp = initializeApp(firebaseConfig);
const database = getDatabase(firebaseApp);
const dbRef = ref(database, 'kas_villa');

const formatRupiah = (angka) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(angka);
};

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

        // Object.entries digunakan agar kita mendapatkan "Kunci Unik" dari Firebase beserta Datanya
        const trxList = Object.entries(transactions).reverse();

        trxList.forEach(([key, trx]) => {
            const div = document.createElement('div');
            div.className = 'history-item';
            div.innerHTML = `
                <div class="history-info">
                    <strong>${trx.name}</strong>
                    <small>${trx.date}</small>
                </div>
                <div class="history-amount">
                    + ${formatRupiah(trx.amount)}
                    <!-- Tombol hapus yang menyimpan Kunci Unik Firebase -->
                    <button class="btn-delete" data-key="${key}">Batal</button>
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

class App {
    constructor(ui) {
        this.ui = ui;

        this.ui.formEl.addEventListener('submit', (e) => this.handleSubmit(e));
        
        // Listener baru untuk menangkap klik pada tombol hapus
        this.ui.historyEl.addEventListener('click', (e) => this.handleDelete(e));

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
                    day: 'numeric', month: 'short', year: 'numeric'
                })
            };
            push(dbRef, newTrx);
            this.ui.clearForm();
        }
    }

    // Fungsi Logika untuk Menghapus Data di Firebase
    handleDelete(e) {
        if (e.target.classList.contains('btn-delete')) {
            const konfirmasi = confirm('Yakin mau menghapus setoran ini?');
            if (konfirmasi) {
                const key = e.target.getAttribute('data-key'); // Ambil kunci unik
                const itemRef = ref(database, 'kas_villa/' + key); // Cari lokasinya di Firebase
                remove(itemRef); // Hapus datanya!
            }
        }
    }

    updateApp(data) {
        const trxList = Object.values(data);
        const totalBalance = trxList.reduce((sum, item) => sum + (item.amount || 0), 0);

        this.ui.renderHistory(data);
        this.ui.updateTotal(totalBalance);
    }
}

const ui = new UIController();
const app = new App(ui);
