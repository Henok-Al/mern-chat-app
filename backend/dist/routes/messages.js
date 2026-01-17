"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Message_1 = __importDefault(require("../models/Message"));
const auth_1 = __importDefault(require("../middleware/auth"));
const router = express_1.default.Router();
router.get('/', auth_1.default, async (req, res) => {
    try {
        const { chatRoom = 'general', limit = '50', page = '1' } = req.query;
        const messages = await Message_1.default.find({ chatRoom })
            .populate('sender', 'username')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));
        res.json({
            messages: messages.reverse(),
            page: parseInt(page),
            limit: parseInt(limit),
            total: await Message_1.default.countDocuments({ chatRoom })
        });
    }
    catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
router.get('/recent', auth_1.default, async (req, res) => {
    try {
        const { chatRoom = 'general', limit = '20' } = req.query;
        const messages = await Message_1.default.find({ chatRoom })
            .populate('sender', 'username')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));
        res.json({
            messages: messages.reverse()
        });
    }
    catch (error) {
        console.error('Get recent messages error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.default = router;
//# sourceMappingURL=messages.js.map