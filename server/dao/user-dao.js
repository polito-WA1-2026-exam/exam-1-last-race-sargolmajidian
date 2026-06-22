import db from '../db/db.js';
import bcrypt from 'bcrypt';

/* Return a user by ID without exposing the password hash. */

export const getUserById = id => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT
        id,
        username,
        name
      FROM users
      WHERE id = ?
    `;

    db.get(query, [id], (err, row) => {
      if (err) {
        reject(err);
        return;
      }

      if (!row) {
        resolve(null);
        return;
      }

      resolve({
        id: Number(row.id),
        username: row.username,
        name: row.name
      });
    });
  });
};


export const getUserByCredentials = (
  username,
  password
) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT
        id,
        username,
        password,
        name
      FROM users
      WHERE username = ?
    `;

    db.get(query, [username], async (err, row) => {
      if (err) {
        reject(err);
        return;
      }

      if (!row) {
        resolve(false);
        return;
      }

      try {
        const passwordMatches =
          await bcrypt.compare(
            password,
            row.password
          );

        if (!passwordMatches) {
          resolve(false);
          return;
        }

        resolve({
          id: Number(row.id),
          username: row.username,
          name: row.name
        });
      } catch (compareError) {
        reject(compareError);
      }
    });
  });
};

/* Return the best score achieved by each user who has played. */

export const getGlobalRanking = () => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT
        u.id AS user_id,
        u.name AS name,
        MAX(g.score) AS max_score
      FROM users AS u
      INNER JOIN games AS g
        ON g.user_id = u.id
      GROUP BY
        u.id,
        u.name
      ORDER BY
        max_score DESC,
        u.name ASC
    `;

    db.all(query, [], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(
        rows.map(row => ({
          user_id: Number(row.user_id),
          name: row.name,
          max_score: Number(row.max_score)
        }))
      );
    });
  });
};