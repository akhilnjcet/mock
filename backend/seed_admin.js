const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function seedAdmin() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mcq_mock_test';
  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB');

  const existing = await User.findOne({ username: 'admin' });
  if (existing) {
    console.log('ℹ️  Admin user already exists. Skipping.');
    await mongoose.disconnect();
    return;
  }

  await User.create({
    fullName: 'System Administrator',
    email: 'admin@mcqmock.local',
    phone: '9999999999',
    username: 'admin',
    password: 'Admin@1234',
    role: 'admin',
    status: 'active'
  });

  console.log('');
  console.log('🎉 Admin user created successfully!');
  console.log('   Username : admin');
  console.log('   Password : Admin@1234');
  console.log('   ⚠️  Change this password after first login!');
  console.log('');

  await mongoose.disconnect();
  console.log('MongoDB disconnected.');
}

seedAdmin().catch(err => {
  console.error('❌ Error seeding admin:', err.message);
  process.exit(1);
});
