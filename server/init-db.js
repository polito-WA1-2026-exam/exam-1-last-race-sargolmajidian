import db from './db/db.js';
import bcrypt from 'bcrypt';

async function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve(this);
      }
    });
  });
}

async function initDatabase() {
  try {
    await run('PRAGMA foreign_keys = ON');

    await run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS stations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS lines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS line_stations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        line_id INTEGER NOT NULL,
        station_id INTEGER NOT NULL,
        position INTEGER NOT NULL CHECK(position > 0),

        FOREIGN KEY (line_id)
          REFERENCES lines(id)
          ON DELETE CASCADE,

        FOREIGN KEY (station_id)
          REFERENCES stations(id)
          ON DELETE CASCADE,

        UNIQUE(line_id, station_id),
        UNIQUE(line_id, position)
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        description TEXT UNIQUE NOT NULL,
        coins_effect INTEGER NOT NULL
          CHECK(coins_effect BETWEEN -4 AND 4)
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        score INTEGER NOT NULL CHECK(score >= 0),
        date TEXT NOT NULL,

        FOREIGN KEY (user_id)
          REFERENCES users(id)
          ON DELETE CASCADE
      )
    `);

    const hashedPassword = await bcrypt.hash(
      'password123',
      10
    );

    await run(
      `INSERT OR IGNORE INTO users
       (id, username, password, name)
       VALUES (?, ?, ?, ?)`,
      [
        1,
        'john.doe@polito.it',
        hashedPassword,
        'John Doe'
      ]
    );

    await run(
      `INSERT OR IGNORE INTO users
       (id, username, password, name)
       VALUES (?, ?, ?, ?)`,
      [
        2,
        'alice.smith@polito.it',
        hashedPassword,
        'Alice Smith'
      ]
    );

    await run(
      `INSERT OR IGNORE INTO users
       (id, username, password, name)
       VALUES (?, ?, ?, ?)`,
      [
        3,
        'bob.jones@polito.it',
        hashedPassword,
        'Bob Jones'
      ]
    );

    const lines = [
      [1, 'Red Line'],
      [2, 'Blue Line'],
      [3, 'Green Line'],
      [4, 'Yellow Line']
    ];

    for (const [id, name] of lines) {
      await run(
        `INSERT OR IGNORE INTO lines (id, name)
         VALUES (?, ?)`,
        [id, name]
      );
    }

    const stations = [
      [1, 'Centrale'],
      [2, 'Porta Velaria'],
      [3, 'Crocevia del Falco'],
      [4, 'Piazza delle Lanterne'],
      [5, 'Fontana Oscura'],
      [6, 'Borgo Sereno'],
      [7, 'Viale dei Mosaici'],
      [8, 'Torre Cinerea'],
      [9, "Campo dell'Eco"],
      [10, 'Stazione Est'],
      [11, 'Porta Nuova'],
      [12, 'Stazione Ovest']
    ];

    for (const [id, name] of stations) {
      await run(
        `INSERT OR IGNORE INTO stations (id, name)
         VALUES (?, ?)`,
        [id, name]
      );
    }

    const lineStations = [
      // Red Line
      [1, 1, 1],
      [1, 2, 2],
      [1, 3, 3],
      [1, 4, 4],

      // Blue Line
      [2, 1, 1],
      [2, 5, 2],
      [2, 6, 3],
      [2, 7, 4],

      // Green Line
      [3, 2, 1],
      [3, 5, 2],
      [3, 8, 3],
      [3, 9, 4],

      // Yellow Line
      [4, 10, 1],
      [4, 8, 2],
      [4, 7, 3],
      [4, 11, 4],
      [4, 12, 5]
    ];

    for (const [lineId, stationId, position] of lineStations) {
      await run(
        `INSERT OR IGNORE INTO line_stations
         (line_id, station_id, position)
         VALUES (?, ?, ?)`,
        [lineId, stationId, position]
      );
    }

    await run(`
  INSERT INTO games (user_id, score, date)
  VALUES (1, 19, '2026-06-16')
`);

await run(`
  INSERT INTO games (user_id, score, date)
  VALUES (2, 23, '2026-06-17')
`);

    const events = [
      [1, 'Quiet journey', 0],
      [2, 'Wrong platform', -2],
      [3, 'Kind passenger found a coin', 1],
      [4, 'Ticket inspector fine!', -4],
      [5, 'Found wallet on seat', 3],
      [6, 'Metro delay, bought coffee', -1],
      [7, 'Lucky day, vending machine malfunction', 2],
      [8, 'Musician entertainment tips', -1]
    ];

    for (const [id, description, effect] of events) {
      await run(
        `INSERT OR IGNORE INTO events
         (id, description, coins_effect)
         VALUES (?, ?, ?)`,
        [id, description, effect]
      );
    }

    console.log(
      'Database initialized and seeded successfully.'
    );
  } catch (err) {
    console.error('Database initialization failed:', err);
    process.exitCode = 1;
  } finally {
    db.close();
  }
}

initDatabase();