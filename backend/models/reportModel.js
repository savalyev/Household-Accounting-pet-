const db = require('../database/db');

class Report {
    static async create(data) {
        const {
            title,
            description = '',
            report_status = 'Новое',
            id_user,
        } = data;

        const result = await db.query(
            `INSERT  INTO reports (title, description, report_status, id_user)
            VALUES ($1, $2, $3, $4)
            RETURNING id, title, description, report_status, id_user, created_at`,
            [
                title,
                description,
                report_status,
                id_user,
            ]
        );

        return result.rows[0];
    }

    static async getAll() {
        try {
            const result = await db.query(
                `SELECT r.id, r.title, r.description, r.report_status, r.id_user, r.created_at,
                        u.name as user_name, u.email as user_email
                 FROM reports r
                 LEFT JOIN users u ON r.id_user = u.id
                 ORDER BY r.created_at DESC`
            );
            return result.rows;
        } catch (error) {
            // Таблица reports не существует, возвращаем пустой массив
            if (error.message.includes('does not exist') || error.message.includes('relation')) {
                console.warn('Таблица reports не найдена. Создайте её используя create_reports_table.sql');
                return [];
            }
            throw error;
        }
    }

    static async getById(id) {
        try {
            const result = await db.query(
                `SELECT r.id, r.title, r.description, r.report_status, r.id_user, r.created_at,
                        u.name as user_name, u.email as user_email
                 FROM reports r
                 LEFT JOIN users u ON r.id_user = u.id
                 WHERE r.id = $1`,
                [id]
            );
            return result.rows[0];
        } catch (error) {
            // Таблица reports не существует
            if (error.message.includes('does not exist') || error.message.includes('relation')) {
                console.warn('Таблица reports не найдена. Создайте её используя create_reports_table.sql');
                return null;
            }
            throw error;
        }
    }

    static async updateStatus(id, status) {
        const result = await db.query(
            `UPDATE reports SET report_status = $1 WHERE id = $2
             RETURNING id, title, description, report_status, id_user, created_at`,
            [status, id]
        );
        return result.rows[0];
    }

    static async delete(id) {
        const result = await db.query(
            'DELETE FROM reports WHERE id = $1 RETURNING id',
            [id]
        );
        return result.rows[0];
    }
}

module.exports = Report;