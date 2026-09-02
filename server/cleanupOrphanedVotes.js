import dotenv from 'dotenv';
import Vote from './models/Vote.js';
import Category from './models/Category.js';
import Candidate from './models/Candidate.js';
import connectDB from './config.js';

dotenv.config();

const cleanupOrphanedVotes = async () => {
  try {
    await connectDB();
    console.log('Connected to MongoDB');

    const votes = await Vote.find({}).select('_id category candidate');
    console.log(`Found ${votes.length} vote(s) to check`);

    let removed = 0;
    for (const vote of votes) {
      const [categoryExists, candidateExists] = await Promise.all([
        Category.exists({ _id: vote.category }),
        Candidate.exists({ _id: vote.candidate }),
      ]);

      if (!categoryExists || !candidateExists) {
        await Vote.deleteOne({ _id: vote._id });
        removed += 1;
        console.log(`  removed orphaned vote ${vote._id}`);
      }
    }

    console.log(`Removed ${removed} orphaned vote(s)`);
    process.exit(0);
  } catch (error) {
    console.error('Error cleaning up orphaned votes:', error);
    process.exit(1);
  }
};

cleanupOrphanedVotes();
