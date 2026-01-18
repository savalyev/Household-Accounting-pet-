const express = require('express');
const jwt = require('jsonwebtoken');
const Income = require('../models/incomeModel');
const Expense = require('../models/expenseModel');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

function authMiddleware(req, res, next) {
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

function normalizeTransactionBody(body) {
    const amount = Number(body.amount);
    const category_id = body.category_id !== undefined && body.category_id !== null 
        ? Number(body.category_id) 
        : null;
    const description = body.description || '';
    const transaction_date = body.transaction_date
        ? new Date(body.transaction_date)
        : new Date();
    const is_recurring = Boolean(body.is_recurring);
    const recurring_interval = body.recurring_interval || null;

    if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error('Некорректная сумма');
    }

    if (category_id === null || category_id === undefined) {
        throw new Error('Категория обязательна для заполнения');
    }

    if (!Number.isInteger(category_id) || category_id <= 0) {
        throw new Error('Некорректный ID категории');
    }

    return {
        amount,
        category_id,
        description,
        transaction_date,
        is_recurring,
        recurring_interval,
    };
}

router.post('/income', authMiddleware, async (req, res) => {
    try {
        const data = normalizeTransactionBody(req.body);
        const income = await Income.create({
            ...data,
            id_user: req.userId,
        });
        res.status(201).json(income);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.post('/expenses', authMiddleware, async (req, res) => {
    try {
        const data = normalizeTransactionBody(req.body);
        const expense = await Expense.create({
            ...data,
            id_user: req.userId,
        });
        res.status(201).json(expense);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.get('/stats', authMiddleware, async (req, res) => {
    try {
        const incomeTotal = await Income.getTotalByUser(req.userId);
        const expenseTotal = await Expense.getTotalByUser(req.userId);
        const total = incomeTotal - expenseTotal;

        res.json({
            income: incomeTotal,
            expenses: expenseTotal,
            total: total
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/list', authMiddleware, async (req, res) => {
    try {
        const incomes = await Income.getByUser(req.userId);
        const expenses = await Expense.getByUser(req.userId);

        const transactions = [
            ...incomes.map(tx => ({ ...tx, type: 'income' })),
            ...expenses.map(tx => ({ ...tx, type: 'expense' }))
        ].sort((a, b) => {
            const dateA = new Date(a.transaction_date);
            const dateB = new Date(b.transaction_date);
            return dateB - dateA;
        });

        res.json(transactions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/expenses-by-categories', authMiddleware, async (req, res) => {
    try {
        const categories = await Expense.getByCategories(req.userId);
        res.json(categories);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/reset', authMiddleware, async (req, res) => {
    try {
        const incomeCount = await Income.deleteAllByUser(req.userId);
        const expenseCount = await Expense.deleteAllByUser(req.userId);
        
        res.json({
            message: 'Статистика сброшена',
            deleted: {
                income: incomeCount,
                expenses: expenseCount
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/export', authMiddleware, async (req, res) => {
    try {
        const incomes = await Income.getByUser(req.userId);
        const expenses = await Expense.getByUser(req.userId);

        const transactions = [
            ...incomes.map(tx => ({ ...tx, type: 'income' })),
            ...expenses.map(tx => ({ ...tx, type: 'expense' }))
        ].sort((a, b) => {
            const dateA = new Date(a.transaction_date);
            const dateB = new Date(b.transaction_date);
            return dateB - dateA;
        });

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="transactions_${Date.now()}.json"`);
        res.json(transactions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

