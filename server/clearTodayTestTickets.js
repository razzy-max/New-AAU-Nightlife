import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Ticket from './models/Ticket.js';
import Order from './models/Order.js';
import connectDB from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

// Nigeria timezone is UTC+1 year-round.
const getLagosDayRangeUTC = () => {
  const now = new Date();
  const lagosNow = new Date(now.getTime() + 60 * 60 * 1000);

  const startLagos = new Date(
    lagosNow.getUTCFullYear(),
    lagosNow.getUTCMonth(),
    lagosNow.getUTCDate(),
    0,
    0,
    0,
    0
  );
  const endLagos = new Date(
    lagosNow.getUTCFullYear(),
    lagosNow.getUTCMonth(),
    lagosNow.getUTCDate(),
    23,
    59,
    59,
    999
  );

  const startUTC = new Date(startLagos.getTime() - 60 * 60 * 1000);
  const endUTC = new Date(endLagos.getTime() - 60 * 60 * 1000);

  return { startUTC, endUTC };
};

const clearTodayTestTickets = async () => {
  try {
    await connectDB();

    const { startUTC, endUTC } = getLagosDayRangeUTC();

    console.log('Cleaning today\'s test purchases (Lagos day window)');
    console.log(`Window UTC: ${startUTC.toISOString()} -> ${endUTC.toISOString()}`);

    const ordersToday = await Order.find({
      createdAt: { $gte: startUTC, $lte: endUTC },
    }).select('_id paymentReference');

    const orderIds = ordersToday.map((order) => order._id);
    const refs = ordersToday
      .map((order) => order.paymentReference)
      .filter(Boolean);

    const ticketDeleteFilter = {
      $or: [
        { createdAt: { $gte: startUTC, $lte: endUTC } },
        { paymentTime: { $gte: startUTC, $lte: endUTC } },
        ...(orderIds.length > 0 ? [{ orderId: { $in: orderIds } }] : []),
        ...(refs.length > 0 ? [{ paymentReference: { $in: refs } }] : []),
      ],
    };

    const [ticketResult, orderResult] = await Promise.all([
      Ticket.deleteMany(ticketDeleteFilter),
      Order.deleteMany({ _id: { $in: orderIds } }),
    ]);

    console.log(`Deleted tickets: ${ticketResult.deletedCount}`);
    console.log(`Deleted orders: ${orderResult.deletedCount}`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error clearing today\'s test purchases:', error);
    process.exit(1);
  }
};

clearTodayTestTickets();
