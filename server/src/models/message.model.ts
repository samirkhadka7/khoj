import { Schema, model, Types } from 'mongoose'

/**
 * Chat message between tenant and owner.
 * Chat is unlocked ONLY after the related ContactRequest.status === 'accepted'.
 * That access check runs at the route layer; the model just stores raw messages.
 */
export interface IMessage {
  _id: Types.ObjectId
  contactRequestId: Types.ObjectId
  senderId: Types.ObjectId
  receiverId: Types.ObjectId
  content: string
  read: boolean
  createdAt: Date
  updatedAt: Date
}

const messageSchema = new Schema<IMessage>(
  {
    contactRequestId: {
      type: Schema.Types.ObjectId,
      ref: 'ContactRequest',
      required: true,
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiverId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
)

// Compound index for the chat thread query: "all messages in this conversation, oldest first"
messageSchema.index({ contactRequestId: 1, createdAt: 1 })

export const Message = model<IMessage>('Message', messageSchema)
