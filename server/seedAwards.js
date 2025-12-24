import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Category from './models/Category.js';
import Candidate from './models/Candidate.js';
import connectDB from './config.js';

dotenv.config();

const seedAwards = async () => {
  try {
    await connectDB();
    console.log('Connected to MongoDB');

    // Clear existing data
    await Category.deleteMany({});
    await Candidate.deleteMany({});

    // Create categories
    const now = new Date();
    now.setHours(9, 0, 0, 0); // 9:00 AM
    
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    tomorrow.setHours(9, 0, 0, 0); // 9:00 AM
    
    const startTime = new Date(now);
    startTime.setHours(9, 0, 0, 0); // 9:00 AM
    
    const endTime = new Date(now);
    endTime.setDate(endTime.getDate() + 7);
    endTime.setHours(17, 0, 0, 0); // 5:00 PM
    
    const endTime2 = new Date(now);
    endTime2.setDate(endTime2.getDate() + 14);
    endTime2.setHours(17, 0, 0, 0); // 5:00 PM

    const categories = await Category.insertMany([
      {
        name: 'Best Dressed',
        description: 'Award for the best dressed personality at AAU Nightlife',
        startDate: startTime,
        endDate: endTime,
        status: 'active',
        pricingType: 'paid',
        pricePerVote: 150,
        totalVotes: 0,
      },
      {
        name: 'Most Popular',
        description: 'Award for the most popular student on campus',
        startDate: startTime,
        endDate: endTime,
        status: 'active',
        pricingType: 'free',
        pricePerVote: 0,
        totalVotes: 0,
      },
      {
        name: 'Best Event Host',
        description: 'Award for the best event organizer and host',
        startDate: tomorrow,
        endDate: endTime2,
        status: 'upcoming',
        pricingType: 'paid',
        pricePerVote: 200,
        totalVotes: 0,
      },
    ]);

    // Create candidates
    const candidates = await Candidate.insertMany([
      {
        name: 'Chioma Adeyemi',
        category: categories[0]._id,
        description: 'Fashion-forward and always stylish',
        voteCount: 0,
        freeVotes: 0,
        paidVotes: 0,
      },
      {
        name: 'David Okonkwo',
        category: categories[0]._id,
        description: 'Impeccable taste in fashion',
        voteCount: 0,
        freeVotes: 0,
        paidVotes: 0,
      },
      {
        name: 'Zainab Ibrahim',
        category: categories[0]._id,
        description: 'Trendsetter on campus',
        voteCount: 0,
        freeVotes: 0,
        paidVotes: 0,
      },
      {
        name: 'Tunde Adeleke',
        category: categories[1]._id,
        description: 'Everyone knows and loves Tunde',
        voteCount: 0,
        freeVotes: 0,
        paidVotes: 0,
      },
      {
        name: 'Blessing Uche',
        category: categories[1]._id,
        description: 'The heart of every gathering',
        voteCount: 0,
        freeVotes: 0,
        paidVotes: 0,
      },
      {
        name: 'Oluseun Olayinka',
        category: categories[1]._id,
        description: 'Campus favorite and influencer',
        voteCount: 0,
        freeVotes: 0,
        paidVotes: 0,
      },
      {
        name: 'Amara Nwosu',
        category: categories[2]._id,
        description: 'Organizes amazing events',
        voteCount: 0,
        freeVotes: 0,
        paidVotes: 0,
      },
      {
        name: 'Chukwu Mbaka',
        category: categories[2]._id,
        description: 'Creates memorable experiences',
        voteCount: 0,
        freeVotes: 0,
        paidVotes: 0,
      },
    ]);

    console.log(`✅ Seeded ${categories.length} categories`);
    console.log(`✅ Seeded ${candidates.length} candidates`);
    console.log('Awards data seeded successfully!');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedAwards();
