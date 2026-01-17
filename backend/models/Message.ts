import mongoose, { Document, Schema, Model } from 'mongoose';
import { IUser } from './User';

export interface IMessage extends Document {
  sender: mongoose.Types.ObjectId | IUser;
  content: string;
  chatRoom: string;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema: Schema<IMessage> = new Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  chatRoom: {
    type: String,
    required: true,
    default: 'general'
  }
}, {
  timestamps: true
});

const Message: Model<IMessage> = mongoose.model<IMessage>('Message', messageSchema);

export default Message;