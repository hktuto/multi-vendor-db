import { db } from '@nuxthub/db'
import { eq, and, isNull } from 'drizzle-orm'
import { spaceItemColumns, spaceItems } from '../../../../../db/schema'
import { uuidv7 } from 'uuidv7'

// POST /api/space-items/[id]/columns - Create a new column
export default defineEventHandler(async (event) => {
  const itemId = getRouterParam(event, 'id')
  
  if (!itemId) {
    throw createError({ statusCode: 400, statusMessage: 'Item ID required' })
  }

  // Check if user has permission to edit this item
  const { user } = await requireUserSession(event)
  
  const body = await readBody(event)
  
  // Validate required fields
  if (!body.name || !body.category || !body.type) {
    throw createError({ 
      statusCode: 400, 
      statusMessage: 'name, category, and type are required' 
    })
  }

  // Generate unique key
  const baseKey = body.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
  const uniqueKey = `${baseKey}_${Math.random().toString(36).substring(2, 8)}`

  try {
    // If this is a view, check if trying to create non-dynamic column
    const item = await db.query.spaceItems.findFirst({
      where: eq(spaceItems.id, itemId)
    })

    if (item?.type === 'view' && body.category !== 'dynamic') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Views can only create dynamic columns'
      })
    }

    // Get current max order index
    const existingColumns = await db.query.spaceItemColumns.findMany({
      where: and(
        eq(spaceItemColumns.itemId, itemId),
        isNull(spaceItemColumns.deletedAt)
      ),
      orderBy: (cols, { desc }) => [desc(cols.orderIndex)],
      limit: 1
    })
    
    const orderIndex = existingColumns[0]?.orderIndex !== undefined 
      ? existingColumns[0].orderIndex + 1 
      : 0

    const [column] = await db.insert(spaceItemColumns).values({
      id: uuidv7(),
      itemId: itemId,
      name: body.name,
      key: uniqueKey,
      category: body.category,
      type: body.type,
      orderIndex: orderIndex,
      config: body.config || {},
      defaultValue: body.defaultValue,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning()

    return column
  } catch (error: any) {
    throw createError({ 
      statusCode: 500, 
      statusMessage: error.message || 'Failed to create column' 
    })
  }
})