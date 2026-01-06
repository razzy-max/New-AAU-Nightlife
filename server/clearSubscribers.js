import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const clearSubscribers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const result = await mongoose.connection.db.collection('subscribers').deleteMany({});
    console.log(`Deleted ${result.deletedCount} subscribers`);

    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

clearSubscribers();
