const { pool } = require('./config');

// Initialize authentication tables
const initializeAuthTables = async () => {
  try {
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ users table ready');

    // Create refresh_tokens table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        revoked BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ refresh_tokens table ready');

    // Add user_id column to urls table if it doesn't exist
    const checkColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='urls' AND column_name='user_id'
    `);

    if (checkColumn.rows.length === 0) {
      await pool.query(`
        ALTER TABLE urls ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
      `);
      console.log('✅ Added user_id column to urls table');
    }

    // Create index on user_id for performance
    try {
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_urls_user_id ON urls(user_id);
      `);
      console.log('✅ Created index on urls.user_id');
    } catch (e) {
      // Index might already exist, that's okay
    }

  } catch (error) {
    console.error('❌ Error initializing auth tables:', error);
    throw error;
  }
};

module.exports = { initializeAuthTables };
