const path = require('path');
require('dotenv').config({ 
  path: path.join(__dirname, '.env.backend') 
});
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const adminRoutes = require('./routes/admin');
const reportRoutes = require('./routes/reports');
const goalsRoutes = require('./routes/goals');

const app = express();
const PORT = process.env.PORT;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/goals', goalsRoutes);

app.get('/api/test', (req, res) => {
    res.json({ message: 'API работает' });
});

app.use(express.static('../JS'));

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});