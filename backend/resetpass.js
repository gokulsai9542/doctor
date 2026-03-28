const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');

async function resetUserPassword(email, newPassword) {
  await mongoose.connect(process.env.MONGO_URI);
  const hashed = await bcrypt.hash(newPassword, 10);
  const user = await User.findOneAndUpdate(
    { email },
    { password: hashed, resetToken: undefined, resetTokenExpiry: undefined },
    { new: true }
  );
  if (!user) {
    console.log(`❌ No user found with email: ${email}`);
  } else {
    console.log(`✅ Password reset for: ${user.email} (role: ${user.role})`);
  }
  await mongoose.disconnect();
}

resetUserPassword('gokulsai021@gmail.com', 'newpass123');
