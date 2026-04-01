import express from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Ticket from '../models/Ticket.js';
import Vote from '../models/Vote.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/users/admin/list - admin user management list with spend summaries
router.get('/admin/list', protect, admin, async (req, res) => {
  try {
    const search = (req.query.search || '').trim();
    const includeAdmins = req.query.includeAdmins === 'true';

    const userFilter = {};
    if (!includeAdmins) {
      userFilter.role = 'user';
    }

    if (search) {
      userFilter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(userFilter)
      .select('name username email role isEmailVerified createdAt')
      .sort({ createdAt: -1 })
      .lean();

    const userIds = users.map((user) => user._id);

    if (userIds.length === 0) {
      return res.json({ users: [], total: 0 });
    }

    let ticketSpendAgg = [];
    let voteSpendAgg = [];

    try {
      ticketSpendAgg = await Order.aggregate([
        { $match: { userId: { $in: userIds }, status: 'completed' } },
        { $group: { _id: '$userId', totalTicketSpend: { $sum: { $ifNull: ['$totalAmount', 0] } } } },
      ]);
    } catch (error) {
      console.error('Ticket spend aggregation warning:', error.message);
    }

    try {
      voteSpendAgg = await Vote.aggregate([
        {
          $match: {
            user: { $in: userIds },
            voteType: 'paid',
          },
        },
        {
          $lookup: {
            from: 'categories',
            localField: 'category',
            foreignField: '_id',
            as: 'categoryData',
          },
        },
        {
          $unwind: {
            path: '$categoryData',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $group: {
            _id: '$user',
            totalVoteSpend: {
              $sum: {
                $multiply: [
                  { $ifNull: ['$voteWeight', 0] },
                  { $ifNull: ['$categoryData.pricePerVote', 0] },
                ],
              },
            },
          },
        },
      ]);
    } catch (error) {
      console.error('Vote spend aggregation warning:', error.message);
    }

    const ticketSpendMap = new Map(ticketSpendAgg.map((row) => [String(row._id), row.totalTicketSpend || 0]));
    const voteSpendMap = new Map(voteSpendAgg.map((row) => [String(row._id), row.totalVoteSpend || 0]));

    const payload = users.map((user) => {
      const id = String(user._id);
      const ticketSpend = ticketSpendMap.get(id) || 0;
      const voteSpend = voteSpendMap.get(id) || 0;
      return {
        ...user,
        totalTicketSpend: ticketSpend,
        totalVoteSpend: voteSpend,
        totalSpend: ticketSpend + voteSpend,
      };
    });

    return res.json({ users: payload, total: payload.length });
  } catch (error) {
    console.error('Admin users list error:', error);
    return res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// DELETE /api/users/admin/:id - delete user account and anonymize linked records
router.delete('/admin/:id', protect, admin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ message: 'Admin users cannot be deleted from this endpoint' });
    }

    const userObjectId = user._id;

    await Promise.all([
      Order.updateMany({ userId: userObjectId }, { $unset: { userId: '' } }),
      Ticket.updateMany({ userId: userObjectId }, { $unset: { userId: '' } }),
      Vote.updateMany({ user: userObjectId }, { $unset: { user: '' } }),
      User.deleteOne({ _id: userObjectId }),
    ]);

    return res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({ message: 'Failed to delete user' });
  }
});

export default router;
