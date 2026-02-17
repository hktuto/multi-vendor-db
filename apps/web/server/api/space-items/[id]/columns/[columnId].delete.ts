import { db } from '@nuxthub/db'
import { eq, and, isNull } from 'drizzle-orm'
import { spaceItemColumns } from '../../../../db/schema'

// DELETE /api/space-items/[id]/columns/[columnId] - Soft delete a column
export default defineEventHandler(async (event) => {
  const itemId = getRouterParam(event, 'id')
  const columnId = getRouterParam(event, 'columnId')
  
  if (!itemId || !columnId) {
    throw createError({ statusCode: 400, statusMessage: 'Item ID and Column ID required' })
  }

  const { user } = await requireUserSession(event)

  try {
    // Soft delete
    const [deleted] = await db.update(spaceItemColumns)
      .set({ 
        deletedAt: new Date(),
        updatedAt: new Date()
      })
      .where(and(
        eq(spaceItemColumns.id, columnId),
        eq(spaceItemColumns.itemId, itemId),
        isNull(spaceItemColumns.deletedAt)
      ))
      .returning()

    if (!deleted) {
      throw createError({ statusCode: 404, statusMessage: 'Column not found' })
    }

    return { success: true, deleted: deleted.id }
  } catch (error: any) {
    throw createError({ 
      statusCode: 500, 
      statusMessage: error.message || 'Failed to delete column' 
    })
  }
})