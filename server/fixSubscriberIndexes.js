import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const fixSubscriberIndexes = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const collection = mongoose.connection.db.collection('subscribers');
    
    // Get current indexes
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes);

    // Drop the old email index if it exists
    for (const index of indexes) {
      if (index.key && index.key.email !== undefined) {
        console.log('Found old email index, dropping it...');
        await collection.dropIndex(index.name);
        console.log('Dropped email index:', index.name);
      }
    }

    // Verify indexes after fix
    const newIndexes = await collection.indexes();
    console.log('Indexes after fix:', newIndexes);

    await mongoose.connection.close();
    console.log('Database connection closed');
    console.log('Fix complete! You can now add multiple subscribers.');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

fixSubscriberIndexes();
