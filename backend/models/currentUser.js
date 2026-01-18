class CurrentUser {
    // Возвращает нормализованные данные текущего пользователя
    static create(userData) {
        const { name = '', email = '', created_at } = userData;
        return {
            name,
            email,
            created_at: created_at || new Date().toISOString(),
        };
    }
}

module.exports = CurrentUser;
