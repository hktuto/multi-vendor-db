import { db } from '@nuxthub/db'
import { eq, and, isNull } from 'drizzle-orm'
import { spaceItemColumns } from '../../../../db/schema'

// PATCH /api/space-items/[id]/columns/[columnId] - Update a column
export default defineEventHandler(async (event) => {
  const itemId = getRouterParam(event, 'id')
  const columnId = getRouterParam(event, 'columnId')
  
  if (!itemId || !columnId) {
    throw createError({ statusCode: 400, statusMessage: 'Item ID and Column ID required' })
  }

  const { user } = await requireUserSession(event)
  const body = await readBody(event)

  try {
    // Only allow updating certain fields
    const allowedUpdates: any = {
      updatedAt: new Date()
    }
    
    if (body.name !== undefined) allowedUpdates.name = body.name
    if (body.config !== undefined) allowedUpdates.config = body.config
    if (body.defaultValue !== undefined) allowedUpdates.defaultValue = body.defaultValue

    const [updated] = await db.update(spaceItemColumns)
      .set(allowedUpdates)
      .where(and(
        eq(spaceItemColumns.id, columnId),
        eq(spaceItemColumns.itemId, itemId),
        isNull(spaceItemColumns.deletedAt)
      ))
      .returning()

    if (!updated) {
      throw createError({ statusCode: 404, statusMessage: 'Column not found' })
    }

    return updated
  } catch (error: any) {
    throw createError({ 
      statusCode: 500, 
      statusMessage: error.message || 'Failed to update column' 
    })
  }
})