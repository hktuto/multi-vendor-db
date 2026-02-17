import { db } from '@nuxthub/db'
import { eq, and, isNull } from 'drizzle-orm'
import { spaceItemRows } from '../../../../db/schema'

// PATCH /api/space-items/[id]/rows/[rowId] - Update a row
export default defineEventHandler(async (event) => {
  const itemId = getRouterParam(event, 'id')
  const rowId = getRouterParam(event, 'rowId')
  
  if (!itemId || !rowId) {
    throw createError({ statusCode: 400, statusMessage: 'Item ID and Row ID required' })
  }

  const { user } = await requireUserSession(event)
  const body = await readBody(event)

  try {
    const updates: any = {
      updatedAt: new Date(),
      updatedBy: user.id
    }

    if (body.data !== undefined) {
      updates.data = body.data
    }

    const [updated] = await db.update(spaceItemRows)
      .set(updates)
      .where(and(
        eq(spaceItemRows.id, rowId),
        eq(spaceItemRows.itemId, itemId),
        isNull(spaceItemRows.deletedAt)
      ))
      .returning()

    if (!updated) {
      throw createError({ statusCode: 404, statusMessage: 'Row not found' })
    }

    return updated
  } catch (error: any) {
    throw createError({ 
      statusCode: 500, 
      statusMessage: error.message || 'Failed to update row' 
    })
  }
})