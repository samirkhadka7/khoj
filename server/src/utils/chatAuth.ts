import mongoose from 'mongoose'
import { ContactRequest, type IContactRequest } from '../models'

/**
 * Authorization gate for the chat feature.
 *
 * Returns the ContactRequest only if BOTH conditions hold:
 *   1. Status === 'accepted' (chat is locked otherwise — pending/rejected/expired = no chat)
 *   2. The user is either the tenant or the owner of that request
 *
 * Used by both the Socket.io handlers and the REST history endpoint so the
 * gate logic lives in exactly one place — no chance of the two paths drifting.
 */
export const authorizeChat = async (
  contactRequestId: string,
  userId: string
): Promise<IContactRequest | null> => {
  if (!mongoose.isValidObjectId(contactRequestId)) return null

  const request = await ContactRequest.findById(contactRequestId)
  if (!request) return null
  if (request.status !== 'accepted') return null

  const tenant = request.tenantId.toString()
  const owner = request.ownerId.toString()
  if (userId !== tenant && userId !== owner) return null

  return request
}
