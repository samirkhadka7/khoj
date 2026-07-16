/**
 * Shared shape of a chat message — matches the server's broadcast payload
 * AND the REST history endpoint's response. Date-as-string so it survives
 * JSON serialization on the wire.
 */
export interface ChatMessage {
  _id: string
  contactRequestId: string
  senderId: string
  receiverId: string
  content: string
  read: boolean
  createdAt: string
}

export type ChatAck = { ok: true } | { ok: false; error: string }
