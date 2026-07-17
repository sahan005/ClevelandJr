const Database = require('better-sqlite3');
const path = require('path');

// Connect to the SQLite database file
const dbPath = path.join(__dirname, 'bot.db');
const db = new Database(dbPath, { verbose: console.log });

// Initialize the database tables if they don't exist
function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_counts (
      guild_id TEXT,
      user_id TEXT,
      month_year TEXT,
      count INTEGER DEFAULT 0,
      PRIMARY KEY (guild_id, user_id, month_year)
    );
  `);
}

// Function to increment a user's count in a specific guild
function incrementUserCount(guildId, userId, monthYear, amount) {
  const stmt = db.prepare(`
    INSERT INTO user_counts (guild_id, user_id, month_year, count)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(guild_id, user_id, month_year) DO UPDATE SET count = count + ?
  `);
  stmt.run(guildId, userId, monthYear, amount, amount);
}

// Function to get the leaderboard for a specific month in a specific guild
function getMonthlyLeaderboard(guildId, monthYear, limit = 10) {
  const stmt = db.prepare(`
    SELECT user_id, count
    FROM user_counts
    WHERE guild_id = ? AND month_year = ?
    ORDER BY count DESC
    LIMIT ?
  `);
  return stmt.all(guildId, monthYear, limit);
}

// Function to get the all-time leaderboard in a specific guild
function getAllTimeLeaderboard(guildId, limit = 10) {
  const stmt = db.prepare(`
    SELECT user_id, SUM(count) as total_count
    FROM user_counts
    WHERE guild_id = ?
    GROUP BY user_id
    ORDER BY total_count DESC
    LIMIT ?
  `);
  return stmt.all(guildId, limit);
}

// Function to get a specific user's total count in a specific guild
function getUserTotalCount(guildId, userId) {
  const stmt = db.prepare(`
    SELECT SUM(count) as total_count
    FROM user_counts
    WHERE guild_id = ? AND user_id = ?
  `);
  const row = stmt.get(guildId, userId);
  return row ? row.total_count || 0 : 0;
}

// Function to get a specific user's count for a specific month in a specific guild
function getUserMonthlyCount(guildId, userId, monthYear) {
  const stmt = db.prepare(`
    SELECT count
    FROM user_counts
    WHERE guild_id = ? AND user_id = ? AND month_year = ?
  `);
  const row = stmt.get(guildId, userId, monthYear);
  return row ? row.count : 0;
}

module.exports = {
  db,
  initDatabase,
  incrementUserCount,
  getMonthlyLeaderboard,
  getAllTimeLeaderboard,
  getUserTotalCount,
  getUserMonthlyCount
};
