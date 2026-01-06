const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const bcrypt = require('bcryptjs');
const db = require('../src/config/db');
const User = require('../src/models/User');

const adminEmail = 'admin@example.com';
const adminPassword = 'AdminPass123';

const run = async () => {
  await db.connect();

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await User.findOneAndUpdate(
    { email: adminEmail },
    {
      firstName: 'Admin',
      lastName: 'User',
      email: adminEmail,
      phone: '+10000000000',
      passwordHash,
      role: 'ADMIN',
      isActive: true
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log('Admin ready:', { id: admin._id.toString(), email: admin.email });
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
