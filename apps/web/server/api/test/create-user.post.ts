import { uuidv7 } from "uuidv7";

/**
 * Test API: Create a user
 * 
 * This demonstrates the correct pattern:
 * 1. Client calls API to create data
 * 2. Server writes to PostgreSQL
 * 3. Electric SQL syncs the change to all subscribers
 * 4. Subscribers receive insert event via useElectricSync
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { name, email } = body;

  if (!name || !email) {
    throw createError({
      statusCode: 400,
      statusMessage: "Name and email are required",
    });
  }

  try {
    // Use hubDatabase() to access the database
    const db = hubDatabase();
    
    const id = uuidv7();
    const now = new Date().toISOString();

    await db
      .prepare(
        `INSERT INTO users (id, email, name, created_at, updated_at, is_active)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(id, email, name, now, now, true)
      .run();

    return {
      success: true,
      user: {
        id,
        email,
        name,
        created_at: now,
        updated_at: now,
        is_active: true,
      },
    };
  } catch (err: any) {
    console.error("[test/create-user] Error:", err);
    throw createError({
      statusCode: 500,
      statusMessage: err.message || "Failed to create user",
    });
  }
});
