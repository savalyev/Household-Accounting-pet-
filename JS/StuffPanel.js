const API_URL = import.meta.env.VITE_API_URL;

// Проверка авторизации перед загрузкой страницы
(function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.replace('Authorization2.html');
    }
})();

async function validateToken(token) {
    try {
        const res = await fetch(`${API_URL}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        return res.ok;
    } catch {
        return false;
    }
}

// Инициализация панели администратора
document.addEventListener('DOMContentLoaded', async function() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.replace('Authorization2.html');
        return;
    }

    const isValid = await validateToken(token);
    if (!isValid) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('currentUser');
        window.location.replace('Authorization2.html');
        return;
    }

    // Переключение вкладок
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            
            // Удаляем активный класс у всех кнопок и содержимого
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Добавляем активный класс текущей кнопке и соответствующему содержимому
            button.classList.add('active');
            document.getElementById(`${tabId}Tab`).classList.add('active');
            
            // Загружаем данные для активной вкладки
            loadTabData(tabId);
        });
    });
    
    // Загрузка данных при первом открытии
    await loadTabData('users');
    await updateAdminStats();
    
    // Инициализация графиков
    initCharts();
    
    // Загрузка данных системы
    loadMockData();
    
    // Обработчики событий
    setupEventListeners();
});

// Загрузка данных для вкладки
async function loadTabData(tabId) {
    switch(tabId) {
        case 'users':
            await loadUsersData();
            break;
        case 'reports':
            await loadReportsData();
            break;
        case 'statistics':
            await updateCharts();
            break;
        case 'logs':
            await loadLogsData();
            break;
    }
}

// Обновление статистики администратора
async function updateAdminStats() {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/admin/stats`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!res.ok) {
            throw new Error('Ошибка загрузки статистики');
        }
        
        const stats = await res.json();
        document.getElementById('totalUsers').textContent = stats.totalUsers || 0;
        document.getElementById('activeToday').textContent = stats.activeToday || 0;
        document.getElementById('newReports').textContent = stats.newReports || 0;
        document.getElementById('blockedUsers').textContent = stats.blockedUsers || 0;
        
        document.getElementById('usersCount').textContent = stats.totalUsers || 0;
        document.getElementById('reportsCount').textContent = stats.newReports || 0;
    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
        showNotification('Ошибка загрузки статистики', 'error');
    }
}

// Загрузка данных пользователей
async function loadUsersData() {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/admin/users`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!res.ok) {
            throw new Error('Ошибка загрузки пользователей');
        }
        
        const users = await res.json();
        const tableBody = document.getElementById('usersTableBody');
        tableBody.innerHTML = '';
        
        users.forEach(user => {
            const row = document.createElement('tr');
            const status = user.is_active ? 'active' : 'banned';
            const statusClass = `status-${status}`;
            const role = user.role || 'user';
            const roleClass = `role-${role}`;
            
            // Форматируем дату регистрации
            const regDate = user.created_at 
                ? new Date(user.created_at).toLocaleDateString('ru-RU')
                : 'Не указана';
            
            row.innerHTML = `
                <td><input type="checkbox" class="user-checkbox" data-id="${user.id}"></td>
                <td>#${user.id}</td>
                <td>${user.name || 'Не указано'}</td>
                <td>${user.email}</td>
                <td>${regDate}</td>
                <td><span class="${statusClass}">${getStatusText(status)}</span></td>
                <td><span class="${roleClass}">${getRoleText(role)}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn view" data-id="${user.id}" title="Просмотр">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn edit" data-id="${user.id}" title="Редактировать">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn ban" data-id="${user.id}" data-active="${user.is_active}" title="${user.is_active ? 'Заблокировать' : 'Разблокировать'}">
                            <i class="fas ${user.is_active ? 'fa-ban' : 'fa-unlock'}"></i>
                        </button>
                        <button class="action-btn delete" data-id="${user.id}" title="Удалить">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            
            tableBody.appendChild(row);
        });
        
        document.getElementById('shownUsers').textContent = users.length;
        document.getElementById('totalUsersCount').textContent = users.length;
        
        // Обработчики для чекбоксов
        const selectAllCheckbox = document.getElementById('selectAllUsers');
        if (selectAllCheckbox) {
            selectAllCheckbox.onchange = function(e) {
                const checkboxes = document.querySelectorAll('.user-checkbox');
                checkboxes.forEach(checkbox => {
                    checkbox.checked = e.target.checked;
                });
            };
        }
    } catch (error) {
        console.error('Ошибка загрузки пользователей:', error);
        showNotification('Ошибка загрузки пользователей', 'error');
    }
}

// Загрузка данных репортов
async function loadReportsData() {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/admin/reports`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!res.ok) {
            throw new Error('Ошибка загрузки репортов');
        }
        
        const reports = await res.json();
        const tableBody = document.getElementById('reportsTableBody');
        tableBody.innerHTML = '';
        selectedReportId = null;
        
        reports.forEach(report => {
            const row = document.createElement('tr');
            row.dataset.reportId = report.id;
            // Маппинг статусов из БД в классы CSS
            const statusMap = {
                'Новое': 'pending',
                'В обработке': 'in_progress',
                'Решено': 'resolved',
                'Отклонено': 'rejected'
            };
            const statusClass = `status-${statusMap[report.report_status] || 'pending'}`;
            
            // Определяем приоритет на основе статуса (можно улучшить, добавив поле priority в БД)
            const priority = report.report_status === 'Новое' ? 'high' : 
                           report.report_status === 'В обработке' ? 'medium' : 'low';
            const priorityClass = `priority-${priority}`;
            
            // Форматируем дату
            const date = report.created_at 
                ? new Date(report.created_at).toLocaleString('ru-RU')
                : 'Не указана';
            
            row.innerHTML = `
                <td>#${report.id}</td>
                <td>${report.title || 'Без названия'}</td>
                <td>${report.user_name || report.user_email || 'Неизвестно'}</td>
                <td>Система</td>
                <td>${date}</td>
                <td><span class="${statusClass}">${report.report_status}</span></td>
                <td><span class="${priorityClass}">${getPriorityText(priority)}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn view view-report" data-id="${report.id}" title="Просмотр">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn edit" data-id="${report.id}" title="Изменить статус">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" data-id="${report.id}" title="Удалить">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            
            row.addEventListener('click', () => selectReportRow(row));
            tableBody.appendChild(row);
        });
        
        document.getElementById('shownReports').textContent = reports.length;
        document.getElementById('totalReportsCount').textContent = reports.length;
    } catch (error) {
        console.error('Ошибка загрузки репортов:', error);
        showNotification('Ошибка загрузки репортов', 'error');
    }
}

// Загрузка логов
async function loadLogsData() {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/admin/logs`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!res.ok) {
            throw new Error('Ошибка загрузки логов');
        }
        
        const logs = await res.json();
        allLogs = logs;
        currentLogLimit = 50;
        filterLogs();
    } catch (error) {
        console.error('Ошибка загрузки логов:', error);
        showNotification('Ошибка загрузки логов', 'error');
    }
}

// Инициализация графиков
let registrationsChart, activityChart;
let selectedReportId = null;

function initCharts() {
    const registrationsCtx = document.getElementById('registrationsChart').getContext('2d');
    const activityCtx = document.getElementById('activityChart').getContext('2d');
    
    // График регистраций
    registrationsChart = new Chart(registrationsCtx, {
        type: 'line',
        data: {
            labels: ['1 мар', '3 мар', '5 мар', '7 мар', '9 мар', '11 мар', '13 мар', '15 мар'],
            datasets: [{
                label: 'Регистрации',
                data: [12, 19, 15, 25, 22, 30, 28, 35],
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#ffffff'
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#ffffff'
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#ffffff'
                    }
                }
            }
        }
    });
    
    // График активности
    activityChart = new Chart(activityCtx, {
        type: 'bar',
        data: {
            labels: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
            datasets: [{
                label: 'Активность',
                data: [65, 59, 80, 81, 56, 55, 40],
                backgroundColor: 'rgba(118, 75, 162, 0.7)',
                borderColor: 'rgba(118, 75, 162, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#ffffff'
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#ffffff'
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#ffffff'
                    }
                }
            }
        }
    });
    
    // Обновление распределения по ролям
    updateRolesDistribution();
    
    // Обновление топ действий
    updateTopActions();
}

async function updateCharts() {
    try {
        const token = localStorage.getItem('token');
        const period = document.getElementById('statsPeriod')?.value || 30;
        const res = await fetch(`${API_URL}/admin/stats?period=${period}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!res.ok) {
            throw new Error('Ошибка загрузки статистики');
        }
        
        const stats = await res.json();
        
        // Обновляем график регистраций
        if (registrationsChart && stats.registrations) {
            const labels = stats.registrations.map(r => {
                const date = new Date(r.date);
                return `${date.getDate()} ${date.toLocaleDateString('ru-RU', { month: 'short' })}`;
            });
            const data = stats.registrations.map(r => r.count);
            
            registrationsChart.data.labels = labels;
            registrationsChart.data.datasets[0].data = data;
            registrationsChart.update();
        }
        
        // Обновляем график активности
        if (activityChart && stats.activityByDay) {
            activityChart.data.datasets[0].data = stats.activityByDay;
            activityChart.update();
        }
        
        // Обновляем распределение по ролям
        if (stats.rolesDistribution) {
            updateRolesDistribution(stats.rolesDistribution);
        }
    } catch (error) {
        console.error('Ошибка обновления графиков:', error);
        showNotification('Ошибка обновления графиков', 'error');
    }
}

function updateRolesDistribution(rolesDistribution) {
    const distributionContainer = document.getElementById('rolesDistribution');
    if (!distributionContainer) return;
    
    distributionContainer.innerHTML = '';
    
    // Проверяем, что rolesDistribution существует и является объектом
    if (!rolesDistribution || typeof rolesDistribution !== 'object') {
        return;
    }
    
    const roleNames = {
        'user': 'Пользователи',
        'moderator': 'Модераторы',
        'admin': 'Администраторы'
    };
    
    const roleColors = {
        'user': '#2196f3',
        'moderator': '#9c27b0',
        'admin': '#ff9800'
    };
    
    try {
        Object.keys(rolesDistribution).forEach(role => {
            const roleItem = document.createElement('div');
            roleItem.className = 'role-item';
            roleItem.innerHTML = `
                <span class="role-name">${roleNames[role] || role}</span>
                <span class="role-count">${rolesDistribution[role]}</span>
            `;
            distributionContainer.appendChild(roleItem);
        });
    } catch (error) {
        console.error('Ошибка обновления распределения ролей:', error);
    }
}

function updateTopActions() {
    const actionsContainer = document.getElementById('topActions');
    actionsContainer.innerHTML = '';
    
    const actions = [
        {name: 'Вход в систему', count: 1245},
        {name: 'Просмотр транзакций', count: 876},
        {name: 'Добавление расходов', count: 543},
        {name: 'Редактирование профиля', count: 234},
        {name: 'Создание отчетов', count: 123}
    ];
    
    actions.forEach(action => {
        const actionItem = document.createElement('div');
        actionItem.className = 'action-item';
        actionItem.innerHTML = `
            <span class="action-name">${action.name}</span>
            <span class="action-count">${action.count}</span>
        `;
        actionsContainer.appendChild(actionItem);
    });
}

// Вспомогательные функции
function getStatusText(status) {
    const statusMap = {
        'active': 'Активен',
        'inactive': 'Неактивен',
        'banned': 'Заблокирован'
    };
    return statusMap[status] || status;
}

function getRoleText(role) {
    const roleMap = {
        'user': 'Пользователь',
        'admin': 'Администратор',
        'moderator': 'Модератор'
    };
    return roleMap[role] || role;
}

function getReportStatusText(status) {
    const statusMap = {
        'pending': 'В ожидании',
        'in_progress': 'В обработке',
        'resolved': 'Решено',
        'rejected': 'Отклонено'
    };
    return statusMap[status] || status;
}

function getPriorityText(priority) {
    const priorityMap = {
        'low': 'Низкий',
        'medium': 'Средний',
        'high': 'Высокий'
    };
    return priorityMap[priority] || priority;
}

function selectReportRow(row) {
    const body = document.getElementById('reportsTableBody');
    if (!body || !row) return;
    body.querySelectorAll('tr').forEach(r => r.classList.remove('selected-row'));
    row.classList.add('selected-row');
    selectedReportId = row.dataset.reportId || null;
}

// Обработчики событий
function setupEventListeners() {
    // Модальные окна
    const modals = document.querySelectorAll('.modal');
    const closeButtons = document.querySelectorAll('.modal-close');
    
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            modals.forEach(modal => modal.classList.remove('active'));
        });
    });
    
    // Закрытие модальных окон при клике вне их
    modals.forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
    
    // Просмотр деталей пользователя
    document.addEventListener('click', (e) => {
        if (e.target.closest('.action-btn.view') && !e.target.closest('.view-report')) {
            const userId = e.target.closest('.action-btn.view').getAttribute('data-id');
            showUserDetails(userId);
        }
        
        if (e.target.closest('.view-report')) {
            const reportId = e.target.closest('.view-report').getAttribute('data-id');
            showReportDetails(reportId);
        }
    });
    
    // Блокировка/разблокировка пользователя
    document.addEventListener('click', async (e) => {
        if (e.target.closest('.action-btn.ban')) {
            const button = e.target.closest('.action-btn.ban');
            const userId = button.getAttribute('data-id');
            const isActive = button.getAttribute('data-active') === 'true';
            const newStatus = !isActive;
            
            const action = newStatus ? 'разблокировать' : 'заблокировать';
            if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} пользователя?`)) {
                return;
            }
            
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${API_URL}/admin/users/${userId}/status`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ is_active: newStatus })
                });
                
                if (!res.ok) {
                    throw new Error('Ошибка изменения статуса пользователя');
                }
                
                button.setAttribute('data-active', newStatus.toString());
                const icon = button.querySelector('i');
                if (newStatus) {
                    button.title = 'Заблокировать';
                    icon.classList.remove('fa-unlock');
                    icon.classList.add('fa-ban');
                    showNotification('Пользователь разблокирован', 'success');
                } else {
                    button.title = 'Разблокировать';
                    icon.classList.remove('fa-ban');
                    icon.classList.add('fa-unlock');
                    showNotification('Пользователь заблокирован', 'success');
                }
                
                // Обновляем статус в таблице
                const row = button.closest('tr');
                const statusCell = row.querySelector('td:nth-child(6) span');
                statusCell.className = `status-${newStatus ? 'active' : 'banned'}`;
                statusCell.textContent = getStatusText(newStatus ? 'active' : 'banned');
                
                // Обновляем статистику
                updateAdminStats();
            } catch (error) {
                console.error('Ошибка изменения статуса:', error);
                showNotification('Ошибка изменения статуса пользователя', 'error');
            }
        }
    });
    
    // Удаление пользователя или репорта
    document.addEventListener('click', async (e) => {
        if (e.target.closest('.action-btn.delete')) {
            const element = e.target.closest('.action-btn.delete');
            const id = element.getAttribute('data-id');
            const isReport = element.closest('tr').querySelector('.view-report');
            
            if (!confirm('Вы уверены, что хотите удалить эту запись?')) {
                return;
            }
            
            try {
                const token = localStorage.getItem('token');
                const endpoint = isReport 
                    ? `${API_URL}/admin/reports/${id}`
                    : `${API_URL}/admin/users/${id}`;
                
                const res = await fetch(endpoint, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (!res.ok) {
                    throw new Error('Ошибка удаления записи');
                }
                
                element.closest('tr').style.opacity = '0.5';
                setTimeout(() => {
                    element.closest('tr').remove();
                    showNotification('Запись удалена', 'success');
                    
                    // Обновляем статистику
                    if (!isReport) {
                        updateAdminStats();
                        loadUsersData();
                    } else {
                        if (selectedReportId === id) {
                            selectedReportId = null;
                        }
                        loadReportsData();
                    }
                }, 300);
            } catch (error) {
                console.error('Ошибка удаления:', error);
                showNotification('Ошибка удаления записи', 'error');
            }
        }
    });
    
    // Кнопки быстрых действий
    const exportDataBtn = document.getElementById('exportData');
    if (exportDataBtn) {
        exportDataBtn.addEventListener('click', async () => {
            await exportAdminData();
        });
    }
    
    const backToMainBtn = document.getElementById('backToMain');
    if (backToMainBtn) {
        backToMainBtn.addEventListener('click', () => {
            window.location.href = 'MainMenu.html';
        });
    }
    
    const logoutAdminBtn = document.getElementById('logoutAdmin');
    if (logoutAdminBtn) {
        logoutAdminBtn.addEventListener('click', () => {
            if (confirm('Выйти из панели администратора?')) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                localStorage.removeItem('currentUser');
                showNotification('Выход выполнен', 'info');
                setTimeout(() => {
                    window.location.href = 'Authorization2.html';
                }, 1000);
            }
        });
    }
    
    // Обновление репортов
    const refreshReportsBtn = document.getElementById('refreshReports');
    if (refreshReportsBtn) {
        refreshReportsBtn.addEventListener('click', () => {
            loadReportsData();
            updateAdminStats();
            showNotification('Репорты обновлены', 'success');
        });
    }
    
    // Фильтр репортов
    const reportFilter = document.getElementById('reportFilter');
    if (reportFilter) {
        reportFilter.addEventListener('change', (e) => {
            const filterValue = e.target.value;
            const rows = document.querySelectorAll('#reportsTableBody tr');
            rows.forEach(row => {
                if (filterValue === 'all') {
                    row.style.display = '';
                } else {
                    const statusCell = row.querySelector('td:nth-child(6) span');
                    const statusMap = {
                        'pending': 'Новое',
                        'in_progress': 'В обработке',
                        'resolved': 'Решено',
                        'rejected': 'Отклонено'
                    };
                    const expectedStatus = statusMap[filterValue];
                    row.style.display = statusCell.textContent === expectedStatus ? '' : 'none';
                }
            });
            showNotification(`Фильтр применен: ${e.target.options[e.target.selectedIndex].text}`, 'info');
        });
    }
    
    // Поиск пользователей
    const userSearch = document.getElementById('userSearch');
    if (userSearch) {
        userSearch.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const rows = document.querySelectorAll('#usersTableBody tr');
            
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchTerm) ? '' : 'none';
            });
        });
    }

    // Редактирование роли пользователя или статуса репорта
    document.addEventListener('click', (e) => {
        if (e.target.closest('.action-btn.edit')) {
            const element = e.target.closest('.action-btn.edit');
            const id = element.getAttribute('data-id');
            const isReport = element.closest('tr').querySelector('.view-report');
            
            if (isReport) {
                // Редактирование статуса репорта
                showEditReportStatusModal(id);
            } else {
                // Редактирование роли пользователя
                showEditRoleModal(id);
            }
        }
    });

    // Форма изменения роли
    const editRoleForm = document.getElementById('editRoleForm');
    if (editRoleForm) {
        editRoleForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userId = document.getElementById('editRoleUserId').value;
            const role = document.getElementById('editRoleSelect').value;
            
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${API_URL}/admin/users/${userId}/role`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ role })
                });
                
                if (!res.ok) {
                    throw new Error('Ошибка изменения роли');
                }
                
                showNotification('Роль пользователя изменена', 'success');
                document.getElementById('editRoleModal').classList.remove('active');
                loadUsersData();
                updateAdminStats();
            } catch (error) {
                console.error('Ошибка изменения роли:', error);
                showNotification('Ошибка изменения роли пользователя', 'error');
            }
        });
    }

    const selectAllUsers = document.getElementById('selectAllUsers');
    if (selectAllUsers) {
        selectAllUsers.addEventListener('change', (e) => {
            const checkboxes = document.querySelectorAll('.user-checkbox');
            checkboxes.forEach(checkbox => {
                checkbox.checked = e.target.checked;
            });
        });
    }

    const addUserBtn = document.getElementById('addUserBtn');
    if (addUserBtn) {
        addUserBtn.addEventListener('click', () => {
            showNotification('Функция добавления пользователя будет реализована позже', 'info');
        });
    }


    const logLevel = document.getElementById('logLevel');
    if (logLevel) {
        logLevel.addEventListener('change', () => {
            filterLogs();
        });
    }

    const logDate = document.getElementById('logDate');
    if (logDate) {
        logDate.addEventListener('change', () => {
            filterLogs();
        });
    }

    const loadMoreLogsBtn = document.getElementById('loadMoreLogs');
    if (loadMoreLogsBtn) {
        loadMoreLogsBtn.addEventListener('click', () => {
            loadMoreLogs();
        });
    }

    const clearLogsBtn = document.getElementById('clearLogs');
    if (clearLogsBtn) {
        clearLogsBtn.addEventListener('click', () => {
            if (confirm('Очистить все логи? Это действие нельзя отменить.')) {
                clearLogs();
            }
        });
    }

    const statsPeriod = document.getElementById('statsPeriod');
    if (statsPeriod) {
        statsPeriod.addEventListener('change', () => {
            updateCharts();
        });
    }

    const banUserBtn = document.getElementById('banUserBtn');
    if (banUserBtn) {
        banUserBtn.addEventListener('click', () => {
            const selected = getSelectedUsers();
            if (selected.length === 0) {
                showNotification('Выберите пользователей для блокировки', 'warning');
                return;
            }
            showBulkActionModal('block', selected);
        });
    }

    const changeRoleBtn = document.getElementById('changeRoleBtn');
    if (changeRoleBtn) {
        changeRoleBtn.addEventListener('click', () => {
            const selected = getSelectedUsers();
            if (selected.length === 0) {
                showNotification('Выберите пользователей для изменения роли', 'warning');
                return;
            }
            if (selected.length === 1) {
                showEditRoleModal(selected[0]);
            } else {
                showNotification('Для массового изменения роли выберите одного пользователя', 'info');
            }
        });
    }

    const viewReportBtn = document.getElementById('viewReportBtn');
    if (viewReportBtn) {
        viewReportBtn.addEventListener('click', () => {
            if (!selectedReportId) {
                showNotification('Выберите репорт в таблице для просмотра', 'warning');
                return;
            }
            showReportDetails(selectedReportId);
        });
    }

    const sendNotificationBtn = document.getElementById('sendNotificationBtn');
    if (sendNotificationBtn) {
        sendNotificationBtn.addEventListener('click', () => {
            showNotification('Функция отправки уведомлений будет реализована позже', 'info');
        });
    }

    const bulkActionCancel = document.getElementById('bulkActionCancel');
    const bulkActionConfirm = document.getElementById('bulkActionConfirm');
    if (bulkActionCancel) {
        bulkActionCancel.addEventListener('click', () => {
            document.getElementById('bulkActionModal').classList.remove('active');
        });
    }
}

async function showUserDetails(userId) {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/admin/users/${userId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!res.ok) {
            throw new Error('Ошибка загрузки данных пользователя');
        }
        
        const userData = await res.json();
        const modal = document.getElementById('userDetailsModal');
        const content = document.getElementById('userDetailsContent');
        
        const registrationDate = userData.created_at 
            ? new Date(userData.created_at).toLocaleDateString('ru-RU')
            : 'Не указана';
        const lastLogin = userData.last_login_at 
            ? new Date(userData.last_login_at).toLocaleString('ru-RU')
            : 'Никогда';
        const status = userData.is_active ? 'Активен' : 'Заблокирован';
        const statusClass = userData.is_active ? 'status-active' : 'status-banned';
        const role = getRoleText(userData.role || 'user');
        
        const stats = userData.stats || {};
        const totalSpent = stats.totalExpenses || 0;
        const transactions = stats.transactionsCount || 0;
        const reports = stats.reportsCount || 0;
        
        content.innerHTML = `
            <div class="user-details-grid">
                <div class="detail-item">
                    <span class="detail-label">ID:</span>
                    <span class="detail-value">#${userData.id}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Имя пользователя:</span>
                    <span class="detail-value">${userData.name || 'Не указано'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Email:</span>
                    <span class="detail-value">${userData.email}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Дата регистрации:</span>
                    <span class="detail-value">${registrationDate}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Последний вход:</span>
                    <span class="detail-value">${lastLogin}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Статус:</span>
                    <span class="detail-value ${statusClass}">${status}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Роль:</span>
                    <span class="detail-value">${role}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Транзакций:</span>
                    <span class="detail-value">${transactions}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Всего потрачено:</span>
                    <span class="detail-value">${totalSpent.toLocaleString('ru-RU')} руб</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Репортов:</span>
                    <span class="detail-value">${reports}</span>
                </div>
            </div>
        `;
        
        modal.classList.add('active');
    } catch (error) {
        console.error('Ошибка загрузки данных пользователя:', error);
        showNotification('Ошибка загрузки данных пользователя', 'error');
    }
}

// Показать детали репорта (для просмотра)
async function showReportDetails(reportId) {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/admin/reports/${reportId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!res.ok) {
            throw new Error('Ошибка загрузки данных репорта');
        }
        
        const reportData = await res.json();
        const modal = document.getElementById('reportDetailsModal');
        const content = document.getElementById('reportDetailsContent');
        
        const date = reportData.created_at 
            ? new Date(reportData.created_at).toLocaleString('ru-RU')
            : 'Не указана';
        
        const statusMap = {
            'Новое': 'pending',
            'В обработке': 'in_progress',
            'Решено': 'resolved',
            'Отклонено': 'rejected'
        };
        const statusClass = `status-${statusMap[reportData.report_status] || 'pending'}`;
        
        content.innerHTML = `
            <div class="report-details">
                <div class="detail-row">
                    <span class="detail-label">ID репорта:</span>
                    <span class="detail-value">#${reportData.id}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Название:</span>
                    <span class="detail-value">${reportData.title || 'Без названия'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Отправитель:</span>
                    <span class="detail-value">${reportData.user_name || reportData.user_email || 'Неизвестно'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Дата и время:</span>
                    <span class="detail-value">${date}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Статус:</span>
                    <span class="detail-value ${statusClass}">${reportData.report_status}</span>
                </div>
                <div class="detail-row full-width">
                    <span class="detail-label">Описание:</span>
                    <div class="detail-value multiline">${reportData.description || 'Описание отсутствует'}</div>
                </div>
            </div>
        `;
        
        // Показываем footer с кнопками при просмотре
        const modalFooter = modal.querySelector('.modal-footer');
        if (modalFooter) {
            modalFooter.style.display = 'flex';
        }
        
        modal.classList.add('active');
        
        // Обработчики для кнопок в модальном окне репорта
        const markResolvedBtn = document.getElementById('markResolvedBtn');
        const markRejectedBtn = document.getElementById('markRejectedBtn');
        
        if (markResolvedBtn) {
            markResolvedBtn.onclick = async () => {
                try {
                    const updateRes = await fetch(`${API_URL}/admin/reports/${reportId}/status`, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ status: 'Решено' })
                    });
                    
                    if (!updateRes.ok) {
                        throw new Error('Ошибка обновления статуса');
                    }
                    
                    showNotification('Репорт отмечен как решенный', 'success');
                    modal.classList.remove('active');
                    loadReportsData();
                    updateAdminStats();
                } catch (error) {
                    console.error('Ошибка обновления статуса:', error);
                    showNotification('Ошибка обновления статуса репорта', 'error');
                }
            };
        }
        
        if (markRejectedBtn) {
            markRejectedBtn.onclick = async () => {
                try {
                    const updateRes = await fetch(`${API_URL}/admin/reports/${reportId}/status`, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ status: 'Отклонено' })
                    });
                    
                    if (!updateRes.ok) {
                        throw new Error('Ошибка обновления статуса');
                    }
                    
                    showNotification('Репорт отклонен', 'warning');
                    modal.classList.remove('active');
                    loadReportsData();
                    updateAdminStats();
                } catch (error) {
                    console.error('Ошибка обновления статуса:', error);
                    showNotification('Ошибка обновления статуса репорта', 'error');
                }
            };
        }
    } catch (error) {
        console.error('Ошибка загрузки данных репорта:', error);
        showNotification('Ошибка загрузки данных репорта', 'error');
    }
}

// Уведомления
function showNotification(message, type = 'info') {
    // Создаем элемент уведомления
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span class="notification-message">${message}</span>
        <button class="notification-close">&times;</button>
    `;
    
    // Стили для уведомления
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#4caf50' : type === 'warning' ? '#ff9800' : type === 'error' ? '#f44336' : '#2196f3'};
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-width: 300px;
        animation: slideIn 0.3s ease;
    `;
    
    // Анимация появления
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        .notification-close {
            background: none;
            border: none;
            color: white;
            font-size: 20px;
            cursor: pointer;
            margin-left: 15px;
            line-height: 1;
        }
    `;
    document.head.appendChild(style);
    
    // Кнопка закрытия
    notification.querySelector('.notification-close').onclick = () => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    };
    
    document.body.appendChild(notification);
    
    // Автоматическое закрытие через 5 секунд
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// Загрузка данных системы
function loadMockData() {
    // Обновляем информацию о системе
    updateSystemInfo();
    
    // Обновляем статистику каждые 30 секунд
    setInterval(() => {
        updateAdminStats();
    }, 30000);
}

function updateSystemInfo() {
    // Текущая дата для "последнего обновления"
    const now = new Date();
    const formattedDate = `${now.getDate().toString().padStart(2, '0')}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getFullYear()}`;
    const lastUpdateEl = document.getElementById('lastUpdate');
    if (lastUpdateEl) {
        lastUpdateEl.textContent = formattedDate;
    }
    
    // Время работы (можно улучшить, добавив поле в БД)
    const days = Math.floor(Math.random() * 10) + 1;
    const hours = Math.floor(Math.random() * 24);
    const uptimeEl = document.getElementById('uptime');
    if (uptimeEl) {
        uptimeEl.textContent = `${days}д ${hours}ч`;
    }
    
    // Использование памяти (можно улучшить, добавив мониторинг)
    const memory = 60 + Math.random() * 10;
    const memoryUsageEl = document.getElementById('memoryUsage');
    if (memoryUsageEl) {
        memoryUsageEl.textContent = `${Math.round(memory)}%`;
    }
}

// Показать модальное окно редактирования роли
async function showEditRoleModal(userId) {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/admin/users/${userId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!res.ok) {
            throw new Error('Ошибка загрузки данных пользователя');
        }
        
        const userData = await res.json();
        const modal = document.getElementById('editRoleModal');
        document.getElementById('editRoleUserId').value = userId;
        document.getElementById('editRoleSelect').value = userData.role || 'user';
        modal.classList.add('active');
    } catch (error) {
        console.error('Ошибка загрузки данных пользователя:', error);
        showNotification('Ошибка загрузки данных пользователя', 'error');
    }
}

// Показать модальное окно редактирования статуса репорта
async function showEditReportStatusModal(reportId) {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/admin/reports/${reportId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!res.ok) {
            throw new Error('Ошибка загрузки данных репорта');
        }
        
        const reportData = await res.json();
        const modal = document.getElementById('reportDetailsModal');
        const content = document.getElementById('reportDetailsContent');
        
        const date = reportData.created_at 
            ? new Date(reportData.created_at).toLocaleString('ru-RU')
            : 'Не указана';
        
        const statusMap = {
            'Новое': 'pending',
            'В обработке': 'in_progress',
            'Решено': 'resolved',
            'Отклонено': 'rejected'
        };
        const statusClass = `status-${statusMap[reportData.report_status] || 'pending'}`;
        
        content.innerHTML = `
            <div class="report-details">
                <div class="detail-row">
                    <span class="detail-label">ID репорта:</span>
                    <span class="detail-value">#${reportData.id}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Название:</span>
                    <span class="detail-value">${reportData.title || 'Без названия'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Отправитель:</span>
                    <span class="detail-value">${reportData.user_name || reportData.user_email || 'Неизвестно'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Дата и время:</span>
                    <span class="detail-value">${date}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Текущий статус:</span>
                    <span class="detail-value ${statusClass}">${reportData.report_status}</span>
                </div>
                <div class="detail-row full-width">
                    <span class="detail-label">Описание:</span>
                    <div class="detail-value multiline">${reportData.description || 'Описание отсутствует'}</div>
                </div>
                <div class="modal-form-group" style="margin-top: 20px;">
                    <label for="reportStatusSelect">Изменить статус:</label>
                    <select id="reportStatusSelect" class="modal-form-control modal-form-select">
                        <option value="Новое" ${reportData.report_status === 'Новое' ? 'selected' : ''}>Новое</option>
                        <option value="В обработке" ${reportData.report_status === 'В обработке' ? 'selected' : ''}>В обработке</option>
                        <option value="Решено" ${reportData.report_status === 'Решено' ? 'selected' : ''}>Решено</option>
                        <option value="Отклонено" ${reportData.report_status === 'Отклонено' ? 'selected' : ''}>Отклонено</option>
                    </select>
                </div>
            </div>
        `;
        
        // Скрываем footer с кнопками при редактировании
        const modalFooter = modal.querySelector('.modal-footer');
        if (modalFooter) {
            modalFooter.style.display = 'none';
        }
        
        modal.classList.add('active');
        
        // Обработчик изменения статуса
        const statusSelect = document.getElementById('reportStatusSelect');
        if (statusSelect) {
            statusSelect.addEventListener('change', async (e) => {
                const newStatus = e.target.value;
                try {
                    const updateRes = await fetch(`${API_URL}/admin/reports/${reportId}/status`, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ status: newStatus })
                    });
                    
                    if (!updateRes.ok) {
                        throw new Error('Ошибка обновления статуса');
                    }
                    
                    showNotification(`Статус репорта изменен на "${newStatus}"`, 'success');
                    modal.classList.remove('active');
                    loadReportsData();
                    updateAdminStats();
                } catch (error) {
                    console.error('Ошибка обновления статуса:', error);
                    showNotification('Ошибка обновления статуса репорта', 'error');
                }
            });
        }
    } catch (error) {
        console.error('Ошибка загрузки данных репорта:', error);
        showNotification('Ошибка загрузки данных репорта', 'error');
    }
}

// Получить выбранных пользователей
function getSelectedUsers() {
    const checkboxes = document.querySelectorAll('.user-checkbox:checked');
    return Array.from(checkboxes).map(cb => cb.getAttribute('data-id'));
}

// Показать модальное окно массовых действий
function showBulkActionModal(action, userIds) {
    const modal = document.getElementById('bulkActionModal');
    const title = document.getElementById('bulkActionTitle');
    const message = document.getElementById('bulkActionMessage');
    const confirmBtn = document.getElementById('bulkActionConfirm');
    
    if (action === 'block') {
        title.textContent = 'Заблокировать пользователей';
        message.textContent = `Вы уверены, что хотите заблокировать ${userIds.length} пользователей?`;
        confirmBtn.onclick = () => bulkBlockUsers(userIds);
    } else if (action === 'unblock') {
        title.textContent = 'Разблокировать пользователей';
        message.textContent = `Вы уверены, что хотите разблокировать ${userIds.length} пользователей?`;
        confirmBtn.onclick = () => bulkUnblockUsers(userIds);
    } else if (action === 'delete') {
        title.textContent = 'Удалить пользователей';
        message.textContent = `Вы уверены, что хотите удалить ${userIds.length} пользователей? Это действие нельзя отменить!`;
        confirmBtn.onclick = () => bulkDeleteUsers(userIds);
    }
    
    modal.classList.add('active');
}

// Массовая блокировка пользователей
async function bulkBlockUsers(userIds) {
    try {
        const token = localStorage.getItem('token');
        const promises = userIds.map(id => 
            fetch(`${API_URL}/admin/users/${id}/status`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ is_active: false })
            })
        );
        
        await Promise.all(promises);
        showNotification(`${userIds.length} пользователей заблокировано`, 'success');
        document.getElementById('bulkActionModal').classList.remove('active');
        loadUsersData();
        updateAdminStats();
    } catch (error) {
        console.error('Ошибка массовой блокировки:', error);
        showNotification('Ошибка массовой блокировки пользователей', 'error');
    }
}

// Массовая разблокировка пользователей
async function bulkUnblockUsers(userIds) {
    try {
        const token = localStorage.getItem('token');
        const promises = userIds.map(id => 
            fetch(`${API_URL}/admin/users/${id}/status`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ is_active: true })
            })
        );
        
        await Promise.all(promises);
        showNotification(`${userIds.length} пользователей разблокировано`, 'success');
        document.getElementById('bulkActionModal').classList.remove('active');
        loadUsersData();
        updateAdminStats();
    } catch (error) {
        console.error('Ошибка массовой разблокировки:', error);
        showNotification('Ошибка массовой разблокировки пользователей', 'error');
    }
}

// Массовое удаление пользователей
async function bulkDeleteUsers(userIds) {
    try {
        const token = localStorage.getItem('token');
        const promises = userIds.map(id => 
            fetch(`${API_URL}/admin/users/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
        );
        
        await Promise.all(promises);
        showNotification(`${userIds.length} пользователей удалено`, 'success');
        document.getElementById('bulkActionModal').classList.remove('active');
        loadUsersData();
        updateAdminStats();
    } catch (error) {
        console.error('Ошибка массового удаления:', error);
        showNotification('Ошибка массового удаления пользователей', 'error');
    }
}

// Экспорт данных админ-панели
async function exportAdminData() {
    try {
        const token = localStorage.getItem('token');
        
        // Экспортируем пользователей
        const usersRes = await fetch(`${API_URL}/admin/users`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!usersRes.ok) throw new Error('Ошибка загрузки пользователей');
        const users = await usersRes.json();
        
        // Экспортируем репорты
        const reportsRes = await fetch(`${API_URL}/admin/reports`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!reportsRes.ok) throw new Error('Ошибка загрузки репортов');
        const reports = await reportsRes.json();
        
        // Экспортируем статистику
        const statsRes = await fetch(`${API_URL}/admin/stats`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!statsRes.ok) throw new Error('Ошибка загрузки статистики');
        const stats = await statsRes.json();
        
        // Формируем Excel-совместимый CSV
        let csv = '\uFEFF'; // BOM для правильной кодировки в Excel
        
        // Лист пользователей
        csv += '=== ПОЛЬЗОВАТЕЛИ ===\n';
        csv += 'ID,Имя,Email,Дата регистрации,Последний вход,Email подтвержден,Активен,Роль\n';
        users.forEach(u => {
            const regDate = u.created_at ? new Date(u.created_at).toLocaleDateString('ru-RU') : '';
            const lastLogin = u.last_login_at ? new Date(u.last_login_at).toLocaleDateString('ru-RU') : '';
            csv += `"${u.id}","${u.name || ''}","${u.email || ''}","${regDate}","${lastLogin}","${u.email_verified ? 'Да' : 'Нет'}","${u.is_active ? 'Да' : 'Нет'}","${u.role || 'user'}"\n`;
        });
        
        // Лист репортов
        csv += '\n=== РЕПОРТЫ ===\n';
        csv += 'ID,Название,Пользователь,Статус,Дата создания,Описание\n';
        reports.forEach(r => {
            const date = r.created_at ? new Date(r.created_at).toLocaleDateString('ru-RU') : '';
            const desc = (r.description || '').replace(/"/g, '""');
            csv += `"${r.id}","${r.title || ''}","${r.user_name || r.user_email || ''}","${r.report_status || ''}","${date}","${desc}"\n`;
        });
        
        // Статистика
        csv += '\n=== СТАТИСТИКА ===\n';
        csv += `Всего пользователей,${stats.totalUsers || 0}\n`;
        csv += `Активных сегодня,${stats.activeToday || 0}\n`;
        csv += `Заблокированных,${stats.blockedUsers || 0}\n`;
        csv += `Новых репортов,${stats.newReports || 0}\n`;
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `admin_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification('Данные успешно экспортированы в Excel', 'success');
    } catch (error) {
        console.error('Ошибка экспорта данных:', error);
        showNotification('Ошибка экспорта данных', 'error');
    }
}

// Переменные для логов
let allLogs = [];
let currentLogLimit = 50;

// Фильтрация логов
function filterLogs() {
    const level = document.getElementById('logLevel')?.value || 'all';
    const date = document.getElementById('logDate')?.value;
    const logsContainer = document.getElementById('logsContainer');
    
    if (!logsContainer) return;
    
    let filtered = allLogs;
    
    if (level !== 'all') {
        filtered = filtered.filter(log => log.level === level);
    }
    
    if (date) {
        const filterDate = new Date(date);
        filtered = filtered.filter(log => {
            const logDate = new Date(log.time);
            return logDate.toDateString() === filterDate.toDateString();
        });
    }
    
    // Показываем только первые currentLogLimit записей
    const displayed = filtered.slice(0, currentLogLimit);
    
    logsContainer.innerHTML = '';
    displayed.forEach(log => {
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${log.level}`;
        const time = log.time 
            ? new Date(log.time).toLocaleString('ru-RU')
            : 'Не указано';
        logEntry.innerHTML = `
            <span class="log-time">${time}</span>
            <span class="log-message">${log.message}</span>
        `;
        logsContainer.appendChild(logEntry);
    });
    
    document.getElementById('shownLogs').textContent = displayed.length;
}

// Загрузка больше логов
function loadMoreLogs() {
    currentLogLimit += 50;
    filterLogs();
}

// Очистка логов (клиентская)
function clearLogs() {
    allLogs = [];
    const logsContainer = document.getElementById('logsContainer');
    if (logsContainer) {
        logsContainer.innerHTML = '';
    }
    document.getElementById('shownLogs').textContent = '0';
    showNotification('Логи очищены', 'success');
}







