import { db } from '@nuxthub/db'
import { eq, and, isNull } from 'drizzle-orm'
import { spaceItemRows } from '../../../../db/schema'

// DELETE /api/space-items/[id]/rows/[rowId] - Soft delete a row
export default defineEventHandler(async (event) => {
  const itemId = getRouterParam(event, 'id')
  const rowId = getRouterParam(event, 'rowId')
  
  if (!itemId || !rowId) {
    throw createError({ statusCode: 400, statusMessage: 'Item ID and Row ID required' })
  }

  const { user } = await requireUserSession(event)

  try {
    const [deleted] = await db.update(spaceItemRows)
      .set({ 
        deletedAt: new Date(),
        deletedBy: user.id,
        updatedAt: new Date(),
        updatedBy: user.id
      })
      .where(and(
        eq(spaceItemRows.id, rowId),
        eq(spaceItemRows.itemId, itemId),
        isNull(spaceItemRows.deletedAt)
      ))
      .returning()

    if (!deleted) {
      throw createError({ statusCode: 404, statusMessage: 'Row not found' })
    }

    return { success: true, deleted: deleted.id }
  } catch (error: any) {
    throw createError({ 
      statusCode: 500, 
      statusMessage: error.message || 'Failed to delete row' 
    })
  }
})