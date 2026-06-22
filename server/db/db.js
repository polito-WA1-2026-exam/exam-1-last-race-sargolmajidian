import sqlite3 from 'sqlite3';

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFilePath);

const databasePath = path.join(
  currentDirectory,
  'database.db'
);

const db = new sqlite3.Database(
  databasePath,
  err => {
    if (err) {
      console.error(
        'Database connection error:',
        err.message
      );

      return;
    }

    db.run('PRAGMA foreign_keys = ON', pragmaError => {
      if (pragmaError) {
        console.error(
          'Failed to enable SQLite foreign keys:',
          pragmaError.message
        );

        return;
      }

      console.log(
        'Connected successfully to the SQLite database.'
      );
    });
  }
);

export default db;