const express = require('express');
const jwt = require('jsonwebtoken');
const Goal = require('../models/goalModel');

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

// Список целей пользователя
router.get('/', authenticate, async (req, res) => {
    try {
        const goals = await Goal.getByUser(req.userId);
        res.json(goals);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Создание цели
router.post('/', authenticate, async (req, res) => {
    try {
        const { title, target_amount, current_amount, deadline, status } = req.body;
        const goal = await Goal.create({
            id_user: req.userId,
            title,
            target_amount,
            current_amount,
            deadline,
            status
        });
        res.status(201).json(goal);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Обновление цели
router.put('/:id', authenticate, async (req, res) => {
    try {
        const goal = await Goal.update(req.params.id, req.userId, req.body || {});
        if (!goal) {
            return res.status(404).json({ error: 'Цель не найдена' });
        }
        res.json(goal);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Удаление цели
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const deleted = await Goal.delete(req.params.id, req.userId);
        if (!deleted) {
            return res.status(404).json({ error: 'Цель не найдена' });
        }
        res.json({ message: 'Цель удалена', id: req.params.id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;



