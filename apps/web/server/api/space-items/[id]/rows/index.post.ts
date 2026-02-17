import { db } from '@nuxthub/db'
import { eq, and, isNull } from 'drizzle-orm'
import { spaceItemRows, spaceItems, spaceItemColumns } from '../../../../../db/schema'
import { uuidv7 } from 'uuidv7'

// POST /api/space-items/[id]/rows - Create a new row
export default defineEventHandler(async (event) => {
  const itemId = getRouterParam(event, 'id')
  
  if (!itemId) {
    throw createError({ statusCode: 400, statusMessage: 'Item ID required' })
  }

  const { user } = await requireUserSession(event)
  const body = await readBody(event)

  try {
    // Get item to check if it's a table (rows belong to tables)
    const item = await db.query.spaceItems.findFirst({
      where: eq(spaceItems.id, itemId)
    })

    if (item?.type === 'view') {
      throw createError({ 
        statusCode: 400, 
        statusMessage: 'Cannot create rows in a view. Create in the source table instead.' 
      })
    }

    // Get columns to apply default values
    const columns = await db.query.spaceItemColumns.findMany({
      where: and(
        eq(spaceItemColumns.itemId, itemId),
        isNull(spaceItemColumns.deletedAt)
      )
    })

    // Build data with default values
    const data: Record<string, any> = {}
    for (const col of columns) {
      if (col.defaultValue !== undefined && col.defaultValue !== null) {
        data[col.key] = {
          value: col.defaultValue,
          type: col.type
        }
      }
    }

    // Merge with provided data
    if (body.data) {
      Object.assign(data, body.data)
    }

    const [row] = await db.insert(spaceItemRows).values({
      id: uuidv7(),
      companyId: body.companyId || item?.companyId, // Should get from context
      spaceId: item?.spaceId,
      itemId: itemId,
      data: data,
      createdBy: user.id,
      createdAt: new Date()
    }).returning()

    return row
  } catch (error: any) {
    throw createError({ 
      statusCode: 500, 
      statusMessage: error.message || 'Failed to create row' 
    })
  }
})