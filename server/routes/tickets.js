import express from 'express';
import axios from 'axios';
import Ticket from '../models/Ticket.js';
import Event from '../models/Event.js';
import { protect, admin } from '../middleware/auth.js';
import { sendTicketEmail } from '../services/emailService.js';

const router = express.Router();

// @desc    Get single ticket (public - for ticket confirmation page)
// @route   GET /api/tickets/:ticketId
// @access  Public
router.get('/:ticketId', async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ ticketId: req.params.ticketId });

    if (ticket) {
      res.json(ticket);
    } else {
      res.status(404).json({ message: 'Ticket not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Initiate ticket purchase (creates Paystack transaction)
// @route   POST /api/tickets/purchase/:eventId
// @access  Public
router.post('/purchase/:eventId', async (req, res) => {
  try {
    const { ticketTypeName, ticketTypePrice, email, name, whatsapp } = req.body;

    if (!ticketTypeName || !ticketTypePrice || !email || !name || !whatsapp) {
      return res.status(400).json({ message: 'Missing required fields', received: req.body });
    }

    // Get event details
    const event = await Event.findById(req.params.eventId);
    if (!event || !event.hasTicketing) {
      return res.status(404).json({ message: 'Event or ticketing not found' });
    }

    // Find the ticket type by name and price
    const ticketType = event.tickets.find(t => t.name === ticketTypeName && t.price === ticketTypePrice);
    if (!ticketType) {
      return res.status(404).json({ message: 'Ticket type not found' });
    }

    // Create Paystack transaction
    const paystackData = {
      email: email, // Use actual email
      amount: ticketTypePrice * 100, // Paystack expects amount in kobo
      metadata: {
        custom_fields: [
          {
            display_name: 'Buyer Name',
            variable_name: 'buyer_name',
            value: name,
          },
          {
            display_name: 'Email',
            variable_name: 'email',
            value: email,
          },
          {
            display_name: 'WhatsApp',
            variable_name: 'whatsapp',
            value: whatsapp,
          },
          {
            display_name: 'Ticket Type',
            variable_name: 'ticket_type',
            value: ticketTypeName,
          },
          {
            display_name: 'Event ID',
            variable_name: 'event_id',
            value: req.params.eventId,
          },
          {
            display_name: 'Ticket Type Price',
            variable_name: 'ticket_type_price',
            value: ticketTypePrice.toString(),
          },
        ],
      },
      callback_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment-callback`,
    };

    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      paystackData,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data.status) {
      res.json({
        success: true,
        paymentUrl: response.data.data.authorization_url,
        accessCode: response.data.data.access_code,
        reference: response.data.data.reference,
      });
    } else {
      res.status(400).json({ message: 'Failed to initialize payment' });
    }
  } catch (error) {
    console.error('Payment initialization error:', error);
    res.status(500).json({ message: 'Server error during payment initialization' });
  }
});

// @desc    Verify payment and create ticket (webhook from frontend after payment)
// @route   POST /api/tickets/purchase/verify/:eventId
// @access  Public
router.post('/purchase/verify/:eventId', async (req, res) => {
  try {
    const { reference, ticketTypeName, ticketTypePrice, email, name, whatsapp } = req.body;

    if (!reference) {
      return res.status(400).json({ message: 'Payment reference required' });
    }

    // Verify payment with Paystack
    const verifyResponse = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const paymentData = verifyResponse.data.data;

    if (paymentData.status !== 'success') {
      return res.status(400).json({ message: 'Payment verification failed' });
    }

    // Get event details
    const event = await Event.findById(req.params.eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Find the ticket type by name and price
    const ticketType = event.tickets.find(t => t.name === ticketTypeName && t.price === ticketTypePrice);
    if (!ticketType) {
      return res.status(404).json({ message: 'Ticket type not found' });
    }

    // Check if ticket already exists for this payment reference
    const existingTicket = await Ticket.findOne({ paymentReference: reference });
    if (existingTicket) {
      return res.json({
        success: true,
        ticketId: existingTicket.ticketId,
        message: 'Ticket already created for this payment',
      });
    }

    // Create ticket record
    const ticket = new Ticket({
      eventId: req.params.eventId,
      eventTitle: event.title,
      eventDate: event.date,
      eventTime: event.time,
      location: event.location,
      ticketTypeName: ticketType.name,
      ticketTypePrice: ticketType.price,
      email,
      name,
      whatsapp,
      paymentStatus: 'completed',
      paymentReference: reference,
      paymentTime: new Date(),
    });

    const createdTicket = await ticket.save();

    // Send confirmation email with ticket PDF
    try {
      await sendTicketEmail(createdTicket);
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      // Don't fail the ticket creation if email fails, but log the error
    }

    res.json({
      success: true,
      ticketId: createdTicket.ticketId,
      message: 'Ticket created successfully',
    });
  } catch (error) {
    console.error('Ticket creation error:', error);
    res.status(500).json({ message: 'Server error during ticket creation' });
  }
});

// @desc    Get all tickets (admin dashboard)
// @route   GET /api/admin/tickets
// @access  Private/Admin
router.get('/admin/list', protect, admin, async (req, res) => {
  try {
    const { eventId, startDate, endDate, status, sortBy = 'paymentTime' } = req.query;
    let filter = {};

    if (eventId) {
      filter.eventId = eventId;
    }

    if (status) {
      filter.paymentStatus = status;
    }

    if (startDate || endDate) {
      filter.paymentTime = {};
      if (startDate) {
        filter.paymentTime.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.paymentTime.$lte = new Date(endDate);
      }
    }

    const sortOptions = {};
    if (sortBy === 'paymentTime') {
      sortOptions.paymentTime = -1;
    } else if (sortBy === 'name') {
      sortOptions.name = 1;
    }

    const tickets = await Ticket.find(filter).sort(sortOptions);

    res.json({
      success: true,
      total: tickets.length,
      tickets,
    });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Export tickets as CSV (admin)
// @route   GET /api/admin/tickets/export
// @access  Private/Admin
router.get('/admin/export', protect, admin, async (req, res) => {
  try {
    const { eventId, startDate, endDate, status } = req.query;
    let filter = {};

    if (eventId) {
      filter.eventId = eventId;
    }

    if (status) {
      filter.paymentStatus = status;
    }

    if (startDate || endDate) {
      filter.paymentTime = {};
      if (startDate) {
        filter.paymentTime.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.paymentTime.$lte = new Date(endDate);
      }
    }

    const tickets = await Ticket.find(filter).sort({ paymentTime: -1 });

    // Generate CSV
    const headers = ['Ticket ID', 'Event', 'Buyer Name', 'Email', 'WhatsApp', 'Ticket Type', 'Price (₦)', 'Payment Time', 'Status'];
    const rows = tickets.map(t => [
      t.ticketId,
      t.eventTitle,
      t.name,
      t.email,
      t.whatsapp,
      t.ticketTypeName,
      t.ticketTypePrice,
      new Date(t.paymentTime).toLocaleString(),
      t.paymentStatus,
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="tickets-${new Date().getTime()}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting tickets:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
