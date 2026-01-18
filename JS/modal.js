const API_URL = import.meta.env.VITE_API_URL;

// Модальное окно для добавления расхода
class ExpenseModal {
    constructor() {
        this.modalHTML = null;
        this.isOpen = false;
        this.init();
    }

    init() {
        this.createModal();
        this.addEventListeners();
        this.loadCategories();
    }

    createModal() {
        const modalHTML = `
            <div class="modal-overlay" id="expenseModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Добавить новый расход</h2>
                        <button class="close-modal" id="closeExpenseModal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="modal-error-message" id="modalErrorMessage"></div>
                        <div class="modal-success-message" id="modalSuccessMessage"></div>
                        <form id="expenseForm">
                            <div class="modal-form-group">
                                <label for="expenseAmount">Сумма расхода (руб.)</label>
                                <input type="number" id="expenseAmount" class="modal-form-control modal-amount-input" 
                                       placeholder="Введите сумму" min="0" step="0.01" required>
                            </div>
                            
                            <div class="modal-form-group">
                                <label for="expenseCategory">Категория</label>
                                <select id="expenseCategory" class="modal-form-control modal-form-select" required>
                                    <option value="" disabled selected>Выберите категорию</option>
                                    <!-- Категории будут загружены динамически -->
                                </select>
                            </div>
                            
                            <div class="modal-form-group">
                                <label for="expenseDate">Дата</label>
                                <input type="date" id="expenseDate" class="modal-form-control" required>
                            </div>
                            
                            <div class="modal-form-group">
                                <label for="expenseDescription">Описание (необязательно)</label>
                                <input type="text" id="expenseDescription" class="modal-form-control" 
                                       placeholder="Краткое описание расхода">
                            </div>
                            
                            <button type="submit" class="modal-submit-btn">Добавить расход</button>
                        </form>
                    </div>
                </div>
            </div>
        `;

        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer.firstElementChild);
        
        this.modal = document.getElementById('expenseModal');
        
        // Установить сегодняшнюю дату по умолчанию
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('expenseDate').value = today;
    }

    addEventListeners() {
        // Открытие модального окна при клике на кнопку "Добавить расходы"
        document.getElementById('add_primary').addEventListener('click', () => {
            this.open();
        });

        // Закрытие модального окна
        document.getElementById('closeExpenseModal').addEventListener('click', () => {
            this.close();
        });

        // Закрытие при клике на фон
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });

        // Закрытие при нажатии Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });

        // Обработка отправки формы
        document.getElementById('expenseForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitExpense();
        });
    }

    async loadCategories() {
        try {
            // Здесь можно загрузить категории из базы данных
            // Для примера используем статические категории
            const categories = [
                'Продукты',
                'Транспорт',
                'Развлечения',
                'Коммунальные услуги',
                'Одежда',
                'Здоровье',
                'Образование',
                'Кафе и рестораны',
                'Путешествия',
                'Подарки',
                'Другое'
            ];

            const categorySelect = document.getElementById('expenseCategory');
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                categorySelect.appendChild(option);
            });
        } catch (error) {
            console.error('Ошибка при загрузке категорий:', error);
        }
    }

    open() {
        this.modal.style.display = 'flex';
        this.isOpen = true;
        document.getElementById('expenseAmount').focus();
        this.clearMessages();
    }

    close() {
        this.modal.style.display = 'none';
        this.isOpen = false;
        document.getElementById('expenseForm').reset();
        document.getElementById('expenseDate').value = new Date().toISOString().split('T')[0];
        this.clearMessages();
    }

    clearMessages() {
        document.getElementById('modalErrorMessage').style.display = 'none';
        document.getElementById('modalSuccessMessage').style.display = 'none';
    }

    showError(message) {
        const errorElement = document.getElementById('modalErrorMessage');
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }

    showSuccess(message) {
        const successElement = document.getElementById('modalSuccessMessage');
        successElement.textContent = message;
        successElement.style.display = 'block';
    }

    async submitExpense() {
        // Получить данные из формы
        const amount = parseFloat(document.getElementById('expenseAmount').value);
        const category = document.getElementById('expenseCategory').value;
        const date = document.getElementById('expenseDate').value;
        const description = document.getElementById('expenseDescription').value;

        // Валидация
        if (!amount || amount <= 0) {
            this.showError('Пожалуйста, введите корректную сумму расхода');
            return;
        }

        if (!category) {
            this.showError('Пожалуйста, выберите категорию');
            return;
        }

        if (!date) {
            this.showError('Пожалуйста, выберите дату');
            return;
        }

        // Создать объект расхода
        const expense = {
            amount: amount,
            category: category,
            date: date,
            description: description || null,
            userId: 1 // Здесь нужно получить ID текущего пользователя
        };

        try {
            // Отправить данные на сервер
            const response = await fetch(`${API_URL}/expenses`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(expense)
            });

            if (!response.ok) {
                throw new Error('Ошибка при сохранении расхода');
            }

            const result = await response.json();
            
            // Показать сообщение об успехе
            this.showSuccess(`Расход на сумму ${amount} руб. успешно добавлен!`);
            
            // Обновить данные на главной странице
            this.updateMainPage(result.expense);
            
            // Закрыть модальное окно через 2 секунды
            setTimeout(() => {
                this.close();
            }, 2000);

        } catch (error) {
            console.error('Ошибка:', error);
            this.showError('Ошибка при сохранении расхода. Пожалуйста, попробуйте еще раз.');
        }
    }

    updateMainPage(expense) {
        // Здесь добавим логику обновления главной страницы
        // Например, обновить список расходов, диаграмму и статистику
        
        // 1. Обновить статистику расходов
        const expensesElement = document.querySelector('.stats-card:nth-child(2) .stats-card__value');
        if (expensesElement.textContent === 'нет') {
            expensesElement.textContent = `${expense.amount} руб.`;
        } else {
            const currentExpenses = parseFloat(expensesElement.textContent);
            expensesElement.textContent = `${currentExpenses + expense.amount} руб.`;
        }
        
        // 2. Обновить итоговую сумму
        const totalElement = document.querySelector('.stats-card__value--total');
        const currentTotal = parseFloat(totalElement.textContent) || 0;
        totalElement.textContent = currentTotal - expense.amount;
        
        // 3. Добавить в панель расходов
        this.addToExpensePanel(expense);
        
        // 4. Обновить диаграмму (если есть)
        if (window.updateChart) {
            window.updateChart();
        }
    }

    addToExpensePanel(expense) {
        const panelContent = document.querySelector('.panel-content');
        
        // Если панель пустая
        if (!panelContent.children.length || panelContent.children[0].classList.contains('empty-message')) {
            panelContent.innerHTML = '';
        }
        
        // Форматировать дату
        const dateObj = new Date(expense.date);
        const formattedDate = dateObj.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        
        // Создать элемент расхода
        const expenseElement = document.createElement('div');
        expenseElement.className = 'expense-item';
        expenseElement.innerHTML = `
            <div class="expense-info">
                <div class="expense-category">${expense.category}</div>
                <div class="expense-date">${formattedDate}</div>
                ${expense.description ? `<div class="expense-description">${expense.description}</div>` : ''}
            </div>
            <div class="expense-amount">-${expense.amount.toFixed(2)} руб.</div>
        `;
        
        // Добавить в начало
        panelContent.prepend(expenseElement);
    }
}

// Инициализация модального окна при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    const expenseModal = new ExpenseModal();
});