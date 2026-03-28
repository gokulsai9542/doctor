require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name:           String,
  email:          { type: String, unique: true },
  password:       String,
  role:           String,
  specialization: String,
  organization:   String,
  earnings:       { type: Number, default: 0 },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB...');

  const existing = await User.findOne({ email: 'admin@medannotate.com' });
  if (existing) {
    // Update password in case credentials changed
    const hashed = await bcrypt.hash('Admin@2025', 10);
    await User.findOneAndUpdate({ email: 'admin@medannotate.com' }, { password: hashed });
    console.log('Admin credentials updated!');
    console.log('Email   : admin@medannotate.com');
    console.log('Password: Admin@2025');
    process.exit(0);
  }

  const hashed = await bcrypt.hash('Admin@2025', 10);
  await User.create({
    name:     'Admin',
    email:    'admin@medannotate.com',
    password: hashed,
    role:     'admin',
  });

  console.log('✅ Admin created successfully!');
  console.log('Email   : admin@medannotate.com');
  console.log('Password: Admin@2025');
  process.exit(0);
};

seed().catch(err => { console.error(err); process.exit(1); });
