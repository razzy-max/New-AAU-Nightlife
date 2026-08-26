import dotenv from 'dotenv';
import Event from './models/Event.js';
import connectDB from './config.js';
import { generateUniqueSlug } from './utils/slug.js';

dotenv.config();

const backfillEventSlugs = async () => {
  try {
    await connectDB();
    console.log('Connected to MongoDB');

    const events = await Event.find({
      $or: [{ slug: { $exists: false } }, { slug: null }, { slug: '' }],
    }).sort({ createdAt: 1 });

    console.log(`Found ${events.length} events without a slug`);

    for (const event of events) {
      event.slug = await generateUniqueSlug(event.title, Event, event._id);
      await event.save();
      console.log(`  ${event._id} -> ${event.slug}`);
    }

    console.log(`Backfilled ${events.length} event slugs`);
    process.exit(0);
  } catch (error) {
    console.error('Error backfilling event slugs:', error);
    process.exit(1);
  }
};

backfillEventSlugs();
