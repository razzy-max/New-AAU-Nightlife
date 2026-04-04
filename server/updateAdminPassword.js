import dotenv from 'dotenv';
import User from './models/User.js';
import connectDB from './config.js';

dotenv.config();

const newPassword = process.argv[2] || 'aau2026nightlife';

const updateAdminPassword = async () => {
  try {
    await connectDB();

    const adminUser = await User.findOne({
      $or: [
        { username: 'NightlifeAdmin' },
        { email: 'admin@aau-nightlife.com' },
      ],
    });

    if (!adminUser) {
      console.log('No admin user found to update.');
      process.exit(0);
    }

    adminUser.password = newPassword;
    await adminUser.save();

    console.log('Admin password updated successfully.');
    console.log(`Username: ${adminUser.username || 'NightlifeAdmin'}`);
    console.log(`Email: ${adminUser.email}`);
    process.exit(0);
  } catch (error) {
    console.error('Error updating admin password:', error);
    process.exit(1);
  }
};

updateAdminPassword();