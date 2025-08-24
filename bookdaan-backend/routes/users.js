import express from 'express';
import User from '../models/User.js';
import Book from '../models/Book.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// 🏅 Badge generator
const getBadges = (donateCount) => {
  if (donateCount >= 10) return ['Gold Donor'];
  if (donateCount >= 5) return ['Silver Donor'];
  if (donateCount >= 1) return ['Bronze Donor'];
  return [];
};

// 🔔 GET all notifications
router.get('/notifications', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('notifications')
      .populate('notifications.book', 'title')
      .populate('notifications.from', 'name photo');

    if (!user) return res.status(404).json({ error: 'User not found' });

    const sorted = user.notifications.sort((a, b) => b.createdAt - a.createdAt);
    res.json(sorted);
  } catch (err) {
    console.error('Notification fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// 🔔 PATCH: Mark notification as seen
router.patch('/notifications/:notificationId/seen', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const notification = user.notifications.id(req.params.notificationId);
    if (!notification) return res.status(404).json({ error: 'Notification not found' });

    notification.seen = true;
    await user.save();
    res.json({ message: 'Marked as seen' });
  } catch (err) {
    console.error('Notification update error:', err);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

// 🔔 DELETE: Single notification
router.delete('/notifications/:notificationId', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.notifications = user.notifications.filter(
      n => n._id.toString() !== req.params.notificationId
    );
    await user.save();

    res.json({ message: 'Notification removed' });
  } catch (err) {
    console.error('Notification delete error:', err);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// 🔔 DELETE: All seen notifications
router.delete('/notifications/clear/inactive', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const before = user.notifications.length;
    user.notifications = user.notifications.filter(n => !n.seen);
    const after = user.notifications.length;

    await user.save();
    res.json({ message: `Deleted ${before - after} inactive notifications` });
  } catch (err) {
    console.error('Bulk clear error:', err);
    res.status(500).json({ error: 'Failed to clear inactive notifications' });
  }
});

// 👤 GET: User profile
router.get('/:id/profile', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('followers', 'name photo')
      .populate('following', 'name photo')
      .lean();

    if (!user) return res.status(404).json({ error: 'User not found' });

    const [donatedBooks, requestedBooks] = await Promise.all([
      Book.find({ owner: user._id, status: 'Donated' }).select('title author createdAt location subject status'),
      Book.find({
        requests: {
          $elemMatch: {
            user: user._id,
            status: { $in: ['Pending', 'Accepted'] },
          },
        },
      })
        .select('title author location subject status requests owner')
        .populate('owner', 'name _id'),
    ]);

    const badges = getBadges(donatedBooks.length);
    const { password, firebaseUid, ...sanitizedUser } = user;

    res.json({
      ...sanitizedUser,
      donatedBooks,
      requestedBooks,
      badges,
    });
  } catch (err) {
    console.error('Profile fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch profile', details: err.message });
  }
});

// 👤 PATCH: Update user profile
router.patch('/:id', authMiddleware, async (req, res) => {
  if (req.params.id !== req.user.id) {
    return res.status(403).json({ error: 'Unauthorized to update this profile' });
  }

  const allowedFields = ['name', 'email', 'bio', 'location', 'interests', 'phone', 'firebaseUid', 'photo'];
  const updates = {};

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }

  try {
    const updatedUser = await User.findByIdAndUpdate(req.user.id, updates, { new: true });
    if (!updatedUser) return res.status(404).json({ error: 'User not found' });

    res.json({ message: 'Profile updated', user: updatedUser });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Update failed', details: err.message });
  }
});

// 🤝 POST: Follow user
router.post('/:id/follow', authMiddleware, async (req, res) => {
  const me = req.user.id;
  const other = req.params.id;

  if (me === other) return res.status(400).json({ error: "You can't follow yourself" });

  try {
    const [meDoc, otherDoc] = await Promise.all([
      User.findById(me),
      User.findById(other),
    ]);

    if (!meDoc || !otherDoc) return res.status(404).json({ error: 'User not found' });

    if (!meDoc.following.includes(other)) {
      meDoc.following.push(other);
      otherDoc.followers.push(me);
      await Promise.all([meDoc.save(), otherDoc.save()]);
    }

    res.json({ message: 'Followed', following: meDoc.following });
  } catch (err) {
    console.error('Follow error:', err);
    res.status(500).json({ error: 'Follow failed', details: err.message });
  }
});

// 🚫 POST: Unfollow user
router.post('/:id/unfollow', authMiddleware, async (req, res) => {
  const me = req.user.id;
  const other = req.params.id;

  if (me === other) return res.status(400).json({ error: "You can't unfollow yourself" });

  try {
    const [meDoc, otherDoc] = await Promise.all([
      User.findById(me),
      User.findById(other),
    ]);

    if (!meDoc || !otherDoc) return res.status(404).json({ error: 'User not found' });

    meDoc.following = meDoc.following.filter(id => id.toString() !== other);
    otherDoc.followers = otherDoc.followers.filter(id => id.toString() !== me);

    await Promise.all([meDoc.save(), otherDoc.save()]);
    res.json({ message: 'Unfollowed', following: meDoc.following });
  } catch (err) {
    console.error('Unfollow error:', err);
    res.status(500).json({ error: 'Unfollow failed', details: err.message });
  }
});

export default router;
