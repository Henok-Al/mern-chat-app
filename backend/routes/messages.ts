import express, { Request, Response } from 'express';
import Message, { IMessage } from '../models/Message';
import auth from '../middleware/auth';
import { IUser } from '../models/User';

const router = express.Router();

interface AuthRequest extends Request {
  user?: IUser;
}

router.get('/', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { chatRoom = 'general', limit = '50', page = '1' } = req.query;
    
    const messages = await Message.find({ chatRoom })
      .populate('sender', 'username')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    res.json({
      messages: messages.reverse(),
      page: parseInt(page),
      limit: parseInt(limit),
      total: await Message.countDocuments({ chatRoom })
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/recent', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { chatRoom = 'general', limit = '20' } = req.query;
    
    const messages = await Message.find({ chatRoom })
      .populate('sender', 'username')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({
      messages: messages.reverse()
    });
  } catch (error) {
    console.error('Get recent messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;