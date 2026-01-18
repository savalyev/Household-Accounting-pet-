const API_URL = import.meta.env.VITE_API_URL;

const EXPENSE_CATEGORIES = [
    { id: 1, key: 'food', name: 'Продукты', icon: 'fas fa-utensils' },
    { id: 2, key: 'transport', name: 'Транспорт', icon: 'fas fa-car' },
    { id: 3, key: 'entertainment', name: 'Развлечения', icon: 'fas fa-film' },
    { id: 4, key: 'home', name: 'Коммуналка', icon: 'fas fa-home' },
    { id: 5, key: 'shopping', name: 'Одежда и покупки', icon: 'fas fa-shopping-bag' },
    { id: 6, key: 'health', name: 'Здоровье', icon: 'fas fa-heartbeat' },
    { id: 7, key: 'education', name: 'Образование', icon: 'fas fa-graduation-cap' },
    { id: 8, key: 'cafe', name: 'Кафе/ресторан', icon: 'fas fa-mug-hot' },
    { id: 9, key: 'travel', name: 'Путешествия', icon: 'fas fa-plane' },
    { id: 10, key: 'gifts', name: 'Подарки', icon: 'fas fa-gift' },
    { id: 11, key: 'other', name: 'Другое', icon: 'fas fa-ellipsis-h' },
];

const INCOME_CATEGORIES = [
    { id: 1, key: 'salary', name: 'Зарплата', icon: 'fas fa-money-bill-wave' },
    { id: 2, key: 'freelance', name: 'Фриланс', icon: 'fas fa-laptop-code' },
    { id: 3, key: 'invest', name: 'Инвестиции', icon: 'fas fa-chart-line' },
    { id: 4, key: 'gifts', name: 'Подарки', icon: 'fas fa-gift' },
    { id: 5, key: 'debt', name: 'Возврат долга', icon: 'fas fa-undo' },
    { id: 6, key: 'sale', name: 'Продажа вещей', icon: 'fas fa-store' },
    { id: 7, key: 'bonus', name: 'Бонусы', icon: 'fas fa-star' },
    { id: 8, key: 'deposit', name: 'Проценты', icon: 'fas fa-piggy-bank' },
    { id: 9, key: 'rent', name: 'Доход от аренды', icon: 'fas fa-building' },
    { id: 10, key: 'other', name: 'Другое', icon: 'fas fa-ellipsis-h' },
];

let transactions = [];
let expenseChart = null;
let filters = { type: 'all', period: 'month' };
let goals = [];

document.addEventListener('DOMContentLoaded', () => {
    bootstrap();
});

async function bootstrap() {
    const token = localStorage.getItem('token');
    if (!token) {
        redirectToAuth();
        return;
    }

    const isValid = await validateToken(token);
    if (!isValid) {
        redirectToAuth(true);
        return;
    }

    // Проверяем роль пользователя и скрываем админ-кнопку если нужно
    await checkAdminAccess();

    initChart();
    initEventListeners();
    syncInitialPeriod();

    document.getElementById('dateInput').valueAsDate = new Date();

    await loadData();
    await loadGoals();
}

async function checkAdminAccess() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const res = await fetch(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
            const user = await res.json();
            const adminBtn = document.getElementById('tostuffpunel');
            if (adminBtn) {
                if (user.role !== 'admin') {
                    adminBtn.style.display = 'none';
                } else {
                    adminBtn.style.display = '';
                }
            }
        }
    } catch (err) {
        console.error('Ошибка проверки роли', err);
    }
}

function redirectToAuth(clear = false) {
    if (clear) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('currentUser');
    }
    window.location.replace('Authorization2.html');
}

async function validateToken(token) {
    try {
        const res = await fetch(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return res.ok;
    } catch (err) {
        console.error('Ошибка проверки токена', err);
        return false;
    }
}

async function loadData() {
    await Promise.all([
        loadTransactions(),
        loadStatsFromTransactions()
    ]);
}

async function loadGoals() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const res = await fetch(`${API_URL}/goals`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.status === 401 || res.status === 403) {
            redirectToAuth(true);
            return;
        }
        const data = await res.json();
        goals = Array.isArray(data) ? data : [];
        renderGoals(goals);
    } catch (err) {
        console.error('Ошибка загрузки целей', err);
    }
}

async function loadTransactions() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const res = await fetch(`${API_URL}/transactions/list`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.status === 401) {
            redirectToAuth(true);
            return;
        }
        const data = await res.json();
        transactions = Array.isArray(data) ? data : [];
        applyFiltersAndRender();
    } catch (err) {
        console.error('Ошибка загрузки транзакций', err);
    }
}

async function loadStatsFromTransactions() {
    applyFiltersAndRender();
}

function applyFiltersAndRender() {
    const filtered = applyFilters(transactions);
    renderTransactions(filtered);
    updateTransactionsSummary(filtered);
    updateStatsCards(filtered);
    updateQuickStats(filtered);
    updateBudgetIndicator(filtered);
    updateInsights(filtered);
    updateChartData(filtered);
}

function applyFilters(list) {
    const now = new Date();
    const startDate = getPeriodStartDate(filters.period, now);

    return list.filter(tx => {
        if (filters.type !== 'all' && tx.type !== filters.type) return false;

        if (startDate) {
            const txDate = new Date(tx.transaction_date || tx.date || tx.created_at);
            if (Number.isNaN(txDate.getTime()) || txDate < startDate) return false;
        }
        return true;
    });
}

function getPeriodStartDate(period, now = new Date()) {
    const current = new Date(now);
    switch (period) {
        case 'week': {
            const day = current.getDay();
            const diff = current.getDate() - day + (day === 0 ? -6 : 1);
            return new Date(current.setDate(diff));
        }
        case 'month':
            return new Date(current.getFullYear(), current.getMonth(), 1);
        case 'quarter': {
            const month = current.getMonth();
            const startMonth = month - (month % 3);
            return new Date(current.getFullYear(), startMonth, 1);
        }
        case 'year':
            return new Date(current.getFullYear(), 0, 1);
        default:
            return null;
    }
}

function initEventListeners() {
    document.getElementById('add_primary')?.addEventListener('click', () => openTransactionModal('expense'));
    document.getElementById('add_income')?.addEventListener('click', () => openTransactionModal('income'));
    document.getElementById('resetStats')?.addEventListener('click', resetStatistics);
    document.getElementById('exportBtn')?.addEventListener('click', exportData);
    document.getElementById('addGoal')?.addEventListener('click', () => openGoalModal());
    document.getElementById('goalSave')?.addEventListener('click', saveGoal);
    document.getElementById('goalCancel')?.addEventListener('click', closeGoalModal);
    document.getElementById('goalModalClose')?.addEventListener('click', closeGoalModal);
    
    const deadlineInput = document.getElementById('goalDeadline');
    if (deadlineInput) {
        const today = new Date().toISOString().split('T')[0];
        deadlineInput.setAttribute('min', today);
    }

    document.getElementById('filterToggle')?.addEventListener('click', toggleFilter);
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            if (chip.dataset.filter) {
                document.querySelectorAll('.filter-chip[data-filter]').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                filters.type = chip.dataset.filter;
                applyFiltersAndRender();
            }
            if (chip.dataset.period) {
                setPeriod(chip.dataset.period);
            }
        });
    });

    document.querySelectorAll('.time-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            setPeriod(btn.dataset.period);
        });
    });

    document.getElementById('modalClose')?.addEventListener('click', closeModal);
    document.getElementById('cancelTransaction')?.addEventListener('click', closeModal);
    document.getElementById('saveTransaction')?.addEventListener('click', saveTransaction);

    document.querySelectorAll('.type-option').forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('.type-option').forEach(o => o.classList.remove('active'));
            option.classList.add('active');
            populateCategories(option.dataset.type);
        });
    });

    document.getElementById('modalOverlay')?.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeModal();
    });

    document.getElementById('goalModalClose')?.addEventListener('click', closeGoalModal);
    document.getElementById('goalCancel')?.addEventListener('click', closeGoalModal);
    document.getElementById('goalSave')?.addEventListener('click', saveGoal);
    document.getElementById('goalModalOverlay')?.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeGoalModal();
    });

    document.getElementById('toprofile')?.addEventListener('click', () => {
        window.location.href = 'Profile.html';
    });
    document.getElementById('tostuffpunel')?.addEventListener('click', () => {
        window.location.href = 'StuffPanel.html';
    });
}

function syncInitialPeriod() {
    setPeriod('month');
}

function setPeriod(period) {
    filters.period = period;

    document.querySelectorAll('.filter-chip[data-period]').forEach(chip => {
        chip.classList.toggle('active', chip.dataset.period === period);
    });
    document.querySelectorAll('.time-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.period === period);
    });

    applyFiltersAndRender();
}

function renderTransactions(list) {
    const container = document.getElementById('transactionsContainer');
    if (!container) return;

    if (!list.length) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-receipt"></i>
                <p>Операций пока нет</p>
                <small>Добавьте первую операцию</small>
            </div>
        `;
        return;
    }

    container.innerHTML = '';

    list.forEach(tx => {
        const meta = getCategoryMeta(tx.category_id, tx.type);
        const amount = Number(tx.amount) || 0;
        const txEl = document.createElement('div');
        txEl.className = `transaction-item ${tx.type}`;
        txEl.innerHTML = `
            <div class="transaction-header">
                <span class="transaction-category">
                    <i class="${meta.icon}"></i> ${meta.name}
                </span>
                <span class="transaction-amount ${tx.type}">
                    ${tx.type === 'expense' ? '-' : '+'}${formatCurrency(amount)}
                </span>
            </div>
            <div class="transaction-details">
                <span class="transaction-description">${tx.description || 'Без описания'}</span>
                <span class="transaction-date">${formatDate(tx.transaction_date || tx.date)}</span>
            </div>
        `;
        container.appendChild(txEl);
    });
}

function renderGoals(list) {
    const container = document.getElementById('goalsList');
    if (!container) return;

    if (!list.length) {
        container.innerHTML = `
            <div class="goal-item">
                <div class="goal-info">
                    <span class="goal-name">Целей пока нет</span>
                    <span class="goal-progress">0%</span>
                </div>
                <div class="progress-bar goal-bar">
                    <div class="progress-fill" style="width: 0%"></div>
                </div>
                <div class="goal-amount">Добавьте первую цель</div>
            </div>
        `;
        return;
    }

    container.innerHTML = '';
    list.forEach(goal => {
        const target = Number(goal.target_amount) || 0;
        const current = Number(goal.current_amount) || 0;
        const pct = target > 0 ? Math.min(Math.round((current / target) * 100), 999) : 0;
        const deadline = goal.deadline ? formatDate(goal.deadline) : 'Без дедлайна';

        const item = document.createElement('div');
        item.className = 'goal-item';
        item.dataset.goalId = goal.id;
        item.innerHTML = `
            <div class="goal-info">
                <span class="goal-name">${goal.title}</span>
                <span class="goal-progress">${pct}%</span>
            </div>
            <div class="progress-bar goal-bar">
                <div class="progress-fill" style="width: ${Math.min(pct, 100)}%"></div>
            </div>
            <div class="goal-amount">${formatCurrency(current)} / ${formatCurrency(target)} · ${deadline}</div>
            <div class="goal-actions" style="margin-top: 10px; display: flex; gap: 8px;">
                <button class="button button--small" onclick="editGoal(${goal.id})" style="flex: 1;">
                    <i class="fas fa-edit"></i> Редактировать
                </button>
                <button class="button button--small button--warning" onclick="deleteGoal(${goal.id})" style="flex: 1;">
                    <i class="fas fa-trash"></i> Удалить
                </button>
            </div>
        `;
        container.appendChild(item);
    });
}

function getCategoryMeta(id, type) {
    const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    const found = categories.find(cat => cat.id === Number(id));
    return found || { name: `Категория ${id || '?'}`, icon: 'fas fa-folder' };
}

function updateTransactionsSummary(list) {
    const totalCount = list.length;
    const totalSum = list.reduce((acc, tx) => acc + (Number(tx.amount) || 0), 0);
    document.getElementById('totalTransactions').textContent = totalCount;
    document.getElementById('transactionsSum').textContent = formatCurrency(totalSum);
}

function updateStatsCards(list) {
    const income = list.filter(tx => tx.type === 'income')
        .reduce((acc, tx) => acc + (Number(tx.amount) || 0), 0);
    const expenses = list.filter(tx => tx.type === 'expense')
        .reduce((acc, tx) => acc + (Number(tx.amount) || 0), 0);
    const balance = income - expenses;

    document.getElementById('incomeValue').textContent = formatCurrency(income);
    document.getElementById('expensesValue').textContent = formatCurrency(expenses);
    document.getElementById('totalValue').textContent = formatCurrency(balance);

    document.getElementById('incomeMonth').textContent = formatCurrency(income);
    document.getElementById('expensesMonth').textContent = formatCurrency(expenses);
}

function updateQuickStats(list) {
    const expenseMap = aggregateExpensesByCategory(list);
    const topCategories = expenseMap.slice(0, 4);
    const fallback = [
        { name: 'Продукты', value: 0, icon: 'fas fa-utensils' },
        { name: 'Транспорт', value: 0, icon: 'fas fa-car' },
        { name: 'Жилье', value: 0, icon: 'fas fa-home' },
        { name: 'Покупки', value: 0, icon: 'fas fa-shopping-cart' },
    ];

    const rows = document.querySelectorAll('.quick-stat');
    rows.forEach((row, idx) => {
        const stat = topCategories[idx] || fallback[idx];
        const labelEl = row.querySelector('.stat-label');
        const valueEl = row.querySelector('.stat-value');
        const iconEl = row.querySelector('.stat-icon i');

        if (labelEl) labelEl.textContent = stat.name;
        if (valueEl) valueEl.textContent = formatCurrency(stat.value);
        if (iconEl) iconEl.className = stat.icon;
    });
}

function aggregateExpensesByCategory(list) {
    const expenses = list.filter(tx => tx.type === 'expense');
    const totals = {};

    expenses.forEach(tx => {
        const key = Number(tx.category_id) || 0;
        totals[key] = (totals[key] || 0) + (Number(tx.amount) || 0);
    });

    return Object.entries(totals)
        .map(([id, value]) => {
            const meta = getCategoryMeta(Number(id), 'expense');
            return { id: Number(id), value, name: meta.name, icon: meta.icon };
        })
        .sort((a, b) => b.value - a.value);
}

function updateBudgetIndicator(list) {
    const income = list.filter(tx => tx.type === 'income')
        .reduce((acc, tx) => acc + (Number(tx.amount) || 0), 0);
    const expenses = list.filter(tx => tx.type === 'expense')
        .reduce((acc, tx) => acc + (Number(tx.amount) || 0), 0);

    const budgetLimit = income * 0.7 || 1;
    const usedPercentage = Math.min(Math.round((expenses / budgetLimit) * 100), 999);

    document.getElementById('budgetUsed').textContent = `${usedPercentage}%`;
    document.getElementById('budgetProgress').style.width = `${Math.min(usedPercentage, 100)}%`;

    const indicator = document.getElementById('budgetIndicator');
    if (!indicator) return;

    if (usedPercentage > 100) {
        indicator.innerHTML = '<i class="fas fa-exclamation-circle"></i> Превышен';
        indicator.style.background = 'rgba(244, 67, 54, 0.3)';
    } else if (usedPercentage > 90) {
        indicator.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Близко к лимиту';
        indicator.style.background = 'rgba(255, 152, 0, 0.3)';
    } else {
        indicator.innerHTML = '<i class="fas fa-check-circle"></i> По плану';
        indicator.style.background = 'rgba(76, 175, 80, 0.3)';
    }
}

function updateInsights(list) {
    const insightsEl = document.getElementById('insightsList');
    if (!insightsEl) return;

    const expenses = list.filter(tx => tx.type === 'expense');
    if (!expenses.length) {
        insightsEl.innerHTML = `
            <div class="insight-item">
                <i class="fas fa-info-circle"></i>
                <div class="insight-text">Добавьте операции, чтобы увидеть инсайты</div>
            </div>
        `;
        return;
    }

    const totals = aggregateExpensesByCategory(expenses);
    const top = totals[0];
    const avg = expenses.reduce((acc, tx) => acc + (Number(tx.amount) || 0), 0) / expenses.length;

    insightsEl.innerHTML = `
        <div class="insight-item">
            <i class="${top?.icon || 'fas fa-chart-pie'}"></i>
            <div class="insight-text">Больше всего расходов на "${top?.name}" — ${formatCurrency(top?.value || 0)}</div>
        </div>
        <div class="insight-item">
            <i class="fas fa-balance-scale"></i>
            <div class="insight-text">Средний расход на операцию: ${formatCurrency(avg || 0)}</div>
        </div>
        <div class="insight-item">
            <i class="fas fa-clock"></i>
            <div class="insight-text">Операций за выбранный период: ${expenses.length}</div>
        </div>
    `;
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
            cutout: '70%',
            plugins: { legend: { display: false } }
        }
    });
}

function updateChartData(list) {
    if (!expenseChart) return;
    const categories = aggregateExpensesByCategory(list);

    if (!categories.length) {
        expenseChart.data.labels = ['Нет данных'];
        expenseChart.data.datasets[0].data = [1];
        expenseChart.update();
        updateChartLegend([{ name: 'Нет данных', value: 0 }]);
        return;
    }

    expenseChart.data.labels = categories.map(c => c.name);
    expenseChart.data.datasets[0].data = categories.map(c => c.value);
    expenseChart.update();
    updateChartLegend(categories);
}

function updateChartLegend(categories) {
    const legendContainer = document.getElementById('chartLegend');
    if (!legendContainer) return;
    legendContainer.innerHTML = '';

    categories.forEach((cat, idx) => {
        const color = expenseChart.data.datasets[0].backgroundColor[idx % expenseChart.data.datasets[0].backgroundColor.length];
        const item = document.createElement('div');
        item.className = 'legend-item';
        item.innerHTML = `
            <div class="legend-color" style="background-color: ${color}"></div>
            <span class="legend-label">${cat.name}</span>
            <span class="legend-value">${formatCurrency(cat.value)}</span>
        `;
        legendContainer.appendChild(item);
    });
}

function openTransactionModal(type = 'expense') {
    const modal = document.getElementById('modalOverlay');
    if (!modal) return;
    modal.style.display = 'flex';

    document.querySelectorAll('.type-option').forEach(option => {
        option.classList.toggle('active', option.dataset.type === type);
    });

    populateCategories(type);

    document.getElementById('amountInput').value = '';
    document.getElementById('descriptionInput').value = '';
    document.getElementById('dateInput').valueAsDate = new Date();
}

function populateCategories(type) {
    const select = document.getElementById('categorySelect');
    if (!select) return;
    const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

    select.innerHTML = '<option value="" disabled selected>Выберите категорию</option>';
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = `${cat.name}`;
        select.appendChild(option);
    });
}

function closeModal() {
    const modal = document.getElementById('modalOverlay');
    if (modal) modal.style.display = 'none';
}

let editingGoalId = null;

function openGoalModal(goalId = null) {
    const overlay = document.getElementById('goalModalOverlay');
    if (!overlay) return;
    overlay.style.display = 'flex';
    editingGoalId = goalId;
    
    const titleEl = document.getElementById('goalTitle');
    const targetEl = document.getElementById('goalTarget');
    const currentEl = document.getElementById('goalCurrent');
    const deadlineEl = document.getElementById('goalDeadline');
    const modalTitle = document.querySelector('#goalModalOverlay .modal-title');
    
    if (goalId) {
        const goal = goals.find(g => g.id === goalId);
        if (goal) {
            titleEl.value = goal.title || '';
            targetEl.value = goal.target_amount || '';
            currentEl.value = goal.current_amount || '';
            deadlineEl.value = goal.deadline ? goal.deadline.split('T')[0] : '';
            if (modalTitle) modalTitle.textContent = 'Редактировать цель';
        }
    } else {
        titleEl.value = '';
        targetEl.value = '';
        currentEl.value = '';
        deadlineEl.value = '';
        if (modalTitle) modalTitle.textContent = 'Новая финансовая цель';
    }
    
    const today = new Date().toISOString().split('T')[0];
    deadlineEl.setAttribute('min', today);
}

function closeGoalModal() {
    const overlay = document.getElementById('goalModalOverlay');
    if (overlay) overlay.style.display = 'none';
}

async function saveGoal() {
    const title = document.getElementById('goalTitle').value.trim();
    const target = parseFloat(document.getElementById('goalTarget').value) || 0;
    const current = parseFloat(document.getElementById('goalCurrent').value) || 0;
    const deadline = document.getElementById('goalDeadline').value || null;

    if (!title) {
        alert('Введите название цели');
        return;
    }
    if (target <= 0) {
        alert('Укажите целевую сумму больше 0');
        return;
    }
    
    if (deadline) {
        const deadlineDate = new Date(deadline);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (deadlineDate < today) {
            alert('Дедлайн не может быть в прошлом');
            return;
        }
    }

    const token = localStorage.getItem('token');
    if (!token) return redirectToAuth(true);

    try {
        const url = editingGoalId ? `${API_URL}/goals/${editingGoalId}` : `${API_URL}/goals`;
        const method = editingGoalId ? 'PUT' : 'POST';
        
        const res = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                title,
                target_amount: target,
                current_amount: current,
                deadline
            })
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            alert(data.error || 'Не удалось сохранить цель');
            return;
        }

        closeGoalModal();
        await loadGoals();
    } catch (err) {
        console.error('Ошибка сохранения цели', err);
        alert('Ошибка сохранения цели');
    }
}

async function editGoal(goalId) {
    openGoalModal(goalId);
}

async function deleteGoal(goalId) {
    if (!confirm('Вы уверены, что хотите удалить эту цель?')) return;
    
    const token = localStorage.getItem('token');
    if (!token) return redirectToAuth(true);

    try {
        const res = await fetch(`${API_URL}/goals/${goalId}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            alert(data.error || 'Не удалось удалить цель');
            return;
        }

        await loadGoals();
    } catch (err) {
        console.error('Ошибка удаления цели', err);
        alert('Ошибка удаления цели');
    }
}

async function saveTransaction() {
    const type = document.querySelector('.type-option.active')?.dataset.type || 'expense';
    const amount = parseFloat(document.getElementById('amountInput').value);
    const categoryId = Number(document.getElementById('categorySelect').value);
    const description = document.getElementById('descriptionInput').value;
    const date = document.getElementById('dateInput').value;

    if (!amount || amount <= 0) {
        alert('Пожалуйста, введите корректную сумму');
        return;
    }
    if (!categoryId) {
        alert('Выберите категорию');
        return;
    }

    const payload = {
        amount,
        category_id: categoryId,
        description,
        transaction_date: date || new Date().toISOString().split('T')[0]
    };

    const endpoint = type === 'income' ? '/transactions/income' : '/transactions/expenses';
    const token = localStorage.getItem('token');
    if (!token) {
        redirectToAuth(true);
        return;
    }

    try {
        const res = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            alert(data.error || 'Не удалось сохранить операцию');
            return;
        }

        closeModal();
        await loadTransactions();
    } catch (err) {
        console.error('Ошибка сохранения операции', err);
        alert('Ошибка при сохранении операции');
    }
}

async function resetStatistics() {
    if (!confirm('Сбросить все операции?')) return;
    const token = localStorage.getItem('token');
    if (!token) return redirectToAuth(true);

    try {
        const res = await fetch(`${API_URL}/transactions/reset`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            alert(data.error || 'Не удалось сбросить данные');
            return;
        }
        await loadTransactions();
    } catch (err) {
        console.error('Ошибка сброса', err);
        alert('Ошибка при сбросе статистики');
    }
}

async function exportData() {
    const token = localStorage.getItem('token');
    if (!token) return redirectToAuth(true);

    try {
        const res = await fetch(`${API_URL}/transactions/export`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            alert(data.error || 'Не удалось экспортировать данные');
            return;
        }

        const data = await res.json();
        
        let csv = '\uFEFF';
        csv += 'Дата,Тип,Категория,Описание,Сумма\n';
        
        data.forEach(tx => {
            const date = tx.transaction_date ? new Date(tx.transaction_date).toLocaleDateString('ru-RU') : '';
            const type = tx.type === 'income' ? 'Доход' : 'Расход';
            const category = getCategoryMeta(tx.category_id, tx.type).name;
            const description = (tx.description || '').replace(/"/g, '""');
            const amount = Number(tx.amount) || 0;
            
            csv += `"${date}","${type}","${category}","${description}","${amount}"\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    } catch (err) {
        console.error('Ошибка экспорта', err);
        alert('Ошибка экспорта данных');
    }
}

function toggleFilter() {
    const filterOptions = document.getElementById('filterOptions');
    filterOptions?.classList.toggle('show');
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount || 0);
}

function formatDate(dateString) {
    const date = dateString ? new Date(dateString) : new Date();
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}