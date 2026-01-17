import mongoose, { Document, Model } from 'mongoose';
import { IUser } from './User';
export interface IMessage extends Document {
    sender: mongoose.Types.ObjectId | IUser;
    content: string;
    chatRoom: string;
    createdAt: Date;
    updatedAt: Date;
}
declare const Message: Model<IMessage>;
export default Message;
//# sourceMappingURL=Message.d.ts.map