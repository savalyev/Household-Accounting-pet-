const db = require('../database/db');

class Income {
    static async create(data) {
        const {
            id_user,
            amount,
            category_id,
            description = '',
            transaction_date,
            is_recurring = false,
            recurring_interval = null,
        } = data;

        if (!category_id || !Number.isInteger(category_id) || category_id <= 0) {
            throw new Error('Категория обязательна для заполнения');
        }

        const result = await db.query(
            `INSERT INTO income (id_user, amount, category_id, description, transaction_date, is_recurring, recurring_interval)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id, id_user, amount, category_id, description, transaction_date, is_recurring, recurring_interval`,
            [
                id_user,
                amount,
                category_id,
                description || '',
                transaction_date,
                is_recurring,
                recurring_interval,
            ]
        );

        return result.rows[0];
    }

    static async getByUser(id_user) {
        const result = await db.query(
            `SELECT id, id_user, amount, category_id, description, transaction_date, is_recurring, recurring_interval
             FROM income
             WHERE id_user = $1
             ORDER BY transaction_date DESC, id DESC`,
            [id_user]
        );
        return result.rows;
    }

    static async getTotalByUser(id_user) {
        const result = await db.query(
            `SELECT COALESCE(SUM(amount), 0) as total
             FROM income
             WHERE id_user = $1`,
            [id_user]
        );
        return parseFloat(result.rows[0].total);
    }

    static async deleteAllByUser(id_user) {
        const result = await db.query(
            `DELETE FROM income WHERE id_user = $1 RETURNING id`,
            [id_user]
        );
        return result.rowCount;
    }
}

module.exports = Income;

