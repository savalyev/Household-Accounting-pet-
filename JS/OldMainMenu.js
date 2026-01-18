const API_URL = import.meta.env.VITE_API_URL;

// Проверка авторизации перед загрузкой страницы
(function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.replace('Authorization2.html');
        return;
    }
})();

let expenseChart = null;
const INCOME_CATEGORIES = [
    { id: 1, name: 'Зарплата' },
    { id: 2, name: 'Фриланс' },
    { id: 3, name: 'Инвестиции' },
    { id: 4, name: 'Подарки' },
    { id: 5, name: 'Возврат долга' },
    { id: 6, name: 'Продажа вещей' },
    { id: 7, name: 'Бонусы' },
    { id: 8, name: 'Проценты по вкладу' },
    { id: 9, name: 'Доход от аренды' },
    { id: 10, name: 'Другое' },
];

const EXPENSE_CATEGORIES = [
    { id: 1, name: 'Продукты' },
    { id: 2, name: 'Транспорт' },
    { id: 3, name: 'Развлечения' },
    { id: 4, name: 'Коммуналка' },
    { id: 5, name: 'Одежда' },
    { id: 6, name: 'Здоровье' },
    { id: 7, name: 'Образование' },
    { id: 8, name: 'Кафе/ресторан' },
    { id: 9, name: 'Путешествия' },
    { id: 10, name: 'Подарки' },
    { id: 11, name: 'Другое' },
];

function getCategoryName(categoryId, type) {
    const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : `Категория ${categoryId}`;
}

document.addEventListener("DOMContentLoaded", async function() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.replace('Authorization2.html');
        return;
    }

    // Проверяем валидность токена
    const isValid = await validateToken(token);
    if (!isValid) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('currentUser');
        window.location.replace('Authorization2.html');
        return;
    }

    const toProfile = document.getElementById('toprofile');
    const toStuffPunel = document.getElementById('tostuffpunel');
    const addExpenseBtn = document.getElementById('add_primary');
    const addIncomeBtn = document.getElementById('add_income');
    const resetBtn = document.querySelector('.button--primary[aria-label="Сбросить статистику"]');
    const exportBtn = document.querySelector('.button--export');

    toProfile?.addEventListener('click', function() {
        window.location.href = 'Profile.html';
    });

    toStuffPunel?.addEventListener('click', function() {
        window.location.href = 'StuffPanel.html'
    });

    initTxModal();
    initDetailModal();
    initChart();

    addExpenseBtn?.addEventListener('click', () => openTxModal('expense'));
    addIncomeBtn?.addEventListener('click', () => openTxModal('income'));
    resetBtn?.addEventListener('click', handleResetStats);
    exportBtn?.addEventListener('click', handleExport);

    // Загружаем данные при загрузке страницы
    await loadStats();
    await loadTransactions();
    await loadExpenseCategories();
});

async function validateToken(token) {
    try {
        const res = await fetch(`${API_URL}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        return res.ok;
    } catch (err) {
        return false;
    }
}

async function loadStats() {
    const token = localStorage.getItem('token');
    if (!token) {
        console.warn('Токен не найден для загрузки статистики');
        return;
    }

    try {
        const res = await fetch(`${API_URL}/transactions/stats`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ error: 'Ошибка сервера' }));
            console.error('Ошибка загрузки статистики:', res.status, errorData);
            return;
        }

        const data = await res.json();
        console.log('Статистика загружена:', data);
        
        updateStatsDisplay(data);
    } catch (err) {
        console.error('Ошибка загрузки статистики:', err);
    }
}

async function loadExpenseCategories() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const res = await fetch(`${API_URL}/transactions/expenses-by-categories`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!res.ok) {
            console.error('Ошибка загрузки категорий расходов:', res.status);
            return;
        }

        const data = await res.json();
        updateChart(data);
    } catch (err) {
        console.error('Ошибка загрузки категорий расходов:', err);
    }
}

function updateStatsDisplay(stats) {
    const incomeEl = document.getElementById('incomeValue');
    const expensesEl = document.getElementById('expensesValue');
    const totalEl = document.getElementById('totalValue');

    if (incomeEl) incomeEl.textContent = formatMoney(stats.income);
    if (expensesEl) expensesEl.textContent = formatMoney(stats.expenses);
    if (totalEl) {
        totalEl.textContent = formatMoney(stats.total);
        totalEl.style.color = stats.total >= 0 ? '#4ade80' : '#ef4444';
    }
}

function formatMoney(amount) {
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(amount);
}

async function loadTransactions() {
    const token = localStorage.getItem('token');
    if (!token) {
        console.warn('Токен не найден');
        return;
    }

    try {
        const res = await fetch(`${API_URL}/transactions/list`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ error: 'Ошибка сервера' }));
            console.error('Ошибка загрузки транзакций:', res.status, errorData);
            return;
        }

        const data = await res.json();
        console.log('Загружено транзакций:', data.length);
        
        if (Array.isArray(data) && data.length > 0) {
            renderTransactions(data); // Показываем все транзакции
        } else {
            console.log('Нет транзакций для отображения');
            clearTransactions();
        }
    } catch (err) {
        console.error('Ошибка загрузки транзакций:', err);
    }
}

function renderTransactions(transactions) {
    const container = document.getElementById('transactionsContainer');
    if (!container) {
        console.error('Контейнер transactionsContainer не найден');
        return;
    }

    container.innerHTML = '';

    if (!Array.isArray(transactions) || transactions.length === 0) {
        console.log('Нет транзакций для отображения');
        return;
    }

    transactions.forEach((tx, index) => {
        const card = createTransactionCard(tx, index);
        container.appendChild(card);
    });
}

function clearTransactions() {
    const container = document.getElementById('transactionsContainer');
    if (container) {
        container.innerHTML = '';
    }
}

function createTransactionCard(tx, index) {
    const card = document.createElement('div');
    card.className = `transaction-card card-${index + 1}`;
    card.style.cursor = 'pointer';
    
    const typeText = tx.type === 'income' ? 'Пополнение' : 'Расходы';
    const amount = parseFloat(tx.amount);
    const formattedAmount = formatMoney(amount);

    card.innerHTML = `
        <div class="card-background"></div>
        <div class="card-content">
            <div class="transaction-type">${typeText}</div>
            <div class="transaction-details">
                <img class="currency-icon" src="img/image-2.png" alt="RUB" />
                <div class="amount-section">
                    <div class="amount">${formattedAmount}</div>
                    <div class="currency">RUB</div>
                </div>
            </div>
        </div>
    `;

    card.addEventListener('click', () => {
        showTransactionDetails(tx);
    });

    return card;
}

function initChart() {
    const ctx = document.getElementById('expenseChart');
    if (!ctx) return;

    expenseChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    '#ef4444', '#f97316', '#f59e0b', '#eab308',
                    '#84cc16', '#22c55e', '#10b981', '#14b8a6',
                    '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6',
                    '#a855f7', '#d946ef', '#ec4899', '#f43f5e'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#ffffff',
                        font: {
                            family: 'Comfortaa',
                            size: 14
                        },
                        padding: 15
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = formatMoney(context.parsed);
                            return `${label}: ${value}`;
                        }
                    }
                }
            }
        }
    });
}

function updateChart(categoriesData) {
    if (!expenseChart) return;
    
    if (!categoriesData || categoriesData.length === 0) {
        expenseChart.data.labels = ['Нет данных'];
        expenseChart.data.datasets[0].data = [1];
        expenseChart.update();
        return;
    }

    const labels = categoriesData.map(cat => {
        const categoryName = getCategoryName(cat.category_id, 'expense');
        return categoryName;
    });
    
    const data = categoriesData.map(cat => parseFloat(cat.total));

    expenseChart.data.labels = labels;
    expenseChart.data.datasets[0].data = data;
    expenseChart.update();
}

function initDetailModal() {
    const modalWrapper = document.createElement('div');
    modalWrapper.innerHTML = `
        <div class="modal-overlay" id="detailModal" style="display:none;">
            <div class="modal-content">
                <div class="modal-header">
                    <h2 id="detailModalTitle">Детали транзакции</h2>
                    <button class="close-modal" id="detailModalClose">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="detail-group">
                        <label>Тип:</label>
                        <p id="detailType"></p>
                    </div>
                    <div class="detail-group">
                        <label>Сумма:</label>
                        <p id="detailAmount"></p>
                    </div>
                    <div class="detail-group">
                        <label>Категория:</label>
                        <p id="detailCategory"></p>
                    </div>
                    <div class="detail-group">
                        <label>Описание:</label>
                        <p id="detailDescription"></p>
                    </div>
                    <div class="detail-group">
                        <label>Дата:</label>
                        <p id="detailDate"></p>
                    </div>
                    <div class="detail-group" id="detailRecurringGroup" style="display:none;">
                        <label>Регулярная операция:</label>
                        <p id="detailRecurring"></p>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modalWrapper.firstElementChild);

    const detailModal = document.getElementById('detailModal');
    const closeBtn = document.getElementById('detailModalClose');

    closeBtn.addEventListener('click', () => {
        detailModal.style.display = 'none';
    });

    detailModal.addEventListener('click', (e) => {
        if (e.target === detailModal) {
            detailModal.style.display = 'none';
        }
    });
}

function showTransactionDetails(tx) {
    const modal = document.getElementById('detailModal');
    if (!modal) return;

    document.getElementById('detailModalTitle').textContent = 
        tx.type === 'income' ? 'Детали дохода' : 'Детали расхода';
    document.getElementById('detailType').textContent = 
        tx.type === 'income' ? 'Доход' : 'Расход';
    document.getElementById('detailAmount').textContent = formatMoney(parseFloat(tx.amount));
    document.getElementById('detailCategory').textContent = 
        getCategoryName(tx.category_id, tx.type);
    document.getElementById('detailDescription').textContent = 
        tx.description || 'Нет описания';
    
    const date = new Date(tx.transaction_date);
    document.getElementById('detailDate').textContent = 
        date.toLocaleDateString('ru-RU', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric' 
        });

    if (tx.is_recurring) {
        document.getElementById('detailRecurringGroup').style.display = 'block';
        document.getElementById('detailRecurring').textContent = 
            `Да, интервал: ${tx.recurring_interval || 'не указан'}`;
    } else {
        document.getElementById('detailRecurringGroup').style.display = 'none';
    }

    modal.style.display = 'flex';
}

async function handleResetStats() {
    if (!confirm('Вы уверены, что хотите сбросить всю статистику? Это действие нельзя отменить.')) {
        return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const res = await fetch(`${API_URL}/transactions/reset`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await res.json();
        if (!res.ok) {
            alert('Ошибка: ' + (data.error || 'Не удалось сбросить статистику'));
            return;
        }

        alert('Статистика успешно сброшена!');
        await loadStats();
        await loadTransactions();
        await loadExpenseCategories();
    } catch (err) {
        console.error('Ошибка сброса статистики:', err);
        alert('Ошибка при сбросе статистики');
    }
}

async function handleExport() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const res = await fetch(`${API_URL}/transactions/export`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ error: 'Ошибка сервера' }));
            alert('Ошибка экспорта: ' + (errorData.error || 'Не удалось экспортировать данные'));
            return;
        }

        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transactions_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (err) {
        console.error('Ошибка экспорта:', err);
        alert('Ошибка при экспорте данных');
    }
}

let txModal;

function initTxModal() {
    const modalWrapper = document.createElement('div');
    modalWrapper.innerHTML = `
        <div class="modal-overlay" id="txModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2 id="txModalTitle">Добавить операцию</h2>
                    <button class="close-modal" id="txModalClose">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="modal-error-message" id="txModalError"></div>
                    <form id="txForm">
                        <div class="modal-form-group">
                            <label for="txAmount">Сумма</label>
                            <input type="number" id="txAmount" class="modal-form-control modal-amount-input" placeholder="0.00" min="0" step="0.01" required>
                        </div>
                        <div class="modal-form-group">
                            <label for="txCategory">Категория</label>
                            <select id="txCategory" class="modal-form-control modal-form-select" required>
                                <option value="" disabled selected>Выберите категорию</option>
                            </select>
                        </div>
                        <div class="modal-form-group">
                            <label for="txDescription">Описание</label>
                            <input type="text" id="txDescription" class="modal-form-control" placeholder="Краткое описание">
                        </div>
                        <div class="modal-form-group">
                            <label for="txDate">Дата</label>
                            <input type="date" id="txDate" class="modal-form-control">
                        </div>
                        <div class="modal-form-group">
                            <label>
                                <input type="checkbox" id="txRecurring"> Регулярная операция
                            </label>
                        </div>
                        <div class="modal-form-group" id="txIntervalGroup" style="display:none;">
                            <label for="txInterval">Интервал (например, 1 month)</label>
                            <input type="text" id="txInterval" class="modal-form-control" placeholder="1 month">
                        </div>
                        <button type="submit" class="modal-submit-btn" id="txSubmitBtn">Сохранить</button>
                    </form>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modalWrapper.firstElementChild);

    txModal = document.getElementById('txModal');
    const closeBtn = document.getElementById('txModalClose');
    const form = document.getElementById('txForm');
    const recurringCheckbox = document.getElementById('txRecurring');
    const intervalGroup = document.getElementById('txIntervalGroup');

    recurringCheckbox.addEventListener('change', () => {
        intervalGroup.style.display = recurringCheckbox.checked ? 'block' : 'none';
    });

    closeBtn.addEventListener('click', closeTxModal);
    txModal.addEventListener('click', (e) => {
        if (e.target === txModal) closeTxModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && txModal?.style.display === 'flex') {
            closeTxModal();
        }
    });

    form.addEventListener('submit', submitTxForm);

    document.getElementById('txDate').value = new Date().toISOString().split('T')[0];
}

function fillCategories(type) {
    const categorySelect = document.getElementById('txCategory');
    if (!categorySelect) return;
    
    categorySelect.innerHTML = '<option value="" disabled selected>Выберите категорию</option>';
    
    const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = String(cat.id);
        opt.textContent = `${cat.name} (${cat.id})`;
        categorySelect.appendChild(opt);
    });
}

function openTxModal(type) {
    if (!txModal) return;
    txModal.dataset.type = type;
    document.getElementById('txModalTitle').textContent = type === 'income' ? 'Добавить доход' : 'Добавить расход';
    document.getElementById('txModalError').style.display = 'none';
    document.getElementById('txForm').reset();
    document.getElementById('txIntervalGroup').style.display = 'none';
    document.getElementById('txDate').value = new Date().toISOString().split('T')[0];
    
    fillCategories(type);
    
    txModal.style.display = 'flex';
    document.getElementById('txAmount').focus();
}

function closeTxModal() {
    if (!txModal) return;
    txModal.style.display = 'none';
}

async function submitTxForm(e) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
        showTxError('Сначала авторизуйтесь');
        return;
    }

    const amount = parseFloat(document.getElementById('txAmount').value);
    const categoryRaw = document.getElementById('txCategory').value;
    const category_id = categoryRaw ? Number(categoryRaw) : null;
    const description = document.getElementById('txDescription').value;
    const transaction_date = document.getElementById('txDate').value;
    const is_recurring = document.getElementById('txRecurring').checked;
    const recurring_interval = is_recurring ? document.getElementById('txInterval').value : null;
    const type = txModal.dataset.type === 'income' ? 'income' : 'expense';

    if (!amount || amount <= 0) {
        showTxError('Введите корректную сумму');
        return;
    }
    if (!category_id) {
        showTxError('Выберите категорию');
        return;
    }

    const payload = {
        amount,
        category_id,
        description,
        transaction_date,
        is_recurring,
        recurring_interval,
    };

    const endpoint = type === 'income' ? '/transactions/income' : '/transactions/expenses';

    try {
        const res = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || 'Ошибка сохранения');
        }

        // Обновляем статистику и транзакции
        await loadStats();
        await loadTransactions();
        await loadExpenseCategories();
        
        closeTxModal();
    } catch (err) {
        showTxError(err.message);
    }
}

function showTxError(message) {
    const el = document.getElementById('txModalError');
    if (!el) return;
    el.textContent = message;
    el.style.display = 'block';
}
