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

    // Check if ticket already exists for this payment reference (idempotency check FIRST)
    const existingTicket = await Ticket.findOne({ paymentReference: reference });
    if (existingTicket) {
      console.log('[TICKET] Already exists for reference:', reference, '-> Returning existing ticket');
      return res.json({
        success: true,
        ticketId: existingTicket.ticketId,
        message: 'Ticket already created for this payment',
      });
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
      return res.status(400).json({ 
        message: 'Payment verification failed',
        paymentStatus: paymentData.status 
      });
    }

    // Extract metadata from Paystack (this is the RELIABLE source)
    const customFields = paymentData.metadata?.custom_fields || [];
    const getField = (variableName) => {
      const field = customFields.find(f => f.variable_name === variableName);
      return field?.value || null;
    };

    // Use Paystack metadata as primary source, fallback to request body
    const buyerName = getField('buyer_name') || name;
    const buyerEmail = getField('email') || paymentData.customer?.email || email;
    const buyerWhatsapp = getField('whatsapp') || whatsapp;
    const ticketName = getField('ticket_type') || ticketTypeName;
    const ticketPrice = parseFloat(getField('ticket_type_price')) || ticketTypePrice || (paymentData.amount / 100);
    // Get eventId from Paystack metadata first, then from URL (but not if it's 'unknown')
    const urlEventId = req.params.eventId !== 'unknown' ? req.params.eventId : null;
    const eventId = getField('event_id') || urlEventId;

    console.log('[TICKET VERIFY] Using data:', {
      reference,
      buyerName,
      buyerEmail,
      buyerWhatsapp,
      ticketName,
      ticketPrice,
      eventId,
      source: getField('buyer_name') ? 'paystack_metadata' : 'request_body'
    });

    // Validate we have minimum required data
    if (!buyerName || !buyerEmail) {
      console.error('[TICKET ERROR] Missing required buyer info after extracting from Paystack');
      return res.status(400).json({ 
        message: 'Missing buyer information. Please contact support with reference: ' + reference 
      });
    }

    // Validate we have eventId
    if (!eventId) {
      console.error('[TICKET ERROR] Missing eventId, cannot create ticket');
      return res.status(400).json({ 
        message: 'Event information missing. Please contact support with reference: ' + reference 
      });
    }

    // Get event details
    const event = await Event.findById(eventId);
    if (!event) {
      console.error('[TICKET ERROR] Event not found:', eventId);
      return res.status(404).json({ message: 'Event not found' });
    }

    // Find the ticket type by name (price might vary slightly due to conversions)
    let ticketType = event.tickets.find(t => t.name === ticketName);
    if (!ticketType) {
      // Fallback: find by approximate price if name doesn't match
      ticketType = event.tickets.find(t => Math.abs(t.price - ticketPrice) < 1);
    }
    if (!ticketType) {
      console.error('[TICKET ERROR] Ticket type not found:', ticketName, ticketPrice);
      // Still create the ticket with the data we have
      ticketType = { name: ticketName || 'General', price: ticketPrice };
    }

    // Create ticket record
    const ticket = new Ticket({
      eventId: eventId,
      eventTitle: event.title,
      eventDate: event.date,
      eventTime: event.time,
      location: event.location,
      ticketTypeName: ticketType.name,
      ticketTypePrice: ticketType.price,
      email: buyerEmail,
      name: buyerName,
      whatsapp: buyerWhatsapp || '',
      paymentStatus: 'completed',
      paymentReference: reference,
      paymentTime: new Date(paymentData.paid_at || Date.now()),
    });

    const createdTicket = await ticket.save();
    console.log('[TICKET] Created successfully:', createdTicket.ticketId);

    // Send confirmation email with ticket PDF
    try {
      await sendTicketEmail(createdTicket);
      console.log('[TICKET] Email sent for:', createdTicket.ticketId);
    } catch (emailError) {
      console.error('[TICKET] Email sending error:', emailError);
      // Don't fail the ticket creation if email fails, but log the error
    }

    res.json({
      success: true,
      ticketId: createdTicket.ticketId,
      message: 'Ticket created successfully',
    });
  } catch (error) {
    // Handle duplicate key error (race condition with webhook)
    if (error.code === 11000 && error.keyPattern?.paymentReference) {
      console.log('[TICKET] Duplicate payment reference detected, fetching existing ticket');
      const existingTicket = await Ticket.findOne({ paymentReference: req.body.reference });
      if (existingTicket) {
        return res.json({
          success: true,
          ticketId: existingTicket.ticketId,
          message: 'Ticket already created for this payment',
        });
      }
    }
    console.error('[TICKET ERROR] Ticket creation error:', error);
    res.status(500).json({ message: 'Server error during ticket creation. Please contact support.' });
  }
});

// @desc    Paystack Webhook - Backup ticket creation for failed frontend verifications
// @route   POST /api/tickets/webhook/paystack
// @access  Public (verified by Paystack signature)
router.post('/webhook/paystack', async (req, res) => {
  try {
    const crypto = await import('crypto');
    const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest('hex');
    
    // Verify webhook signature
    if (hash !== req.headers['x-paystack-signature']) {
      console.log('[WEBHOOK] Invalid signature');
      return res.status(400).json({ message: 'Invalid signature' });
    }

    const event = req.body;
    console.log('[WEBHOOK] Received event:', event.event);

    // Only process successful charges
    if (event.event !== 'charge.success') {
      return res.status(200).json({ message: 'Event ignored' });
    }

    const paymentData = event.data;
    const reference = paymentData.reference;

    // Check if this is a ticket payment (check metadata for event_id)
    const customFields = paymentData.metadata?.custom_fields || [];
    const getField = (variableName) => {
      const field = customFields.find(f => f.variable_name === variableName);
      return field?.value || null;
    };

    const eventId = getField('event_id');
    if (!eventId) {
      console.log('[WEBHOOK] Not a ticket payment, ignoring');
      return res.status(200).json({ message: 'Not a ticket payment' });
    }

    // Check if ticket already exists
    const existingTicket = await Ticket.findOne({ paymentReference: reference });
    if (existingTicket) {
      console.log('[WEBHOOK] Ticket already exists for:', reference);
      return res.status(200).json({ message: 'Ticket already exists' });
    }

    // Extract data from Paystack
    const buyerName = getField('buyer_name');
    const buyerEmail = getField('email') || paymentData.customer?.email;
    const buyerWhatsapp = getField('whatsapp');
    const ticketName = getField('ticket_type');
    const ticketPrice = parseFloat(getField('ticket_type_price')) || (paymentData.amount / 100);

    if (!buyerName || !buyerEmail) {
      console.error('[WEBHOOK] Missing buyer info in metadata');
      return res.status(200).json({ message: 'Missing buyer info' });
    }

    // Get event details
    const eventDoc = await Event.findById(eventId);
    if (!eventDoc) {
      console.error('[WEBHOOK] Event not found:', eventId);
      return res.status(200).json({ message: 'Event not found' });
    }

    // Create ticket
    const ticket = new Ticket({
      eventId: eventId,
      eventTitle: eventDoc.title,
      eventDate: eventDoc.date,
      eventTime: eventDoc.time,
      location: eventDoc.location,
      ticketTypeName: ticketName || 'General',
      ticketTypePrice: ticketPrice,
      email: buyerEmail,
      name: buyerName,
      whatsapp: buyerWhatsapp || '',
      paymentStatus: 'completed',
      paymentReference: reference,
      paymentTime: new Date(paymentData.paid_at || Date.now()),
    });

    const createdTicket = await ticket.save();
    console.log('[WEBHOOK] Ticket created via webhook:', createdTicket.ticketId);

    // Send confirmation email
    try {
      await sendTicketEmail(createdTicket);
    } catch (emailError) {
      console.error('[WEBHOOK] Email error:', emailError);
    }

    res.status(200).json({ message: 'Ticket created' });
  } catch (error) {
    // Handle duplicate key error gracefully (frontend already created the ticket)
    if (error.code === 11000 && error.keyPattern?.paymentReference) {
      console.log('[WEBHOOK] Ticket already created by frontend for reference:', req.body?.data?.reference);
      return res.status(200).json({ message: 'Ticket already exists' });
    }
    console.error('[WEBHOOK] Error:', error);
    res.status(500).json({ message: 'Webhook error' });
  }
});

// @desc    Create manual ticket (admin - for cash payments)
// @route   POST /api/tickets/admin/manual
// @access  Private/Admin
router.post('/admin/manual', protect, admin, async (req, res) => {
  try {
    const { eventId, ticketTypeName, ticketTypePrice, name, email, whatsapp } = req.body;

    // Validate required fields
    if (!eventId || !ticketTypeName || !name || !email) {
      return res.status(400).json({ message: 'Missing required fields: eventId, ticketTypeName, name, and email are required' });
    }

    // Get event details
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Find the ticket type
    const ticketType = event.tickets.find(t => t.name === ticketTypeName);
    if (!ticketType) {
      return res.status(404).json({ message: 'Ticket type not found' });
    }

    // Create the ticket (manual payment - no payment reference)
    const ticket = new Ticket({
      eventId: eventId,
      eventTitle: event.title,
      eventDate: event.date,
      eventTime: event.time,
      location: event.location,
      ticketTypeName: ticketType.name,
      ticketTypePrice: ticketTypePrice || ticketType.price,
      email: email,
      name: name,
      whatsapp: whatsapp || '',
      paymentStatus: 'completed',
      paymentReference: `MANUAL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      paymentTime: new Date(),
    });

    const createdTicket = await ticket.save();
    console.log('[MANUAL TICKET] Created by admin:', createdTicket.ticketId, 'for', name);

    // Send confirmation email with ticket PDF
    try {
      await sendTicketEmail(createdTicket);
      console.log('[MANUAL TICKET] Email sent for:', createdTicket.ticketId);
    } catch (emailError) {
      console.error('[MANUAL TICKET] Email sending error:', emailError);
      // Don't fail the ticket creation if email fails
    }

    res.json({
      success: true,
      ticketId: createdTicket.ticketId,
      ticket: createdTicket,
      message: 'Manual ticket created successfully',
    });
  } catch (error) {
    console.error('[MANUAL TICKET ERROR]:', error);
    res.status(500).json({ message: 'Server error during manual ticket creation' });
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
