const path = require('path');

// Load .env relative to this file so it works regardless of the cwd
require('dotenv').config({ path: path.join(__dirname, '.env') });

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not set. Add it to the .env file.');
}
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const db = require('./src/config/db');

const authRoutes = require('./src/routes/authRoutes');
const locationRoutes = require('./src/routes/locationRoutes');
const categoryRoutes = require('./src/routes/categoryRoutes');
const adminCategoryRoutes = require('./src/routes/adminCategoryRoutes');
const providerRoutes = require('./src/routes/providerRoutes');
const requestRoutes = require('./src/routes/requestRoutes');
const ratingRoutes = require('./src/routes/ratingRoutes');
const walletRoutes = require('./src/routes/walletRoutes');
const adminWalletRoutes = require('./src/routes/adminWalletRoutes');
const adminUserRoutes = require('./src/routes/adminUserRoutes');
const adminProviderRoutes = require('./src/routes/adminProviderRoutes');
const adminDashboardRoutes = require('./src/routes/adminDashboardRoutes');
const errorHandler = require('./src/middlewares/errorHandler');

const app = express();
db.connect();

app.use(express.json());
app.use(morgan('dev'));
app.use(cors());

app.use('/auth', authRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/admin/categories', adminCategoryRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/admin/wallet', adminWalletRoutes);
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/admin/providers', adminProviderRoutes);
app.use('/api/admin', adminDashboardRoutes);

app.use(errorHandler);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
