import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Ticket from './models/Ticket.js';
import connectDB from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from parent directory
dotenv.config({ path: path.join(__dirname, '.env') });

const clearTickets = async () => {
  try {
    await connectDB();

    console.log('🗑️  Clearing all ticket data...');
    
    const result = await Ticket.deleteMany({});
    
    console.log(`✅ Successfully deleted ${result.deletedCount} ticket(s)`);
    console.log('📊 Ticket collection is now empty');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing tickets:', error);
    process.exit(1);
  }
};

clearTickets();
