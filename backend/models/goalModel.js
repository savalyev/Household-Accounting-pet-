const db = require('../database/db');

class Goal {
    static async create(data) {
        const {
            id_user,
            title,
            target_amount,
            current_amount = 0,
            deadline = null,
            status = 'active'
        } = data;

        if (!title || title.trim().length === 0) {
            throw new Error('Название цели обязательно');
        }

        const result = await db.query(
            `INSERT INTO goals (id_user, title, target_amount, current_amount, deadline, status)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, id_user, title, target_amount, current_amount, deadline, status, created_at`,
            [id_user, title.trim(), target_amount || 0, current_amount || 0, deadline, status]
        );

        return result.rows[0];
    }

    static async getByUser(id_user) {
        const result = await db.query(
            `SELECT id, id_user, title, target_amount, current_amount, deadline, status, created_at
             FROM goals
             WHERE id_user = $1
             ORDER BY created_at DESC, id DESC`,
            [id_user]
        );
        return result.rows;
    }

    static async update(id, id_user, data) {
        const fields = [];
        const values = [];
        let idx = 1;

        const pushField = (field, value) => {
            fields.push(`${field} = $${idx}`);
            values.push(value);
            idx += 1;
        };

        if (data.title !== undefined) pushField('title', data.title.trim());
        if (data.target_amount !== undefined) pushField('target_amount', data.target_amount);
        if (data.current_amount !== undefined) pushField('current_amount', data.current_amount);
        if (data.deadline !== undefined) pushField('deadline', data.deadline);
        if (data.status !== undefined) pushField('status', data.status);

        if (!fields.length) {
            throw new Error('Нет данных для обновления');
        }

        values.push(id_user);
        values.push(id);

        const result = await db.query(
            `UPDATE goals
             SET ${fields.join(', ')}, updated_at = NOW()
             WHERE id_user = $${idx} AND id = $${idx + 1}
             RETURNING id, id_user, title, target_amount, current_amount, deadline, status, created_at, updated_at`,
            values
        );

        return result.rows[0];
    }

    static async delete(id, id_user) {
        const result = await db.query(
            `DELETE FROM goals WHERE id = $1 AND id_user = $2 RETURNING id`,
            [id, id_user]
        );
        return result.rowCount;
    }
}

module.exports = Goal;



