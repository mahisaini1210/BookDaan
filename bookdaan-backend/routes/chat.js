import express from 'express';
import mongoose from 'mongoose';
import Chat from '../models/Chat.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

/**
 * 🚀 Create or Reactivate Chat Session
 */
router.post('/init', authMiddleware, async (req, res) => {
  try {
    const { bookId, userId } = req.body;

    if (!bookId || !userId) {
      return res.status(400).json({ error: 'Missing bookId or userId' });
    }

    if (req.user.id === userId) {
      return res.status(400).json({ error: 'Cannot chat with yourself' });
    }

    // 1. Check if an active chat exists
    const activeChat = await Chat.findOne({
      book: bookId,
      participants: { $all: [req.user.id, userId] },
      active: true,
    });

    if (activeChat) return res.status(200).json(activeChat);

    // 2. Reactivate a terminated chat if it exists
    const terminatedChat = await Chat.findOne({
      book: bookId,
      participants: { $all: [req.user.id, userId] },
      active: false,
      terminated: true,
    });

    if (terminatedChat) {
      terminatedChat.active = true;
      terminatedChat.terminated = false;
      terminatedChat.terminatedBy = null;
      await terminatedChat.save();
      return res.status(200).json(terminatedChat);
    }

    // 3. Create a new chat
    const newChat = await Chat.create({
      book: bookId,
      participants: [req.user.id, userId],
    });

    res.status(201).json(newChat);
  } catch (err) {
    console.error('❌ Chat init error:', err);
    res.status(500).json({ error: 'Failed to create or fetch chat', details: err.message });
  }
});

/**
 * 📥 Fetch All Chats for the Logged-in User
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const chats = await Chat.find({
      participants: req.user.id,
    })
      .sort({ updatedAt: -1 })
      .populate('book', 'title')
      .populate('participants', 'name photo');

    res.json(chats);
  } catch (err) {
    console.error('❌ Chat fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch chats', details: err.message });
  }
});

/**
 * ✉️ Send a Message
 */
router.post('/:chatId/message', authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    const { chatId } = req.params;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Message text is required' });
    }

    const chat = await Chat.findById(chatId);

    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    if (!chat.participants.includes(req.user.id)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (!chat.active || chat.terminated) {
      return res.status(400).json({ error: 'Chat is terminated. Cannot send messages.' });
    }

    chat.messages.push({ sender: req.user.id, text });
    chat.updatedAt = new Date(); // useful for sorting chats
    await chat.save();

    res.json(chat);
  } catch (err) {
    console.error('❌ Send message error:', err);
    res.status(500).json({ error: 'Failed to send message', details: err.message });
  }
});

/**
 * ❌ Terminate a Chat
 */
router.post('/:chatId/close', authMiddleware, async (req, res) => {
  try {
    const { chatId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ error: 'Invalid chat ID' });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    if (!chat.participants.includes(req.user.id)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    chat.active = false;
    chat.terminated = true;
    chat.terminatedBy = req.user.id;
    await chat.save();

    // 🔕 Mark related 'chat-started' notifications as seen
    await Promise.all(
      chat.participants.map(participantId =>
        mongoose.model('User').updateOne(
          {
            _id: participantId,
            'notifications.chat': chat._id,
            'notifications.type': 'chat-started',
            'notifications.seen': false,
          },
          {
            $set: { 'notifications.$.seen': true },
          }
        )
      )
    );

    res.json({ message: 'Chat terminated successfully' });
  } catch (err) {
    console.error('❌ Close chat error:', err);
    res.status(500).json({ error: 'Failed to terminate chat', details: err.message });
  }
});

export default router;
