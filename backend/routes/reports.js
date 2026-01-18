const express = require('express');
const jwt = require('jsonwebtoken');
const Report = require('../models/reportModel');

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

// Создать репорт
router.post('/', authenticate, async (req, res) => {
    try {
        const { title, description } = req.body;
        
        if (!title || title.trim().length === 0) {
            return res.status(400).json({ error: 'Название репорта обязательно' });
        }
        
        if (title.length > 255) {
            return res.status(400).json({ error: 'Название репорта слишком длинное (максимум 255 символов)' });
        }

        const report = await Report.create({
            title: title.trim(),
            description: description ? description.trim() : '',
            report_status: 'Новое',
            id_user: req.userId
        });

        res.status(201).json({
            message: 'Репорт успешно отправлен',
            report
        });
    } catch (error) {
        // Если таблица не существует
        if (error.message.includes('does not exist') || error.message.includes('relation')) {
            return res.status(500).json({ error: 'Таблица reports не найдена. Обратитесь к администратору.' });
        }
        res.status(500).json({ error: error.message });
    }
});

// Получить репорты текущего пользователя
router.get('/my', authenticate, async (req, res) => {
    try {
        const db = require('../database/db');
        const result = await db.query(
            `SELECT id, title, description, report_status, created_at
             FROM reports
             WHERE id_user = $1
             ORDER BY created_at DESC`,
            [req.userId]
        );
        res.json(result.rows);
    } catch (error) {
        // Если таблица не существует
        if (error.message.includes('does not exist') || error.message.includes('relation')) {
            return res.json([]);
        }
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

