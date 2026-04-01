import express from 'express';
import JSZip from 'jszip';
import Order from '../models/Order.js';
import Ticket from '../models/Ticket.js';
import { protect } from '../middleware/auth.js';
import { generateTicketPDF } from '../services/emailService.js';

const router = express.Router();

// @desc    Get authenticated user's order history
// @route   GET /api/orders/my
// @access  Private
router.get('/my', protect, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    const orderIds = orders.map((order) => order._id);
    const tickets = await Ticket.find({ orderId: { $in: orderIds } }).lean();
    const ticketsByOrderId = tickets.reduce((acc, ticket) => {
      const key = String(ticket.orderId);
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(ticket);
      return acc;
    }, {});

    return res.json({
      success: true,
      orders: orders.map((order) => ({
        ...order,
        tickets: ticketsByOrderId[String(order._id)] || [],
      })),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get single order details
// @route   GET /api/orders/:orderId
// @access  Public
router.get('/:orderId', async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId).lean();
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const tickets = await Ticket.find({ orderId: order._id }).sort({ createdAt: 1 }).lean();
    return res.json({ success: true, order: { ...order, tickets } });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Download all order tickets as zip
// @route   GET /api/orders/:orderId/download
// @access  Public
router.get('/:orderId/download', async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const tickets = await Ticket.find({ orderId: order._id }).sort({ createdAt: 1 });
    if (tickets.length === 0) {
      return res.status(404).json({ message: 'No tickets found for this order' });
    }

    const zip = new JSZip();
    for (const ticket of tickets) {
      const pdfBuffer = await generateTicketPDF(ticket);
      zip.file(`ticket-${ticket.ticketId}.pdf`, pdfBuffer);
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="order-${order._id}.zip"`);
    return res.send(zipBuffer);
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;