import express from 'express';
import mongoose from 'mongoose';
import Book from '../models/Book.js';
import User from '../models/User.js';
import Chat from '../models/Chat.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// 🔍 Search books
router.get('/search', async (req, res) => {
  const {
    q, genre, language, condition, status, location, subject,
    sort = 'recent', page = 1, limit = 9,
  } = req.query;

  const query = {};
  if (q) query.$text = { $search: q };
  if (genre) query.genre = genre;
  if (language) query.language = language;
  if (condition) query.condition = condition;
  if (status) query.status = status;
  if (location) query.location = new RegExp(location, 'i');
  if (subject) query.subject = new RegExp(subject, 'i');

  const sortOption = {
    az: { title: 1 },
    za: { title: -1 },
    oldest: { createdAt: 1 },
    recent: { createdAt: -1 },
  }[sort] || { createdAt: -1 };

  const skip = (parseInt(page) - 1) * parseInt(limit);

  try {
    const books = await Book.find(query)
      .collation({ locale: 'en', strength: 2 })
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('owner', 'name photo email')
      .populate('requests.user', 'name photo email');

    const total = await Book.countDocuments(query);
    res.json({ books, total });
  } catch (err) {
    res.status(500).json({ error: 'Search failed', details: err.message });
  }
});

// ✅ Create book
router.post('/', authMiddleware, async (req, res) => {
  try {
    const newBook = new Book({
      ...req.body,
      owner: req.user.id,
    });

    const savedBook = await newBook.save();

    await User.findByIdAndUpdate(req.user.id, {
      $addToSet: { donatedBooks: savedBook._id },
    });

    res.status(201).json(savedBook);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ✅ Get all books
router.get('/', async (req, res) => {
  try {
    const books = await Book.find()
      .sort({ createdAt: -1 })
      .populate('owner', 'name photo email')
      .populate('requests.user', 'name photo email');
    res.json(books);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Get single book
router.get('/:id', async (req, res) => {
  try {
    const book = await Book.findById(req.params.id)
      .populate('owner', 'name photo email')
      .populate('requests.user', 'name photo email')
      .populate('donatedTo', 'name photo email');

    if (!book) return res.status(404).json({ error: 'Book not found' });
    res.json(book);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Request book
router.post('/:id/request', authMiddleware, async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: 'Book not found' });
    if (book.status === 'Donated') return res.status(400).json({ error: 'Book already donated' });

    const activeChat = await Chat.findOne({
      book: book._id,
      participants: { $all: [req.user.id, book.owner.toString()] },
      active: true,
      terminated: { $ne: true },
    });

    if (activeChat) {
      return res.status(400).json({
        error: 'You already have an active chat for this book. Please terminate the chat to re-request.',
      });
    }

    const alreadyRequested = book.requests.find(
      r => r.user.toString() === req.user.id && r.status === 'Pending'
    );
    if (alreadyRequested) return res.status(400).json({ error: 'Already requested' });

    book.requests.push({ user: req.user.id });
    const newRequest = book.requests[book.requests.length - 1];
    book.status = 'Requested';
    await book.save();

    const owner = await User.findById(book.owner);
    const requester = await User.findById(req.user.id).select('name');
    if (owner) {
      owner.notifications.push({
        type: 'book-request',
        message: `${requester.name} has requested your book: "${book.title}"`,
        book: book._id,
        from: req.user.id,
        requestId: newRequest._id,
      });
      await owner.save();
    }

    const populatedBook = await Book.findById(book._id)
      .populate('owner', 'name photo email')
      .populate('requests.user', 'name photo email')
      .populate('donatedTo', 'name photo email');

    res.json({ message: 'Book requested', book: populatedBook });
  } catch (err) {
    res.status(500).json({ error: 'Request failed', details: err.message });
  }
});

// ✅ Withdraw request
router.post('/:id/withdraw', authMiddleware, async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: 'Book not found' });

    const request = book.requests.find(
      r => r.user.toString() === req.user.id && r.status === 'Pending'
    );
    if (!request) return res.status(400).json({ error: 'No active request found' });

    request.status = 'Withdrawn';

    const hasActiveRequests = book.requests.some(
      r => r.status === 'Pending' || r.status === 'Accepted'
    );

    if (!hasActiveRequests) {
      book.status = 'Available';
      book.acceptedRequest = null;
    }

    await book.save();

    const owner = await User.findById(book.owner);
    const requester = await User.findById(req.user.id).select('name');
    if (owner) {
      owner.notifications.push({
        type: 'book-withdraw',
        message: `${requester.name} has withdrawn their request for "${book.title}"`,
        book: book._id,
        from: req.user.id,
      });
      await owner.save();
    }

    const updatedBook = await Book.findById(book._id)
      .populate('owner', 'name photo email')
      .populate('requests.user', 'name photo email');

    res.json({ message: 'Request withdrawn', book: updatedBook });
  } catch (err) {
    res.status(500).json({ error: 'Withdraw failed', details: err.message });
  }
});

// ✅ Accept request
router.post('/:bookId/accept/:requestId', authMiddleware, async (req, res) => {
  try {
    const { bookId, requestId } = req.params;
    const book = await Book.findById(bookId);
    if (!book || book.owner.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const requestToAccept = book.requests.id(requestId);
    if (!requestToAccept || requestToAccept.status !== 'Pending') {
      return res.status(404).json({ error: 'Request not found or already processed' });
    }

    const acceptedUserId = requestToAccept.user.toString();
    const rejectedUserIds = book.requests
      .filter(r => r.status === 'Pending' && r._id.toString() !== requestId)
      .map(r => r.user.toString());

    book.requests.forEach(r => {
      if (r._id.toString() === requestId) r.status = 'Accepted';
      else if (r.status === 'Pending') r.status = 'Rejected';
    });

    book.acceptedRequest = requestToAccept.user;
    book.status = 'Requested';
    await book.save();

    let chat = await Chat.findOne({
      book: bookId,
      participants: { $all: [req.user.id, acceptedUserId] },
    });

    if (chat) {
      chat.active = true;
      chat.terminated = false;
      chat.terminatedBy = null;
      await chat.save();
    } else {
      chat = await Chat.create({
        book: book._id,
        participants: [req.user.id, acceptedUserId],
      });
    }

    const acceptedUser = await User.findById(acceptedUserId);
    if (acceptedUser) {
      acceptedUser.notifications.push({
        type: 'book-accepted',
        message: `Your request for "${book.title}" was accepted!`,
        book: book._id,
        from: req.user.id,
        chat: chat._id,
      });
      await acceptedUser.save();
    }

    const owner = await User.findById(req.user.id);
    if (owner && acceptedUser) {
      owner.notifications.push({
        type: 'chat-started',
        message: `You can now chat with ${acceptedUser.name} about "${book.title}".`,
        book: book._id,
        from: acceptedUserId,
        chat: chat._id,
      });
      await owner.save();
    }

    const rejectedUsers = await User.find({ _id: { $in: rejectedUserIds } });
    for (const user of rejectedUsers) {
      user.notifications.push({
        type: 'book-rejected',
        message: `Your request for "${book.title}" was rejected.`,
        book: book._id,
        from: req.user.id,
      });

      await User.updateOne(
        {
          _id: user._id,
          'notifications.book': book._id,
          'notifications.type': 'book-request',
          'notifications.seen': false,
        },
        {
          $set: { 'notifications.$.seen': true },
        }
      );

      await user.save();
    }

    const updatedBook = await Book.findById(bookId)
      .populate('owner', 'name photo email')
      .populate('requests.user', 'name photo email')
      .populate('donatedTo', 'name photo email');

    res.json({ message: 'Request accepted and chat started', book: updatedBook });
  } catch (err) {
    console.error('❌ Accept failed:', err);
    res.status(500).json({ error: 'Accept failed', details: err.message });
  }
});

// ✅ Reject request
router.post('/:bookId/reject/:userId', authMiddleware, async (req, res) => {
  try {
    const { bookId, userId } = req.params;

    const book = await Book.findById(bookId);
    if (!book || book.owner.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const request = book.requests.find(
      r => r.user.toString() === userId && r.status === 'Pending'
    );
    if (!request) return res.status(404).json({ error: 'Request not found' });

    request.status = 'Rejected';

    const hasActiveRequests = book.requests.some(
      r => r.status === 'Pending' || r.status === 'Accepted'
    );

    if (!hasActiveRequests) {
      book.status = 'Available';
      book.acceptedRequest = null;
    }

    await book.save();

    const user = await User.findById(userId);
    if (user) {
      user.notifications.push({
        type: 'book-rejected',
        message: `Your request for "${book.title}" was rejected.`,
        book: book._id,
        from: req.user.id,
        seen: true,
      });

      await user.save();
    }

    await User.updateOne(
      {
        _id: req.user.id,
        'notifications.book': book._id,
        'notifications.from': userId,
        'notifications.type': 'book-request',
        'notifications.seen': false
      },
      {
        $set: { 'notifications.$.seen': true }
      }
    );

    await Chat.findOneAndUpdate(
      {
        book: bookId,
        participants: { $all: [req.user.id, userId] },
        active: true,
      },
      { active: false }
    );

    const updatedBook = await Book.findById(bookId)
      .populate('owner', 'name photo email')
      .populate('requests.user', 'name photo email');

    res.json({ message: 'Request rejected', book: updatedBook });
  } catch (err) {
    res.status(500).json({ error: 'Reject failed', details: err.message });
  }
});

// ✅ Mark as donated
router.post('/:id/mark-donated', authMiddleware, async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book || book.owner.toString() !== req.user.id || !book.acceptedRequest) {
      return res.status(403).json({ error: 'Unauthorized or no accepted request' });
    }

    book.donatedTo = book.acceptedRequest;
    book.status = 'Donated';
    await book.save();

    await Chat.findOneAndUpdate(
      { book: book._id, active: true },
      { active: false }
    );

    const updatedBook = await Book.findById(book._id)
      .populate('owner', 'name photo email')
      .populate('donatedTo', 'name photo email')
      .populate('requests.user', 'name photo email');

    res.json({ message: 'Book marked as donated', book: updatedBook });
  } catch (err) {
    res.status(500).json({ error: 'Marking donated failed', details: err.message });
  }
});

// ✅ Update a book
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const book = await Book.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!book) return res.status(404).json({ error: 'Book not found' });

    res.json(book);
  } catch (err) {
    console.error('Book update error:', err);
    res.status(500).json({ error: 'Failed to update book', details: err.message });
  }
});

export default router;
