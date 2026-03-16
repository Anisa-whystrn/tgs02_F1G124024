// --- SELEKSI ELEMENT DOM ---
const todoInput = document.getElementById('todo-input');
const addBtn = document.getElementById('add-btn');
const todoList = document.getElementById('todo-list');
const filterBtns = document.querySelectorAll('.filter-btn');
const itemsLeftSpan = document.getElementById('items-left');

// --- STATE MANAGEMENT ---
// Kita simpan semua task dalam array objek
let todos = [];
let currentFilter = 'all'; // all, completed, pending

// --- INISIALISASI ---
// Jalankan saat halaman dimuat
document.addEventListener('DOMContentLoaded', () => {
    loadTodos(); // Ambil data dari LocalStorage
    renderTodos(); // Tampilkan ke layar
});

// --- EVENT LISTENERS ---

// 1. Tambah Task (Klik tombol atau tekan Enter)
addBtn.addEventListener('click', addTask);
todoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTask();
});

// 2. Filter Task
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Hapus kelas active dari semua tombol
        filterBtns.forEach(b => b.classList.remove('active'));
        // Tambah kelas active ke tombol yang diklik
        btn.classList.add('active');
        
        // Set filter saat ini
        currentFilter = btn.getAttribute('data-filter');
        renderTodos();
    });
});

// 3. Delegasi Event untuk List (Edit, Delete, Check, Drag)
// Kita pasang listener di parent (ul) agar efisien
todoList.addEventListener('click', handleListClick);
todoList.addEventListener('change', handleListChange);

// --- FUNGSI UTAMA ---

// Fungsi Menambah Task
function addTask() {
    const text = todoInput.value.trim();
    
    if (text === '') {
        alert("Please write a task!");
        return;
    }

    const newTodo = {
        id: Date.now(), // ID unik berdasarkan waktu
        text: text,
        completed: false
    };

    todos.push(newTodo);
    saveToLocalStorage();
    renderTodos();
    
    todoInput.value = ''; // Kosongkan input
    todoInput.focus();
}

// Fungsi Render (Menampilkan) Task ke HTML
function renderTodos() {
    todoList.innerHTML = ''; // Bersihkan list lama

    // Filter data berdasarkan status
    let filteredTodos = todos;
    if (currentFilter === 'completed') {
        filteredTodos = todos.filter(todo => todo.completed);
    } else if (currentFilter === 'pending') {
        filteredTodos = todos.filter(todo => !todo.completed);
    }

    // Loop dan buat elemen HTML
    filteredTodos.forEach(todo => {
        const li = document.createElement('li');
        li.classList.add('todo-item');
        if (todo.completed) li.classList.add('completed');
        
        // Fitur Drag & Drop: atribut draggable
        li.setAttribute('draggable', 'true');
        li.setAttribute('data-id', todo.id);

        li.innerHTML = `
            <div class="todo-content">
                <input type="checkbox" class="check-btn" ${todo.completed ? 'checked' : ''}>
                <span class="todo-text">${escapeHtml(todo.text)}</span>
            </div>
            <div class="actions">
                <button class="action-btn edit-btn"><i class="fas fa-pen"></i></button>
                <button class="action-btn delete-btn"><i class="fas fa-trash"></i></button>
            </div>
        `;

        // Tambahkan event listener untuk Drag & Drop pada item ini
        addDragEvents(li);

        todoList.appendChild(li);
    });

    updateItemsLeft();
}

// Fungsi Handle Klik (Edit & Delete)
function handleListClick(e) {
    const item = e.target;
    const todoItem = item.closest('.todo-item');
    
    if (!todoItem) return;
    
    const id = Number(todoItem.getAttribute('data-id'));

    // Hapus Task
    if (item.classList.contains('delete-btn') || item.parentElement.classList.contains('delete-btn')) {
        deleteTask(id);
    }

    // Edit Task
    if (item.classList.contains('edit-btn') || item.parentElement.classList.contains('edit-btn')) {
        editTask(id);
    }
}

// Fungsi Handle Change (Checkbox)
function handleListChange(e) {
    if (e.target.classList.contains('check-btn')) {
        const todoItem = e.target.closest('.todo-item');
        const id = Number(todoItem.getAttribute('data-id'));
        toggleComplete(id);
    }
}

// --- LOGIKA DATA ---

function deleteTask(id) {
    // Konfirmasi dulu (opsional)
    if(confirm('Hapus task ini?')) {
        todos = todos.filter(todo => todo.id !== id);
        saveToLocalStorage();
        renderTodos();
    }
}

function editTask(id) {
    const todo = todos.find(t => t.id === id);
    const newText = prompt("Edit task:", todo.text);
    
    if (newText !== null && newText.trim() !== '') {
        todo.text = newText.trim();
        saveToLocalStorage();
        renderTodos();
    }
}

function toggleComplete(id) {
    const todo = todos.find(t => t.id === id);
    todo.completed = !todo.completed;
    saveToLocalStorage();
    renderTodos();
}

function updateItemsLeft() {
    const count = todos.filter(t => !t.completed).length;
    itemsLeftSpan.innerText = `${count} item${count !== 1 ? 's' : ''} left`;
}

// --- LOCAL STORAGE ---

function saveToLocalStorage() {
    localStorage.setItem('myTodos', JSON.stringify(todos));
}

function loadTodos() {
    const stored = localStorage.getItem('myTodos');
    if (stored) {
        todos = JSON.parse(stored);
    }
}

// --- DRAG & DROP LOGIC ---

let dragStartIndex;

function addDragEvents(item) {
    item.addEventListener('dragstart', () => {
        dragStartIndex = +item.getAttribute('data-id'); // Simpan ID item yang digeser
        item.classList.add('dragging');
        setTimeout(() => item.style.opacity = '0.5', 0);
    });

    item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        item.style.opacity = '1';
        dragStartIndex = null;
    });

    item.addEventListener('dragover', (e) => {
        e.preventDefault(); // Wajib agar bisa drop
        const afterElement = getDragAfterElement(todoList, e.clientY);
        const draggable = document.querySelector('.dragging');
        if (afterElement == null) {
            todoList.appendChild(draggable);
        } else {
            todoList.insertBefore(draggable, afterElement);
        }
    });
    
    item.addEventListener('drop', () => {
        // Saat drop terjadi, kita perlu mengurutkan ulang array 'todos'
        // berdasarkan urutan visual di DOM saat ini
        reorderTodos();
    });
}

// Helper untuk menentukan posisi drop (atas/bawah elemen lain)
function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.todo-item:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// Fungsi mengurutkan ulang array data sesuai urutan visual
function reorderTodos() {
    const newOrderIds = [...todoList.querySelectorAll('.todo-item')].map(item => {
        return Number(item.getAttribute('data-id'));
    });

    // Urutkan array 'todos' berdasarkan ID baru
    todos.sort((a, b) => {
        return newOrderIds.indexOf(a.id) - newOrderIds.indexOf(b.id);
    });

    saveToLocalStorage();
    // Tidak perlu render ulang penuh agar animasi drag tetap smooth, 
    // tapi data sudah tersimpan benar.
}

// Keamanan: Mencegah XSS sederhana
function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}