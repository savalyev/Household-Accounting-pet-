const API_URL = import.meta.env.VITE_API_URL;

(function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.replace('Authorization2.html');
        return;
    }
})();

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.replace('Authorization2.html');
        return;
    }

    const mainContainer = document.querySelector('.main-container');
    if (mainContainer) {
        mainContainer.style.opacity = '0';
    }

    // Проверяем токен через API перед показом страницы
    const isValid = await validateToken(token);
    if (!isValid) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('currentUser');
        window.location.replace('Authorization2.html');
        return;
    }

    if (mainContainer) {
        mainContainer.style.opacity = '1';
    }

    loadProfile(token);
    wireEmailForm(token);
    wirePasswordForm(token);
    wireAvatarUpload(token);
    wireNavigation();
    wireReportForm(token);
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

async function loadProfile(token) {
    try {
        const res = await fetch(`${API_URL}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await res.json();
        if (!res.ok) {
            if (res.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                localStorage.removeItem('currentUser');
            window.location.replace('Authorization2.html');
                return;
            }
            throw new Error(data.error || 'Не удалось получить профиль');
        }
        const stored = {
            id: data.id,
            name: data.name,
            email: data.email,
            created_at: data.created_at,
            last_login_at: data.last_login_at,
            email_verified: data.email_verified,
            is_active: data.is_active,
            avatar_url: data.avatar_url || null,
            username: data.username || data.name
        };
        localStorage.setItem('user', JSON.stringify(stored));
        bindProfileData(data); // Передаем полные данные с avatar_url
    } catch (err) {
        if (err.message.includes('авторизац') || err.message.includes('токен')) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('currentUser');
            window.location.replace('Authorization2.html');
            return;
        }
        showProfileMessage(err.message, 'error');
    }
}

function bindProfileData(stored) {
    const user = stored || JSON.parse(localStorage.getItem('user') || '{}');
    const greeting = document.getElementById('greeting');
    const emailInput = document.getElementById('emailInput');
    const infoDays = document.getElementById('infoDays');
    const statDays = document.getElementById('statDays');
    const statLastLogin = document.getElementById('statLastLogin');
    const statEmailStatus = document.getElementById('statEmailStatus');
    const statActive = document.getElementById('statActive');

    const name = user.username || user.name || 'пользователь';
    greeting.textContent = `Добро пожаловать, ${name}!`;
    if (emailInput && user.email) {
        emailInput.value = user.email;
    }
    
    // Загружаем аватар если есть
    const avatarImage = document.getElementById('avatarImage');
    if (avatarImage) {
        if (user.avatar_url) {
            const avatarUrl = user.avatar_url.startsWith('http') ? user.avatar_url : `http://localhost:3000${user.avatar_url}`;
            avatarImage.src = avatarUrl;
        } else {
            avatarImage.src = 'img/image-10.png'; // Дефолтный аватар
        }
    }

    const days = calcDays(user.created_at);
    if (infoDays) {
        infoDays.textContent = `Вы уже ${days ?? '—'} дней следите\nза своими финансам. С каждым днем Вы все ближе к своей финансовой независимости!`;
    }
    if (statDays) statDays.textContent = `${days} дней` ?? '—';
    if (statLastLogin) statLastLogin.textContent = formatDate(user.last_login_at);
    if (statEmailStatus) statEmailStatus.textContent = user.email_verified ? 'Подтверждён' : 'Не подтверждён';
    if (statActive) statActive.textContent = user.is_active ? 'Активен' : 'Неактивен';
}

function wireNavigation() {
    const logoutBtn = document.getElementById('logoutBtn');
    const backButton = document.getElementById('backButton');

    logoutBtn?.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('currentUser');
        window.location.href = 'Authorization2.html';
    });

    backButton?.addEventListener('click', () => {
        window.location.href = 'MainMenu.html';
    });
}

function wireEmailForm(token) {
    const form = document.getElementById('emailForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('emailInput').value.trim();
        if (!email) {
            showProfileMessage('Укажите email', 'error');
            return;
        }

        try {
            const res = await fetch(`${API_URL}/auth/email`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ email })
            });

            const data = await res.json();
            if (!res.ok) {
                if (res.status === 401) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    localStorage.removeItem('currentUser');
            window.location.replace('Authorization2.html');
                    return;
                }
                throw new Error(data.error || 'Не удалось обновить email');
            }

            localStorage.setItem('user', JSON.stringify(data.user));
            bindProfileData(data.user);
            showProfileMessage('Email обновлён', 'success');
        } catch (err) {
            if (err.message.includes('авторизац') || err.message.includes('токен')) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                localStorage.removeItem('currentUser');
                window.location.replace('Authorization2.html');
                return;
            }
            showProfileMessage(err.message, 'error');
        }
    });
    
    // Кнопка подтверждения почты
    const verifyBtn = document.getElementById('verifyEmailBtn');
    if (verifyBtn) {
        verifyBtn.addEventListener('click', async () => {
            try {
                const res = await fetch(`${API_URL}/auth/send-verification`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.error || 'Не удалось отправить письмо');
                }
                
                showProfileMessage(data.message || 'Письмо с подтверждением отправлено', 'success');
                if (data.verificationLink) {
                    console.log('Ссылка для подтверждения (только для разработки):', data.verificationLink);
                }
            } catch (err) {
                showProfileMessage(err.message, 'error');
            }
        });
    }
}

function wirePasswordForm(token) {
    const form = document.getElementById('passwordForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentPassword = document.getElementById('oldPassword').value.trim();
        const newPassword = document.getElementById('newPassword').value.trim();
        const confirmPassword = document.getElementById('confirmPassword').value.trim();

        // Валидация полей
        if (!currentPassword || !newPassword || !confirmPassword) {
            showProfileMessage('❌ Заполните все поля пароля', 'error');
            return;
        }

        // Проверка минимальной длины
        if (newPassword.length < 6) {
            showProfileMessage('❌ Новый пароль должен содержать минимум 6 символов', 'error');
            return;
        }

        // Проверка совпадения паролей
        if (newPassword !== confirmPassword) {
            showProfileMessage('❌ Новый пароль и подтверждение не совпадают', 'error');
            return;
        }

        // Проверка что новый пароль отличается от старого
        if (currentPassword === newPassword) {
            showProfileMessage('❌ Новый пароль должен отличаться от текущего', 'error');
            return;
        }

        // Показываем уведомление о начале процесса
        showProfileMessage('⏳ Проверяю текущий пароль...', 'info');
        
        // Отключаем кнопку отправки
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn ? submitBtn.querySelector('.button-text')?.textContent : '';
        if (submitBtn) {
            submitBtn.disabled = true;
            if (submitBtn.querySelector('.button-text')) {
                submitBtn.querySelector('.button-text').textContent = 'Проверка...';
            }
        }

        try {
            showProfileMessage('⏳ Проверяю текущий пароль...', 'info');
            
            const res = await fetch(`${API_URL}/auth/password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ currentPassword, newPassword })
            });

            const data = await res.json();
            
            if (!res.ok) {
                if (res.status === 401) {
                    showProfileMessage('❌ Текущий пароль неверен. Проверьте правильность ввода.', 'error');
                    // Очищаем только поле старого пароля
                    document.getElementById('oldPassword').value = '';
                    document.getElementById('oldPassword').focus();
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        if (submitBtn.querySelector('.button-text')) {
                            submitBtn.querySelector('.button-text').textContent = originalBtnText;
                        }
                    }
                    return;
                }
                
                // Обработка других ошибок
                let errorMsg = data.error || 'Не удалось обновить пароль';
                if (errorMsg.includes('неверен') || errorMsg.includes('неверный')) {
                    errorMsg = '❌ Текущий пароль неверен. Проверьте правильность ввода.';
                    document.getElementById('oldPassword').value = '';
                    document.getElementById('oldPassword').focus();
                } else {
                    errorMsg = '❌ ' + errorMsg;
                }
                throw new Error(errorMsg);
            }

            // Успешное обновление
            showProfileMessage('✅ Пароль успешно обновлён!', 'success');
            form.reset();
            
            // Обновляем данные пользователя
            if (data.user) {
                const stored = JSON.parse(localStorage.getItem('user') || '{}');
                Object.assign(stored, data.user);
                localStorage.setItem('user', JSON.stringify(stored));
            }
            
        } catch (err) {
            if (err.message.includes('авторизац') || err.message.includes('токен')) {
                showProfileMessage('❌ Сессия истекла. Войдите заново.', 'error');
                setTimeout(() => {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    localStorage.removeItem('currentUser');
                    window.location.replace('Authorization2.html');
                }, 2000);
                return;
            }
            showProfileMessage(err.message, 'error');
        } finally {
            // Включаем кнопку обратно
            if (submitBtn) {
                submitBtn.disabled = false;
                if (submitBtn.querySelector('.button-text')) {
                    submitBtn.querySelector('.button-text').textContent = originalBtnText;
                }
            }
        }
    });
}

function wireAvatarUpload(token) {
    const uploadBtn = document.getElementById('avatarUploadBtn');
    const avatarInput = document.getElementById('avatarInput');
    const avatarImage = document.getElementById('avatarImage');
    
    if (!uploadBtn || !avatarInput || !avatarImage) return;
    
    uploadBtn.addEventListener('click', () => {
        avatarInput.click();
    });
    
    avatarInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        if (!file.type.startsWith('image/')) {
            showProfileMessage('❌ Выберите изображение (JPG, PNG, GIF)', 'error');
            avatarInput.value = '';
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            showProfileMessage('❌ Размер файла не должен превышать 5 МБ', 'error');
            avatarInput.value = '';
            return;
        }
        
        showProfileMessage('⏳ Загружаю аватар...', 'info');
        
        const formData = new FormData();
        formData.append('avatar', file);
        
        try {
            const res = await fetch(`${API_URL}/auth/avatar`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Не удалось загрузить аватар');
            }
            
            if (data.avatar_url) {
                const avatarUrl = data.avatar_url.startsWith('http') ? data.avatar_url : `http://localhost:3000${data.avatar_url}`;
                avatarImage.src = avatarUrl;
                
                // Обновляем данные в localStorage
                const stored = JSON.parse(localStorage.getItem('user') || '{}');
                stored.avatar_url = data.avatar_url;
                localStorage.setItem('user', JSON.stringify(stored));
                
                // Перезагружаем профиль чтобы получить актуальные данные
                const currentToken = localStorage.getItem('token');
                if (currentToken) {
                    await loadProfile(currentToken);
                }
                
                showProfileMessage('✅ Аватар успешно загружен и сохранён!', 'success');
            }
        } catch (err) {
            showProfileMessage('❌ ' + err.message, 'error');
            avatarInput.value = '';
        }
    });
}

function showProfileMessage(message, type = 'success') {
    let el = document.getElementById('profileMessage');
    if (!el) {
        // Создаем элемент если его нет
        el = document.createElement('div');
        el.id = 'profileMessage';
        el.style.cssText = 'position: fixed; top: 20px; right: 20px; padding: 12px 20px; border-radius: 8px; z-index: 10000; max-width: 400px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); font-size: 14px;';
        document.body.appendChild(el);
    }
    
    el.textContent = message;
    
    // Устанавливаем классы и стили в зависимости от типа
    if (type === 'success') {
        el.className = 'modal-success-message';
        el.style.backgroundColor = '#4CAF50';
        el.style.color = '#fff';
    } else if (type === 'error') {
        el.className = 'modal-error-message';
        el.style.backgroundColor = '#F44336';
        el.style.color = '#fff';
    } else if (type === 'info') {
        el.className = 'modal-info-message';
        el.style.backgroundColor = '#2196F3';
        el.style.color = '#fff';
    } else {
        el.style.backgroundColor = '#666';
        el.style.color = '#fff';
    }
    
    el.style.display = 'block';
    el.style.position = 'fixed';
    el.style.top = '20px';
    el.style.right = '20px';
    el.style.padding = '12px 20px';
    el.style.borderRadius = '8px';
    el.style.zIndex = '10000';
    el.style.maxWidth = '400px';
    el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
    el.style.fontSize = '14px';
    
    // Автоматически скрываем через 5 секунд (кроме info - 3 секунды)
    const timeout = type === 'info' ? 3000 : 5000;
    setTimeout(() => {
        if (el && el.style) {
            el.style.display = 'none';
        }
    }, timeout);
}

function calcDays(createdAt) {
    if (!createdAt) return null;
    const created = new Date(createdAt);
    const now = new Date();
    const diffMs = now - created;
    if (Number.isNaN(diffMs) || diffMs < 0) return null;
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function formatDate(value) {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function wireReportForm(token) {
    const reportBtn = document.getElementById('reportBtn');
    const reportModal = document.getElementById('reportModal');
    const closeReportModal = document.getElementById('closeReportModal');
    const reportForm = document.getElementById('reportForm');
    const reportMessage = document.getElementById('reportMessage');

    // Открытие модального окна
    reportBtn?.addEventListener('click', () => {
        if (reportModal) {
            reportModal.style.display = 'flex';
            // Очистка формы и сообщений
            if (reportForm) reportForm.reset();
            if (reportMessage) {
                reportMessage.style.display = 'none';
                reportMessage.className = 'modal-error-message';
            }
        }
    });

    // Закрытие модального окна
    closeReportModal?.addEventListener('click', () => {
        if (reportModal) {
            reportModal.style.display = 'none';
        }
    });

    // Закрытие при клике вне модального окна
    reportModal?.addEventListener('click', (e) => {
        if (e.target === reportModal) {
            reportModal.style.display = 'none';
        }
    });

    // Отправка формы репорта
    reportForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const title = document.getElementById('reportTitle')?.value.trim();
        const description = document.getElementById('reportDescription')?.value.trim();

        if (!title) {
            showReportMessage('Название репорта обязательно', 'error');
            return;
        }

        if (title.length > 255) {
            showReportMessage('Название репорта слишком длинное (максимум 255 символов)', 'error');
            return;
        }

        try {
            const res = await fetch(`${API_URL}/reports`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    title,
                    description: description || ''
                })
            });

            const data = await res.json();
            
            if (!res.ok) {
                if (res.status === 401) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    localStorage.removeItem('currentUser');
                    window.location.replace('Authorization2.html');
                    return;
                }
                throw new Error(data.error || 'Не удалось отправить репорт');
            }

            showReportMessage('Репорт успешно отправлен!', 'success');
            reportForm.reset();
            
            // Закрываем модальное окно через 2 секунды
            setTimeout(() => {
                if (reportModal) {
                    reportModal.style.display = 'none';
                }
            }, 2000);
        } catch (err) {
            if (err.message.includes('авторизац') || err.message.includes('токен')) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                localStorage.removeItem('currentUser');
                window.location.replace('Authorization2.html');
                return;
            }
            showReportMessage(err.message, 'error');
        }
    });
}

function showReportMessage(message, type = 'success') {
    const reportMessage = document.getElementById('reportMessage');
    if (!reportMessage) return;
    
    reportMessage.textContent = message;
    reportMessage.className = type === 'success' ? 'modal-success-message' : 'modal-error-message';
    reportMessage.style.display = 'block';
    
    // Автоматически скрываем сообщение об успехе через 5 секунд
    if (type === 'success') {
        setTimeout(() => {
            reportMessage.style.display = 'none';
        }, 5000);
    }
}
