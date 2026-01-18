const API_URL = import.meta.env.VITE_API_URL;

class CurrentUser {
    constructor(userData) {
        const payload = {
            name: userData.name || userData.username || '',
            email: userData.email || '',
            loginAt: new Date().toISOString(),
        };
        localStorage.setItem('currentUser', JSON.stringify(payload));
    }
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validateAuthForm(email, password) {
    if (!email || !password) {
        showMessage('Пожалуйста, заполните все обязательные поля', 'error');
        return false;
    }
    
    if (!isValidEmail(email)) {
        showMessage('Пожалуйста, введите корректный email адрес', 'error');
        return false;
    }
    
    return true;
}

document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const firstPassword = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (firstPassword.length < 6) {
        showMessage("Пароль должен содержать минимум 6 символов", 'error');
        return;
    }

    if(firstPassword != confirmPassword){
        showMessage("Пароли не совпадают", 'error');
        return;
    }
    
    const userData = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        password: document.getElementById('password').value
    };

    if (!isValidEmail(userData.email)) {
        showMessage('Пожалуйста, введите корректный email адрес', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData)
        });

        const result = await response.json();
        
        if (response.ok) {
            showMessage('Регистрация пройдена!', 'success');
            setTimeout(() => {
                window.location.href = 'MainMenu.html';
            }, 2000);
        } else {
            let errorMsg = result.error || 'Ошибка регистрации';
            if (errorMsg.includes('duplicate') || errorMsg.includes('уже существует') || errorMsg.includes('unique') || errorMsg.includes('email')) {
                errorMsg = 'Такой пользователь уже существует';
            }
            showMessage(errorMsg, 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showMessage('Ошибка сервера', 'error');
    }
});

document.getElementById('authForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const userData = {
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('password').value.trim()
    };

    if (!validateAuthForm(userData.email, userData.password)) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData)
        });

        const result = await response.json();

        if (response.ok) {
            localStorage.setItem('token', result.token);
            localStorage.setItem('user', JSON.stringify(result.user));
            
            showMessage('Авторизация успешна!', 'success');
            
            setTimeout(() => {
                window.location.href = 'MainMenu.html';
            }, 1000);

            new CurrentUser(result.user || {});
        } else {
            let errorMessage = 'Ошибка авторизации';
            
            if (response.status === 401) {
                errorMessage = result.error || 'Неверный email или пароль';
            } else if (response.status === 404) {
                errorMessage = 'Сервер не найден';
            } else if (response.status === 500) {
                errorMessage = 'Ошибка сервера';
            }
            
            showMessage(errorMessage, 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showMessage('Ошибка соединения с сервером', 'error');
    }
});

function showMessage(message, type, duration = 5000) {
    const container = document.getElementById('notificationContainer');
    
    if (!container) {
        console.warn('notificationContainer not found');
        const newContainer = document.createElement('div');
        newContainer.id = 'notificationContainer';
        newContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        document.body.appendChild(newContainer);
        return showMessage(message, type, duration);
    }
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    notification.style.cssText = `
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 300px;
        max-width: 400px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        transform: translateX(100%);
        opacity: 0;
        transition: transform 0.3s ease, opacity 0.3s ease;
    `;
    
    const colors = {
        success: '#4CAF50',
        error: '#F44336',
        warning: '#FF9800',
        info: '#2196F3'
    };
    
    notification.style.backgroundColor = colors[type] || colors.info;
    
    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };
    
    notification.innerHTML = `
        <span style="font-size: 20px; font-weight: bold;">${icons[type] || 'ℹ'}</span>
        <span style="flex: 1;">${message}</span>
        <button class="close-btn" style="
            background: none;
            border: none;
            color: white;
            font-size: 24px;
            cursor: pointer;
            line-height: 1;
            padding: 0;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
        ">&times;</button>
    `;
    
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
        notification.style.opacity = '1';
    }, 10);
    
    const closeNotification = () => {
        notification.style.transform = 'translateX(100%)';
        notification.style.opacity = '0';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    };
    
    notification.querySelector('.close-btn').addEventListener('click', closeNotification);
    
    if (duration > 0) {
        setTimeout(closeNotification, duration);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.toggle-password').forEach(toggle => {
        const targetSelector = toggle.getAttribute('data-target');
        const input = targetSelector ? document.querySelector(targetSelector) : toggle.previousElementSibling;
        if (!input) return;

        toggle.addEventListener('click', function() {
            const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
            input.setAttribute('type', type);
            
            const isPressed = type === 'text';
            this.setAttribute('aria-pressed', isPressed);
            this.setAttribute('aria-label', isPressed ? 'Скрыть пароль' : 'Показать пароль');
        });
    });

    const inputs = document.querySelectorAll('.form-input');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.classList.add('focused');
        });
        
        input.addEventListener('blur', function() {
            this.parentElement.classList.remove('focused');
        });
    });
    
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    if (error) {
        showMessage(decodeURIComponent(error), 'error');
    }
});