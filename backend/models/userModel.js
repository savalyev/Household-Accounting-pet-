const db = require('../database/db');
const bcrypt = require('bcryptjs');

class User{
    static async create(userData){
        const { name, email, password } = userData;
        
        if (!password || password.length < 6) {
            throw new Error('Пароль должен содержать минимум 6 символов');
        }

        // Проверяем существование email
        const existing = await this.findByEmail(email);
        if (existing) {
            throw new Error('Такой пользователь уже существует');
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const result = await db.query(
            `INSERT INTO users (name, email, password_hash)
             VALUES ($1, $2, $3)
             RETURNING id, name, email, created_at, last_login_at, email_verified, is_active`,
            [name, email, passwordHash]
        );
        return result.rows[0];
    }

    static async findByEmail(email){
        const result = await db.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
        );
        return result.rows[0];
    }

    static async findById(id){
        const result = await db.query(
            'SELECT id, name, email, created_at, last_login_at, email_verified, is_active, role, avatar_url FROM users WHERE id = $1',
            [id]
        );
        return result.rows[0];
    }

    static async findByIdWithPassword(id){
        const result = await db.query(
            'SELECT * FROM users WHERE id = $1',
            [id]
        );
        return result.rows[0];
    }

    static async updateEmail(id, email){
        const result = await db.query(
            'UPDATE users SET email = $1 WHERE id = $2 RETURNING id, name, email',
            [email, id]
        );
        return result.rows[0];
    }

    static async updatePassword(id, newPassword){
        if (!newPassword || newPassword.length < 6) {
            throw new Error('Пароль должен содержать минимум 6 символов');
        }
        const passwordHash = await bcrypt.hash(newPassword, 10);
        const result = await db.query(
            'UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING id, name, email',
            [passwordHash, id]
        );
        return result.rows[0];
    }

    static async updateAvatar(id, avatarUrl) {
        const result = await db.query(
            'UPDATE users SET avatar_url = $1 WHERE id = $2 RETURNING id, name, email, avatar_url',
            [avatarUrl, id]
        );
        return result.rows[0];
    }

    static async setVerificationToken(id, token, expires) {
        const result = await db.query(
            `UPDATE users SET email_verification_token = $1, email_verification_expires = $2 
             WHERE id = $3 RETURNING id`,
            [token, expires, id]
        );
        return result.rows[0];
    }

    static async findByVerificationToken(token) {
        const result = await db.query(
            `SELECT * FROM users 
             WHERE email_verification_token = $1 
             AND email_verification_expires > NOW()`,
            [token]
        );
        return result.rows[0];
    }

    static async verifyEmail(id) {
        const result = await db.query(
            `UPDATE users SET email_verified = true, 
             email_verification_token = NULL, 
             email_verification_expires = NULL 
             WHERE id = $1 RETURNING id, name, email, email_verified`,
            [id]
        );
        return result.rows[0];
    }

    static async updateLastLogin(id){
        const result = await db.query(
            'UPDATE users SET last_login_at = NOW() WHERE id = $1 RETURNING id, name, email, created_at, last_login_at, email_verified, is_active',
            [id]
        );
        return result.rows[0];
    }

    // Админ-методы
    static async getAll() {
        const result = await db.query(
            `SELECT id, name, email, created_at, last_login_at, email_verified, is_active, role
             FROM users
             ORDER BY created_at DESC`
        );
        return result.rows;
    }

    static async getById(id) {
        const result = await db.query(
            `SELECT id, name, email, created_at, last_login_at, email_verified, is_active, role
             FROM users
             WHERE id = $1`,
            [id]
        );
        return result.rows[0];
    }

    static async updateStatus(id, is_active) {
        const result = await db.query(
            `UPDATE users SET is_active = $1 WHERE id = $2
             RETURNING id, name, email, created_at, last_login_at, email_verified, is_active, role`,
            [is_active, id]
        );
        return result.rows[0];
    }

    static async updateRole(id, role) {
        const result = await db.query(
            `UPDATE users SET role = $1 WHERE id = $2
             RETURNING id, name, email, created_at, last_login_at, email_verified, is_active, role`,
            [role, id]
        );
        return result.rows[0];
    }

    static async delete(id) {
        const result = await db.query(
            'DELETE FROM users WHERE id = $1 RETURNING id',
            [id]
        );
        return result.rows[0];
    }

    static async getStats() {
        const totalUsers = await db.query('SELECT COUNT(*) as count FROM users');
        const activeToday = await db.query(
            `SELECT COUNT(DISTINCT id) as count 
             FROM users 
             WHERE DATE(last_login_at) = CURRENT_DATE`
        );
        const blockedUsers = await db.query(
            `SELECT COUNT(*) as count FROM users WHERE is_active = false`
        );
        
        // Проверяем наличие таблицы reports
        let newReports = { rows: [{ count: '0' }] };
        try {
            newReports = await db.query(
                `SELECT COUNT(*) as count FROM reports WHERE report_status = 'Новое'`
            );
        } catch (error) {
            // Таблица reports не существует, возвращаем 0
            console.warn('Таблица reports не найдена. Создайте её используя create_reports_table.sql');
        }

        return {
            totalUsers: parseInt(totalUsers.rows[0].count),
            activeToday: parseInt(activeToday.rows[0].count),
            blockedUsers: parseInt(blockedUsers.rows[0].count),
            newReports: parseInt(newReports.rows[0].count)
        };
    }

    static async getUserStats(userId) {
        const incomeTotal = await db.query(
            `SELECT COALESCE(SUM(amount), 0) as total FROM income WHERE id_user = $1`,
            [userId]
        );
        const expenseTotal = await db.query(
            `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE id_user = $1`,
            [userId]
        );
        const transactionsCount = await db.query(
            `SELECT 
                (SELECT COUNT(*) FROM income WHERE id_user = $1) +
                (SELECT COUNT(*) FROM expenses WHERE id_user = $1) as count`,
            [userId]
        );
        // Проверяем наличие таблицы reports
        let reportsCount = { rows: [{ count: '0' }] };
        try {
            reportsCount = await db.query(
                `SELECT COUNT(*) as count FROM reports WHERE id_user = $1`,
                [userId]
            );
        } catch (error) {
            // Таблица reports не существует, возвращаем 0
            console.warn('Таблица reports не найдена. Создайте её используя create_reports_table.sql');
        }

        return {
            totalIncome: parseFloat(incomeTotal.rows[0].total),
            totalExpenses: parseFloat(expenseTotal.rows[0].total),
            transactionsCount: parseInt(transactionsCount.rows[0].count),
            reportsCount: parseInt(reportsCount.rows[0].count)
        };
    }
}

module.exports = User;