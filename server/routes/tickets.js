import express from 'express';
import axios from 'axios';
import crypto from 'crypto';
import Ticket from '../models/Ticket.js';
import Event from '../models/Event.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import { protect, admin } from '../middleware/auth.js';
import { generateTicketPDF, sendOrderTicketsEmail, sendTicketEmail } from '../services/emailService.js';

const router = express.Router();

const MAX_QUANTITY = 15;

const getMetadataField = (paymentData, variableName) => {
  const customFields = paymentData?.metadata?.custom_fields || [];
  const field = customFields.find((entry) => entry.variable_name === variableName);
  return field?.value || null;
};

const verifyPaystackReference = async (reference) => {
  const verifyResponse = await axios.get(
    `https://api.paystack.co/transaction/verify/${reference}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    }
  );

  return verifyResponse.data.data;
};

const ensureOrderTickets = async (order) => {
  const existingTickets = await Ticket.find({ orderId: order._id }).sort({ createdAt: 1 });
  const missingCount = Math.max(0, (order.quantity || 1) - existingTickets.length);

  if (missingCount === 0) {
    if (!order.ticketIds || order.ticketIds.length !== existingTickets.length) {
      order.ticketIds = existingTickets.map((ticket) => ticket._id);
      await order.save();
    }
    return existingTickets;
  }

  const event = await Event.findById(order.eventId);
  if (!event) {
    return existingTickets;
  }

  const ticketsToCreate = Array.from({ length: missingCount }, () => ({
    orderId: order._id,
    userId: order.userId || null,
    eventId: event._id,
    eventTitle: event.title,
    eventDate: event.date,
    eventTime: event.time,
    location: event.location,
    ticketTypeName: order.ticketTypeName,
    ticketTypePrice: order.ticketTypePrice,
    email: order.buyerEmail,
    name: order.buyerName,
    whatsapp: order.buyerWhatsapp || '',
    paymentStatus: 'completed',
    paymentReference: order.paymentReference,
    paymentTime: order.updatedAt || order.createdAt,
  }));

  const createdTickets = await Ticket.insertMany(ticketsToCreate, { ordered: false });
  const allTickets = [...existingTickets, ...createdTickets].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  order.ticketIds = allTickets.map((ticket) => ticket._id);
  await order.save();

  return allTickets;
};

const buildOrderFromPayment = async ({ reference, paymentData, eventIdFallback, requestData = {} }) => {
  if (paymentData.status !== 'success') {
    throw new Error('Payment verification failed');
  }

  const buyerName =
    getMetadataField(paymentData, 'buyer_name') ||
    requestData.name ||
    null;
  const buyerEmail =
    (getMetadataField(paymentData, 'email') || paymentData.customer?.email || requestData.email || '')
      .toLowerCase()
      .trim();
  const buyerWhatsapp =
    getMetadataField(paymentData, 'whatsapp') || requestData.whatsapp || '';
  const ticketName =
    getMetadataField(paymentData, 'ticket_type') || requestData.ticketTypeName || null;
  const quantityRaw =
    getMetadataField(paymentData, 'quantity') || requestData.quantity || 1;
  const quantity = Math.max(1, Math.min(MAX_QUANTITY, parseInt(quantityRaw, 10) || 1));
  const eventId = getMetadataField(paymentData, 'event_id') || eventIdFallback;

  if (!buyerName || !buyerEmail || !ticketName || !eventId) {
    throw new Error('Missing payment metadata for ticket issuance');
  }

  const event = await Event.findById(eventId);
  if (!event || !event.hasTicketing) {
    throw new Error('Event not found or ticketing disabled');
  }

  const ticketType = event.tickets.find((ticket) => ticket.name === ticketName);
  if (!ticketType) {
    throw new Error('Ticket type not found');
  }

  const totalAmount = ticketType.price * quantity;
  const paidAmount = (paymentData.amount || 0) / 100;
  if (paidAmount < totalAmount) {
    throw new Error('Paid amount is lower than expected total');
  }

  const ownerUser = await User.findOne({ email: buyerEmail }).select('_id');

  const createdOrder = await Order.create({
    paymentReference: reference,
    eventId: event._id,
    userId: ownerUser?._id || null,
    buyerName,
    buyerEmail,
    buyerWhatsapp,
    ticketTypeName: ticketType.name,
    ticketTypePrice: ticketType.price,
    quantity,
    totalAmount,
    status: 'completed',
  });

  const ticketPayloads = Array.from({ length: quantity }, () => ({
    orderId: createdOrder._id,
    userId: ownerUser?._id || null,
    eventId: event._id,
    eventTitle: event.title,
    eventDate: event.date,
    eventTime: event.time,
    location: event.location,
    ticketTypeName: ticketType.name,
    ticketTypePrice: ticketType.price,
    email: buyerEmail,
    name: buyerName,
    whatsapp: buyerWhatsapp,
    paymentStatus: 'completed',
    paymentReference: reference,
    paymentTime: new Date(paymentData.paid_at || Date.now()),
  }));

  const createdTickets = await Ticket.insertMany(ticketPayloads);
  createdOrder.ticketIds = createdTickets.map((ticket) => ticket._id);
  await createdOrder.save();

  try {
    await sendOrderTicketsEmail(createdOrder, createdTickets);
  } catch (emailError) {
    console.error('[TICKET] Multi-ticket email error:', emailError.message);
  }

  return {
    order: createdOrder,
    tickets: createdTickets,
  };
};

const getExistingOrderResult = async (existingOrder) => {
  const existingTickets = await ensureOrderTickets(existingOrder);
  return {
    success: true,
    orderId: existingOrder._id,
    ticketIds: existingTickets.map((ticket) => ticket.ticketId),
    tickets: existingTickets.map((ticket) => ({
      ticketId: ticket.ticketId,
      id: ticket._id,
    })),
    message: 'Order already created for this payment',
  };
};

// @desc    Initiate ticket purchase
// @route   POST /api/tickets/purchase/:eventId
// @access  Public
router.post('/purchase/:eventId', async (req, res) => {
  try {
    const { ticketTypeName, quantity = 1, email, name, whatsapp } = req.body;

    const parsedQuantity = parseInt(quantity, 10);
    if (!ticketTypeName || !email || !name || !whatsapp || Number.isNaN(parsedQuantity)) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    if (parsedQuantity < 1 || parsedQuantity > MAX_QUANTITY) {
      return res.status(400).json({ message: `Quantity must be between 1 and ${MAX_QUANTITY}` });
    }

    const event = await Event.findById(req.params.eventId);
    if (!event || !event.hasTicketing) {
      return res.status(404).json({ message: 'Event or ticketing not found' });
    }

    const ticketType = event.tickets.find((ticket) => ticket.name === ticketTypeName);
    if (!ticketType) {
      return res.status(404).json({ message: 'Ticket type not found' });
    }

    const totalAmount = ticketType.price * parsedQuantity;

    const paystackPayload = {
      email,
      amount: totalAmount * 100,
      metadata: {
        custom_fields: [
          { display_name: 'Buyer Name', variable_name: 'buyer_name', value: name },
          { display_name: 'Email', variable_name: 'email', value: email },
          { display_name: 'WhatsApp', variable_name: 'whatsapp', value: whatsapp },
          { display_name: 'Ticket Type', variable_name: 'ticket_type', value: ticketType.name },
          { display_name: 'Event ID', variable_name: 'event_id', value: req.params.eventId },
          { display_name: 'Quantity', variable_name: 'quantity', value: String(parsedQuantity) },
          {
            display_name: 'Ticket Unit Price',
            variable_name: 'ticket_unit_price',
            value: String(ticketType.price),
          },
        ],
      },
      callback_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment-callback`,
    };

    const response = await axios.post('https://api.paystack.co/transaction/initialize', paystackPayload, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.data.status) {
      return res.status(400).json({ message: 'Failed to initialize payment' });
    }

    return res.json({
      success: true,
      paymentUrl: response.data.data.authorization_url,
      accessCode: response.data.data.access_code,
      reference: response.data.data.reference,
      totalAmount,
      quantity: parsedQuantity,
    });
  } catch (error) {
    console.error('[TICKET] Payment initialization error:', error.message);
    return res.status(500).json({ message: 'Server error during payment initialization' });
  }
});

// @desc    Verify payment and create order+tickets
// @route   POST /api/tickets/purchase/verify/:eventId
// @access  Public
router.post('/purchase/verify/:eventId', async (req, res) => {
  try {
    const { reference } = req.body;
    if (!reference) {
      return res.status(400).json({ message: 'Payment reference required' });
    }

    const existingOrder = await Order.findOne({ paymentReference: reference });
    if (existingOrder) {
      return res.json(await getExistingOrderResult(existingOrder));
    }

    const paymentData = await verifyPaystackReference(reference);
    const eventIdFallback = req.params.eventId !== 'unknown' ? req.params.eventId : null;

    const { order, tickets } = await buildOrderFromPayment({
      reference,
      paymentData,
      eventIdFallback,
      requestData: req.body,
    });

    return res.json({
      success: true,
      orderId: order._id,
      ticketIds: tickets.map((ticket) => ticket.ticketId),
      tickets: tickets.map((ticket) => ({
        ticketId: ticket.ticketId,
        id: ticket._id,
      })),
      message: 'Tickets created successfully',
    });
  } catch (error) {
    if (error.code === 11000) {
      const existingOrder = await Order.findOne({ paymentReference: req.body.reference });
      if (existingOrder) {
        return res.json(await getExistingOrderResult(existingOrder));
      }
    }
    console.error('[TICKET] Verification error:', error.message);
    return res.status(500).json({ message: error.message || 'Server error during verification' });
  }
});

// @desc    Paystack webhook fallback
// @route   POST /api/tickets/webhook/paystack
// @access  Public
router.post('/webhook/paystack', async (req, res) => {
  try {
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      return res.status(400).json({ message: 'Invalid signature' });
    }

    const paystackEvent = req.body;
    if (paystackEvent.event !== 'charge.success') {
      return res.status(200).json({ message: 'Event ignored' });
    }

    const paymentData = paystackEvent.data;
    const reference = paymentData.reference;

    const existingOrder = await Order.findOne({ paymentReference: reference });
    if (existingOrder) {
      return res.status(200).json({ message: 'Order already exists' });
    }

    await buildOrderFromPayment({
      reference,
      paymentData,
      eventIdFallback: null,
      requestData: {},
    });

    return res.status(200).json({ message: 'Order created' });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(200).json({ message: 'Order already exists' });
    }
    console.error('[WEBHOOK] Error:', error.message);
    return res.status(500).json({ message: 'Webhook error' });
  }
});

// @desc    Download a single ticket PDF
// @route   GET /api/tickets/:ticketId/download
// @access  Public
router.get('/:ticketId/download', async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ ticketId: req.params.ticketId });
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const pdfBuffer = await generateTicketPDF(ticket);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="ticket-${ticket.ticketId}.pdf"`);
    return res.send(pdfBuffer);
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get single ticket
// @route   GET /api/tickets/:ticketId
// @access  Public
router.get('/:ticketId', async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ ticketId: req.params.ticketId });
    if (ticket) {
      return res.json(ticket);
    }
    return res.status(404).json({ message: 'Ticket not found' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Create manual ticket
// @route   POST /api/tickets/admin/manual
// @access  Private/Admin
router.post('/admin/manual', protect, admin, async (req, res) => {
  try {
    const { eventId, ticketTypeName, ticketTypePrice, name, email, whatsapp } = req.body;

    if (!eventId || !ticketTypeName || !name || !email) {
      return res.status(400).json({
        message: 'Missing required fields: eventId, ticketTypeName, name, and email are required',
      });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const ticketType = event.tickets.find((ticket) => ticket.name === ticketTypeName);
    if (!ticketType) {
      return res.status(404).json({ message: 'Ticket type not found' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const ownerUser = await User.findOne({ email: normalizedEmail }).select('_id');

    const ticket = new Ticket({
      userId: ownerUser?._id || null,
      eventId,
      eventTitle: event.title,
      eventDate: event.date,
      eventTime: event.time,
      location: event.location,
      ticketTypeName: ticketType.name,
      ticketTypePrice: ticketTypePrice || ticketType.price,
      email: normalizedEmail,
      name,
      whatsapp: whatsapp || '',
      paymentStatus: 'completed',
      paymentReference: `MANUAL-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      paymentTime: new Date(),
    });

    const createdTicket = await ticket.save();

    try {
      await sendTicketEmail(createdTicket);
    } catch (emailError) {
      console.error('[MANUAL TICKET] Email sending error:', emailError.message);
    }

    return res.json({
      success: true,
      ticketId: createdTicket.ticketId,
      ticket: createdTicket,
      message: 'Manual ticket created successfully',
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error during manual ticket creation' });
  }
});

// @desc    Get all tickets for admin
// @route   GET /api/tickets/admin/list
// @access  Private/Admin
router.get('/admin/list', protect, admin, async (req, res) => {
  try {
    const { eventId, startDate, endDate, status, sortBy = 'paymentTime' } = req.query;
    const filter = {};

    if (eventId) filter.eventId = eventId;
    if (status) filter.paymentStatus = status;

    if (startDate || endDate) {
      filter.paymentTime = {};
      if (startDate) filter.paymentTime.$gte = new Date(startDate);
      if (endDate) filter.paymentTime.$lte = new Date(endDate);
    }

    const sortOptions = {};
    sortOptions[sortBy === 'name' ? 'name' : 'paymentTime'] = sortBy === 'name' ? 1 : -1;

    const tickets = await Ticket.find(filter).sort(sortOptions);

    return res.json({
      success: true,
      total: tickets.length,
      tickets,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get tickets count for admin
// @route   GET /api/tickets/admin/count
// @access  Private/Admin
router.get('/admin/count', protect, admin, async (req, res) => {
  try {
    const total = await Ticket.countDocuments({});
    return res.json({ total });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Export tickets CSV for admin
// @route   GET /api/tickets/admin/export
// @access  Private/Admin
router.get('/admin/export', protect, admin, async (req, res) => {
  try {
    const { eventId, startDate, endDate, status } = req.query;
    const filter = {};

    if (eventId) filter.eventId = eventId;
    if (status) filter.paymentStatus = status;

    if (startDate || endDate) {
      filter.paymentTime = {};
      if (startDate) filter.paymentTime.$gte = new Date(startDate);
      if (endDate) filter.paymentTime.$lte = new Date(endDate);
    }

    const tickets = await Ticket.find(filter).sort({ paymentTime: -1 });

    const headers = [
      'Ticket ID',
      'Order ID',
      'Event',
      'Buyer Name',
      'Email',
      'WhatsApp',
      'Ticket Type',
      'Price (N)',
      'Payment Time',
      'Status',
    ];

    const rows = tickets.map((ticket) => [
      ticket.ticketId,
      ticket.orderId || '',
      ticket.eventTitle,
      ticket.name,
      ticket.email,
      ticket.whatsapp,
      ticket.ticketTypeName,
      ticket.ticketTypePrice,
      new Date(ticket.paymentTime).toLocaleString(),
      ticket.paymentStatus,
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="tickets-${Date.now()}.csv"`);
    return res.send(csv);
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;
