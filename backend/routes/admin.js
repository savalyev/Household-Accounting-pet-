const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const Report = require('../models/reportModel');
const Income = require('../models/incomeModel');
const Expense = require('../models/expenseModel');

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

async function isAdmin(req, res, next) {
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        // ВРЕМЕННО: Разрешаем доступ всем авторизованным пользователям для разработки
        // В продакшене раскомментируйте проверку роли ниже:
        
        // const userRole = user.role;
        // if (userRole && userRole !== 'admin') {
        //     return res.status(403).json({ error: 'Доступ запрещен. Требуются права администратора' });
        // }
        
        req.user = user;
        next();
    } catch (error) {
        console.error('Ошибка проверки прав администратора:', error);
        return res.status(500).json({ error: error.message });
    }
}

// Получить всех пользователей
router.get('/users', authenticate, isAdmin, async (req, res) => {
    try {
        const users = await User.getAll();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Получить детали пользователя
router.get('/users/:id', authenticate, isAdmin, async (req, res) => {
    try {
        const user = await User.getById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        const stats = await User.getUserStats(user.id);
        res.json({ ...user, stats });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Заблокировать/разблокировать пользователя
router.put('/users/:id/status', authenticate, isAdmin, async (req, res) => {
    try {
        const { is_active } = req.body;
        if (typeof is_active !== 'boolean') {
            return res.status(400).json({ error: 'is_active должен быть boolean' });
        }
        const user = await User.updateStatus(req.params.id, is_active);
        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Изменить роль пользователя
router.put('/users/:id/role', authenticate, isAdmin, async (req, res) => {
    try {
        const { role } = req.body;
        const allowedRoles = ['user', 'moderator', 'admin'];
        if (!allowedRoles.includes(role)) {
            return res.status(400).json({ error: 'Недопустимая роль' });
        }
        const user = await User.updateRole(req.params.id, role);
        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Удалить пользователя
router.delete('/users/:id', authenticate, isAdmin, async (req, res) => {
    try {
        const user = await User.delete(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        res.json({ message: 'Пользователь удален', id: user.id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Получить все репорты
router.get('/reports', authenticate, isAdmin, async (req, res) => {
    try {
        const reports = await Report.getAll();
        res.json(reports || []);
    } catch (error) {
        // Если таблица не существует, возвращаем пустой массив
        if (error.message.includes('does not exist') || error.message.includes('relation')) {
            return res.json([]);
        }
        res.status(500).json({ error: error.message });
    }
});

// Получить детали репорта
router.get('/reports/:id', authenticate, isAdmin, async (req, res) => {
    try {
        const report = await Report.getById(req.params.id);
        if (!report) {
            return res.status(404).json({ error: 'Репорт не найден' });
        }
        res.json(report);
    } catch (error) {
        // Если таблица не существует
        if (error.message.includes('does not exist') || error.message.includes('relation')) {
            return res.status(404).json({ error: 'Таблица reports не найдена. Создайте её используя create_reports_table.sql' });
        }
        res.status(500).json({ error: error.message });
    }
});

// Изменить статус репорта
router.put('/reports/:id/status', authenticate, isAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        const allowedStatuses = ['Новое', 'В обработке', 'Решено', 'Отклонено'];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ error: 'Недопустимый статус' });
        }
        const report = await Report.updateStatus(req.params.id, status);
        if (!report) {
            return res.status(404).json({ error: 'Репорт не найден' });
        }
        res.json(report);
    } catch (error) {
        // Если таблица не существует
        if (error.message.includes('does not exist') || error.message.includes('relation')) {
            return res.status(404).json({ error: 'Таблица reports не найдена. Создайте её используя create_reports_table.sql' });
        }
        res.status(500).json({ error: error.message });
    }
});

// Удалить репорт
router.delete('/reports/:id', authenticate, isAdmin, async (req, res) => {
    try {
        const report = await Report.delete(req.params.id);
        if (!report) {
            return res.status(404).json({ error: 'Репорт не найден' });
        }
        res.json({ message: 'Репорт удален', id: report.id });
    } catch (error) {
        // Если таблица не существует
        if (error.message.includes('does not exist') || error.message.includes('relation')) {
            return res.status(404).json({ error: 'Таблица reports не найдена. Создайте её используя create_reports_table.sql' });
        }
        res.status(500).json({ error: error.message });
    }
});

// Получить статистику
router.get('/stats', authenticate, isAdmin, async (req, res) => {
    try {
        const userStats = await User.getStats();
        const period = parseInt(req.query.period) || 30; // По умолчанию 30 дней
        
        // Статистика по регистрациям за указанный период
        const registrations = await User.getAll();
        const registrationData = [];
        const now = new Date();
        for (let i = period - 1; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const count = registrations.filter(u => {
                if (!u.created_at) return false;
                const created = new Date(u.created_at).toISOString().split('T')[0];
                return created === dateStr;
            }).length;
            registrationData.push({ date: dateStr, count });
        }

        // Статистика по активности по дням недели
        const activityByDay = [0, 0, 0, 0, 0, 0, 0]; // Пн-Вс
        registrations.forEach(user => {
            if (user.last_login_at) {
                const loginDate = new Date(user.last_login_at);
                const dayOfWeek = loginDate.getDay();
                const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Пн = 0, Вс = 6
                activityByDay[adjustedDay]++;
            }
        });

        // Распределение по ролям
        const rolesDistribution = {};
        registrations.forEach(user => {
            const role = user.role || 'user';
            rolesDistribution[role] = (rolesDistribution[role] || 0) + 1;
        });

        res.json({
            ...userStats,
            registrations: registrationData,
            activityByDay,
            rolesDistribution
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Получить логи (используем данные из БД)
router.get('/logs', authenticate, isAdmin, async (req, res) => {
    try {
        // Создаем логи на основе действий пользователей
        const users = await User.getAll();
        const reports = await Report.getAll();
        const logs = [];

        // Логи из последних входов
        users.forEach(user => {
            if (user.last_login_at) {
                logs.push({
                    time: user.last_login_at,
                    level: 'info',
                    message: `Пользователь ${user.name} (${user.email}) вошел в систему`
                });
            }
        });

        // Логи из репортов (если таблица существует)
        if (reports && reports.length > 0) {
            reports.forEach(report => {
                logs.push({
                    time: report.created_at,
                    level: report.report_status === 'Новое' ? 'warning' : 'info',
                    message: `Создан репорт: ${report.title} от пользователя ${report.user_name || 'Неизвестно'}`
                });
            });
        }

        // Сортируем по дате (новые сначала)
        logs.sort((a, b) => new Date(b.time) - new Date(a.time));

        res.json(logs.slice(0, 100)); // Возвращаем последние 100 записей
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

