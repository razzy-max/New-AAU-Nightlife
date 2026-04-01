import express from 'express';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import PDFDocument from 'pdfkit';
import Event from '../models/Event.js';
import Ticket from '../models/Ticket.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

const normalizeBaseUrl = (value) => {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return withProtocol.replace(/\/+$/, '');
};

const getFrontendBaseUrl = () => {
  return (
    normalizeBaseUrl(process.env.FRONTEND_URL) ||
    normalizeBaseUrl(process.env.PUBLIC_FRONTEND_URL) ||
    normalizeBaseUrl(process.env.RENDER_EXTERNAL_URL) ||
    'http://localhost:5173'
  );
};

const buildSalesMonitorPath = (eventId, token) => `/sales-monitor/${eventId}?access=${encodeURIComponent(token)}`;

const parseSalesQuery = (query) => {
  const params = new URLSearchParams();
  if (query.status) params.append('status', String(query.status));
  if (query.startDate) params.append('startDate', String(query.startDate));
  if (query.endDate) params.append('endDate', String(query.endDate));
  if (query.sortBy) params.append('sortBy', String(query.sortBy));
  if (query.search) params.append('search', String(query.search));
  return params;
};

const buildTicketFilter = (eventId, query) => {
  const filter = { eventId };

  if (query.status) {
    filter.paymentStatus = query.status;
  }

  if (query.startDate || query.endDate) {
    filter.paymentTime = {};
    if (query.startDate) {
      filter.paymentTime.$gte = new Date(query.startDate);
    }
    if (query.endDate) {
      filter.paymentTime.$lte = new Date(query.endDate);
    }
  }

  if (query.search) {
    const regex = new RegExp(String(query.search).trim(), 'i');
    filter.$or = [
      { name: regex },
      { email: regex },
      { whatsapp: regex },
      { ticketId: regex },
      { ticketTypeName: regex },
    ];
  }

  return filter;
};

const resolveSort = (sortBy = 'paymentTime') => {
  switch (sortBy) {
    case 'name':
      return { name: 1 };
    case 'ticketTypeName':
      return { ticketTypeName: 1 };
    case 'paymentStatus':
      return { paymentStatus: 1, paymentTime: -1 };
    case 'paymentTimeAsc':
      return { paymentTime: 1 };
    default:
      return { paymentTime: -1 };
  }
};

const validateSalesAccess = async (eventId, accessToken) => {
  if (!accessToken) {
    return { ok: false, status: 401, message: 'Missing access token' };
  }

  const event = await Event.findById(eventId).select('+salesMonitorToken title date time location');
  if (!event) {
    return { ok: false, status: 404, message: 'Event not found' };
  }

  if (!event.salesMonitorToken || event.salesMonitorToken !== accessToken) {
    return { ok: false, status: 403, message: 'Invalid or expired sales monitor link' };
  }

  return { ok: true, event };
};

// @desc    Get all events
// @route   GET /api/events
// @access  Public
router.get('/', async (req, res) => {
  try {
    const pageSize = 10;
    const page = Number(req.query.pageNumber) || 1;
    const category = req.query.category || '';
    const search = req.query.search || '';
    const admin = req.query.admin === 'true'; // Check if admin request

    let query = admin ? {} : { published: true }; // Show all for admin, published only for public

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$text = { $search: search };
    }

    const count = await Event.countDocuments(query);
    const events = await Event.find(query)
      .sort({ date: 1 })
      .limit(pageSize)
      .skip(pageSize * (page - 1));

    res.json({
      events,
      page,
      pages: Math.ceil(count / pageSize),
      total: count,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Generate or rotate sales monitor link for an event
// @route   POST /api/events/:id/sales-monitor/link
// @access  Private/Admin
router.post('/:id/sales-monitor/link', protect, admin, async (req, res) => {
  try {
    const rotate = req.body?.rotate === true;
    const event = await Event.findById(req.params.id).select('+salesMonitorToken title');

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (!event.salesMonitorToken || rotate) {
      event.salesMonitorToken = crypto.randomBytes(24).toString('hex');
      event.salesMonitorTokenCreatedAt = new Date();
      await event.save();
    }

    const path = buildSalesMonitorPath(event._id, event.salesMonitorToken);
    const url = `${getFrontendBaseUrl()}${path}`;

    return res.json({
      eventId: event._id,
      eventTitle: event.title,
      path,
      url,
      tokenCreatedAt: event.salesMonitorTokenCreatedAt,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Read-only sales monitor data for a specific event
// @route   GET /api/events/:id/sales-monitor
// @access  Public via secure token
router.get('/:id/sales-monitor', async (req, res) => {
  try {
    const accessToken = req.query.access;
    const access = await validateSalesAccess(req.params.id, accessToken);
    if (!access.ok) {
      return res.status(access.status).json({ message: access.message });
    }

    const filter = buildTicketFilter(req.params.id, req.query);
    const tickets = await Ticket.find(filter).sort(resolveSort(req.query.sortBy));

    const totalRevenue = tickets.reduce((sum, ticket) => sum + Number(ticket.ticketTypePrice || 0), 0);

    return res.json({
      event: {
        _id: access.event._id,
        title: access.event.title,
        date: access.event.date,
        time: access.event.time,
        location: access.event.location,
      },
      total: tickets.length,
      totalRevenue,
      tickets,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Export read-only sales monitor CSV
// @route   GET /api/events/:id/sales-monitor/export.csv
// @access  Public via secure token
router.get('/:id/sales-monitor/export.csv', async (req, res) => {
  try {
    const accessToken = req.query.access;
    const access = await validateSalesAccess(req.params.id, accessToken);
    if (!access.ok) {
      return res.status(access.status).json({ message: access.message });
    }

    const filter = buildTicketFilter(req.params.id, req.query);
    const tickets = await Ticket.find(filter).sort(resolveSort(req.query.sortBy));

    const headers = [
      'Ticket ID',
      'Buyer Name',
      'Email',
      'WhatsApp',
      'Ticket Type',
      'Price (N)',
      'Status',
      'Payment Time',
    ];

    const rows = tickets.map((ticket) => [
      ticket.ticketId,
      ticket.name,
      ticket.email,
      ticket.whatsapp,
      ticket.ticketTypeName,
      ticket.ticketTypePrice,
      ticket.paymentStatus,
      new Date(ticket.paymentTime).toLocaleString(),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell ?? '')}"`).join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${access.event.title.replace(/[^a-z0-9]/gi, '-')}-sales.csv"`);
    return res.send(csv);
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Export read-only sales monitor PDF
// @route   GET /api/events/:id/sales-monitor/export.pdf
// @access  Public via secure token
router.get('/:id/sales-monitor/export.pdf', async (req, res) => {
  try {
    const accessToken = req.query.access;
    const access = await validateSalesAccess(req.params.id, accessToken);
    if (!access.ok) {
      return res.status(access.status).json({ message: access.message });
    }

    const filter = buildTicketFilter(req.params.id, req.query);
    const tickets = await Ticket.find(filter).sort(resolveSort(req.query.sortBy));
    const totalRevenue = tickets.reduce((sum, ticket) => sum + Number(ticket.ticketTypePrice || 0), 0);

    const doc = new PDFDocument({ size: 'A4', margin: 35 });
    const safeTitle = access.event.title.replace(/[^a-z0-9]/gi, '-');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}-sales.pdf"`);

    doc.pipe(res);

    doc.fontSize(18).font('Helvetica-Bold').text('Event Ticket Sales Report');
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica').text(`Event: ${access.event.title}`);
    doc.text(`Generated: ${new Date().toLocaleString()}`);
    doc.text(`Tickets Sold: ${tickets.length}`);
    doc.text(`Total Revenue: N${totalRevenue.toLocaleString()}`);
    doc.moveDown(0.8);

    tickets.forEach((ticket, index) => {
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(`${index + 1}. ${ticket.ticketId} - ${ticket.name}`)
        .font('Helvetica')
        .text(`Email: ${ticket.email} | WhatsApp: ${ticket.whatsapp || '-'}`)
        .text(`Type: ${ticket.ticketTypeName} | Price: N${Number(ticket.ticketTypePrice || 0).toLocaleString()} | Status: ${ticket.paymentStatus}`)
        .text(`Time: ${new Date(ticket.paymentTime).toLocaleString()}`)
        .moveDown(0.5);

      if (doc.y > 760) {
        doc.addPage();
      }
    });

    doc.end();
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Create an event
// @route   POST /api/events
// @access  Private/Admin
router.post('/', protect, admin, upload.single('image'), [
  body('title').trim().isLength({ min: 1 }),
  body('description').trim().isLength({ min: 1 }),
  body('shortDescription').trim().isLength({ min: 1 }),
  body('date').isDate(),
  body('time').trim().isLength({ min: 1 }),
  body('location').trim().isLength({ min: 1 }),
  body('contactEmail').isEmail(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // Convert uploaded file to base64 data URL (like blogs)
    let imageData = req.body.image; // Default to provided image URL

    if (req.file) {
      const imageBuffer = req.file.buffer;
      const imageMimeType = req.file.mimetype;
      imageData = `data:${imageMimeType};base64,${imageBuffer.toString('base64')}`;
    }

    // Parse tickets if provided
    let tickets = [];
    if (req.body.tickets) {
      try {
        tickets = typeof req.body.tickets === 'string' ? JSON.parse(req.body.tickets) : req.body.tickets;
      } catch (e) {
        tickets = [];
      }
    }

    const eventData = {
      ...req.body,
      image: imageData,
      featured: req.body.featured === 'true' || req.body.featured === true,
      published: req.body.published === 'true' || req.body.published === true,
      hasTicketing: tickets.length > 0,
      tickets: tickets,
    };

    // Remove old price field if exists
    delete eventData.price;

    const event = new Event(eventData);
    const createdEvent = await event.save();
    res.status(201).json(createdEvent);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Update an event
// @route   PUT /api/events/:id
// @access  Private/Admin
router.put('/:id', protect, admin, upload.single('image'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (event) {
      // Parse tickets if provided
      if (req.body.tickets) {
        try {
          const tickets = typeof req.body.tickets === 'string' ? JSON.parse(req.body.tickets) : req.body.tickets;
          req.body.tickets = tickets;
          req.body.hasTicketing = tickets.length > 0;
        } catch (e) {
          req.body.tickets = [];
          req.body.hasTicketing = false;
        }
      }

      // Handle image upload - convert to base64 if new file uploaded
      if (req.file) {
        const imageBuffer = req.file.buffer;
        const imageMimeType = req.file.mimetype;
        req.body.image = `data:${imageMimeType};base64,${imageBuffer.toString('base64')}`;
      }

      // Remove old price field if exists
      delete req.body.price;

      Object.assign(event, req.body);
      const updatedEvent = await event.save();
      res.json(updatedEvent);
    } else {
      res.status(404).json({ message: 'Event not found' });
    }
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Delete an event
// @route   DELETE /api/events/:id
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (event) {
      await event.deleteOne();
      res.json({ message: 'Event removed' });
    } else {
      res.status(404).json({ message: 'Event not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get upcoming events
// @route   GET /api/events/upcoming/list
// @access  Public
router.get('/upcoming/list', async (req, res) => {
  try {
    const now = new Date();
    const events = await Event.find({
      published: true,
      date: { $gte: now }
    })
      .sort({ date: 1 })
      .limit(3);
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get single event
// @route   GET /api/events/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (event) {
      res.json(event);
    } else {
      res.status(404).json({ message: 'Event not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get featured events
// @route   GET /api/events/featured/list
// @access  Public
router.get('/featured/list', async (req, res) => {
  try {
    const events = await Event.find({ featured: true, published: true })
      .sort({ createdAt: -1 })
      .limit(3);

    // Cache featured events for 10 minutes
    res.set({
      'Cache-Control': 'public, max-age=600, s-maxage=300',
      'ETag': `"featured-events-${events.length}-${events[0]?.updatedAt || 'none'}"`,
      'Vary': 'Accept-Encoding'
    });

    res.json(events);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;