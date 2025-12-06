import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Blog from './models/Blog.js';
import Event from './models/Event.js';
import Job from './models/Job.js';
import Carousel from './models/Carousel.js';
import connectDB from './config.js';

dotenv.config();

const seedData = async () => {
  try {
    await connectDB();

    // Seed admin user if not exists
    let adminCreated = false;
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (!existingAdmin) {
      const adminUser = new User({
        username: 'NightlifeAdmin',
        email: 'admin@aau-nightlife.com',
        password: 'ANadmin2026', // This will be hashed by the pre-save hook
        role: 'admin',
      });
      await adminUser.save();
      console.log('Admin user created successfully!');
      adminCreated = true;
    }

    // Seed Carousel Data if not exists
    const existingCarousel = await Carousel.findOne();
    if (!existingCarousel) {
      const carouselData = [
        {
          title: 'Welcome to AAU Nightlife',
          image: '/banner/banner1.jpg',
          altText: 'AAU Nightlife Banner 1',
          link: '/events',
          order: 1,
          description: 'Discover amazing events and activities',
        },
        {
          title: 'Join Our Community',
          image: '/banner/banner2.jpg',
          altText: 'AAU Nightlife Banner 2',
          link: '/blogs',
          order: 2,
          description: 'Read our latest blogs and updates',
        },
        {
          title: 'Find Your Next Opportunity',
          image: '/banner/banner3.jpg',
          altText: 'AAU Nightlife Banner 3',
          link: '/jobs',
          order: 3,
          description: 'Explore job opportunities',
        },
        {
          title: 'Experience the Nightlife',
          image: '/banner/banner4.jpg',
          altText: 'AAU Nightlife Banner 4',
          link: '/events',
          order: 4,
          description: 'Unforgettable experiences await',
        },
        {
          title: 'Stay Connected',
          image: '/banner/banner5.jpg',
          altText: 'AAU Nightlife Banner 5',
          link: '/blogs',
          order: 5,
          description: 'Keep up with the latest news',
        },
      ];
      await Carousel.insertMany(carouselData);
      console.log('Carousel data seeded!');
    }

    // Seed Blog Data if not exists
    const existingBlogs = await Blog.findOne();
    if (!existingBlogs) {
      const blogData = [
        {
          title: 'Welcome to AAU Nightlife Community',
          excerpt: 'Discover the vibrant nightlife scene at AAU and connect with fellow students.',
          content: 'AAU Nightlife is your gateway to an exciting campus life filled with events, activities, and opportunities. Whether you\'re looking for social gatherings, career opportunities, or just a place to unwind, we\'ve got you covered.',
          author: 'AAU Nightlife Team',
          category: 'General',
          image: '/blog/blog1.jpg',
          tags: ['welcome', 'community', 'campus'],
          featured: true,
          published: true,
        },
        {
          title: 'Upcoming Events This Semester',
          excerpt: 'Check out the exciting events planned for this semester.',
          content: 'This semester promises to be filled with amazing events including movie nights, bonfires, hangouts, and much more. Stay tuned for updates and don\'t miss out on the fun!',
          author: 'Events Committee',
          category: 'Events',
          image: '/blog/blog2.jpg',
          tags: ['events', 'semester', 'activities'],
          featured: true,
          published: true,
        },
        {
          title: 'Career Opportunities in Hospitality',
          excerpt: 'Explore the growing field of hospitality and event management.',
          content: 'The hospitality industry offers exciting career paths for students interested in event planning, hotel management, and tourism. Learn about the opportunities available and how to get started.',
          author: 'Career Services',
          category: 'Jobs',
          image: '/blog/blog3.jpg',
          tags: ['careers', 'hospitality', 'jobs'],
          featured: false,
          published: true,
        },
      ];
      await Blog.insertMany(blogData);
      console.log('Blog data seeded!');
    }

    // Seed Event Data if not exists
    const existingEvents = await Event.findOne();
    if (!existingEvents) {
      const eventData = [
        {
          title: 'Bonfire Night',
          description: 'Join us for a relaxing bonfire evening with music, food, and great company. Perfect way to unwind and meet new people.',
          shortDescription: 'Relaxing bonfire with music and food',
          date: new Date('2025-12-15'),
          time: '7:00 PM',
          location: 'Campus Green Area',
          image: '/events/Bonfire.png',
          capacity: 100,
          price: 0,
          category: 'Social',
          organizer: 'AAU Nightlife',
          contactEmail: 'events@aau-nightlife.com',
          featured: true,
          published: true,
          tags: ['bonfire', 'social', 'music'],
        },
        {
          title: 'Movie AMA Session',
          description: 'Watch popular movies and participate in Ask Me Anything sessions with guest speakers from the film industry.',
          shortDescription: 'Movie screening with AMA session',
          date: new Date('2025-12-20'),
          time: '6:00 PM',
          location: 'Campus Auditorium',
          image: '/events/MovieAMA.jpg',
          capacity: 200,
          price: 500,
          category: 'Cultural',
          organizer: 'Film Club',
          contactEmail: 'filmclub@aau-nightlife.com',
          featured: true,
          published: true,
          tags: ['movie', 'ama', 'cultural'],
        },
        {
          title: 'Campus Hangout',
          description: 'Casual hangout session for students to relax, play games, and socialize.',
          shortDescription: 'Casual student hangout',
          date: new Date('2025-12-10'),
          time: '4:00 PM',
          location: 'Student Center',
          image: '/events/Hangout.jpg',
          capacity: 50,
          price: 0,
          category: 'Social',
          organizer: 'Student Council',
          contactEmail: 'council@aau-nightlife.com',
          featured: false,
          published: true,
          tags: ['hangout', 'social', 'games'],
        },
      ];
      await Event.insertMany(eventData);
      console.log('Event data seeded!');
    }

    // Seed Job Data if not exists
    const existingJobs = await Job.findOne();
    if (!existingJobs) {
      const jobData = [
        {
          title: 'Event Coordinator',
          company: 'AAU Nightlife',
          location: 'Campus',
          description: 'Coordinate and manage various campus events and activities. Work with teams to ensure successful execution of events.',
          requirements: 'Strong organizational skills, experience in event planning preferred, good communication skills.',
          salary: '25,000 - 35,000 NGN/month',
          type: 'Part-time',
          category: 'Event Management',
          applicationDeadline: new Date('2025-12-31'),
          contactEmail: 'jobs@aau-nightlife.com',
          image: '/blog/blog1.jpg',
          featured: true,
          published: true,
          tags: ['event', 'coordinator', 'management'],
        },
        {
          title: 'Social Media Manager',
          company: 'AAU Nightlife',
          location: 'Remote/Campus',
          description: 'Manage social media accounts, create content, and engage with the campus community online.',
          requirements: 'Experience with social media platforms, content creation skills, basic graphic design knowledge.',
          salary: '20,000 - 30,000 NGN/month',
          type: 'Part-time',
          category: 'Marketing',
          applicationDeadline: new Date('2025-12-25'),
          contactEmail: 'jobs@aau-nightlife.com',
          image: '/blog/blog2.jpg',
          featured: false,
          published: true,
          tags: ['social media', 'marketing', 'content'],
        },
        {
          title: 'Hospitality Intern',
          company: 'Campus Hotel Partners',
          location: 'Various Locations',
          description: 'Gain hands-on experience in the hospitality industry through internships with partner hotels and venues.',
          requirements: 'Enrolled student, interest in hospitality, willingness to learn.',
          salary: '15,000 NGN/month + benefits',
          type: 'Internship',
          category: 'Hospitality',
          applicationDeadline: new Date('2026-01-15'),
          contactEmail: 'internships@aau-nightlife.com',
          image: '/blog/blog3.jpg',
          featured: false,
          published: true,
          tags: ['hospitality', 'internship', 'experience'],
        },
      ];
      await Job.insertMany(jobData);
      console.log('Job data seeded!');
    }

    console.log('All data seeded successfully!');
    console.log('Username: NightlifeAdmin');
    console.log('Password: ANadmin2026');
    console.log('Please change the password after first login!');

  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    process.exit();
  }
};

seedData();