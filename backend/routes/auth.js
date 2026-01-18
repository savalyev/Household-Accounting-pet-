const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');


const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

function authenticate(req, res, next) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Неверный или просроченный токен' });
    }
}

router.post('/register', async (req, res) => {
    try {
        const user = await User.create(req.body);
        res.status(201).json({ message: 'User created', user });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findByEmail(email);
        
        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ error: 'Неверный пароль или такой аккаунт не найден :(' });
        }

        if (user.is_active === false) {
            return res.status(403).json({ error: 'Аккаунт заблокирован. Обратитесь к администратору.' });
        }

        
        await User.updateLastLogin(user.id);
        const fresh = await User.findById(user.id);

        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });
        res.json({
            token,
            user: {
                id: fresh.id,
                name: fresh.name,
                email: fresh.email,
                created_at: fresh.created_at,
                last_login_at: fresh.last_login_at,
                email_verified: fresh.email_verified,
                is_active: fresh.is_active,
                role: fresh.role || 'user'
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/me', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
        if (user.is_active === false) {
            return res.status(403).json({ error: 'Аккаунт заблокирован' });
        }
        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            created_at: user.created_at,
            last_login_at: user.last_login_at,
            email_verified: user.email_verified,
            is_active: user.is_active,
            role: user.role || 'user',
            avatar_url: user.avatar_url || null,
            username: user.name
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/email', authenticate, async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email обязателен' });
        }
        const updated = await User.updateEmail(req.userId, email);
        res.json({ user: updated });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

router.put('/password', authenticate, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        // Валидация входных данных
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Укажите текущий и новый пароль' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Новый пароль должен содержать минимум 6 символов' });
        }

        // Проверка что новый пароль отличается от старого
        if (currentPassword === newPassword) {
            return res.status(400).json({ error: 'Новый пароль должен отличаться от текущего' });
        }

        // Получаем пользователя с паролем
        const user = await User.findByIdWithPassword(req.userId);
        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        // Проверяем текущий пароль
        const ok = await bcrypt.compare(currentPassword, user.password_hash);
        if (!ok) {
            return res.status(401).json({ error: 'Текущий пароль неверен' });
        }

        // Обновляем пароль
        const updated = await User.updatePassword(req.userId, newPassword);
        res.json({ 
            message: 'Пароль успешно обновлён',
            user: updated 
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Загрузка аватарки
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../uploads/avatars');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `avatar_${req.userId}_${Date.now()}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Только изображения разрешены'));
        }
    }
});

router.post('/avatar', authenticate, upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Файл не загружен' });
        }
        
        const avatarUrl = `/uploads/avatars/${req.file.filename}`;
        const updated = await User.updateAvatar(req.userId, avatarUrl);
        res.json({ avatar_url: avatarUrl, user: updated });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Отправка письма для подтверждения почты
router.post('/send-verification', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
        
        if (user.email_verified) {
            return res.status(400).json({ error: 'Email уже подтвержден' });
        }
        
        // Генерируем токен подтверждения
        const crypto = require('crypto');
        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date();
        expires.setHours(expires.getHours() + 24);
        
        await User.setVerificationToken(req.userId, token, expires);
        
        // Пока просто возвращаем токен для тестирования
        const verificationLink = `${API_URL}/auth/verify-email?token=${token}`;
        
        res.json({ 
            message: 'Письмо с подтверждением отправлено на ваш email',
            verificationLink // УБРАТЬ ПОТОМ НЕ ЗАБУДЬ КИРЮХА
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Подтверждение email
router.get('/verify-email', async (req, res) => {
    try {
        const { token } = req.query;
        if (!token) {
            return res.status(400).json({ error: 'Токен не указан' });
        }
        
        const user = await User.findByVerificationToken(token);
        if (!user) {
            return res.status(400).json({ error: 'Неверный или просроченный токен' });
        }
        
        await User.verifyEmail(user.id);
        res.json({ message: 'Email успешно подтвержден' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;