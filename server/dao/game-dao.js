import db from '../db/db.js';

export const getAllStations = () => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT
        id,
        name
      FROM stations
      ORDER BY id
    `;

    db.all(query, [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};


export const getNetworkTopology = () => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT
        l.id AS line_id,
        l.name AS line_name,
        s.id AS station_id,
        s.name AS station_name,
        ls.position AS position
      FROM line_stations AS ls
      INNER JOIN lines AS l
        ON l.id = ls.line_id
      INNER JOIN stations AS s
        ON s.id = ls.station_id
      ORDER BY
        l.id ASC,
        ls.position ASC
    `;

    db.all(query, [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

export const getSegments = () => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT
        ls1.station_id AS from_id,
        s1.name AS from_station,
        ls2.station_id AS to_id,
        s2.name AS to_station
      FROM line_stations AS ls1
      INNER JOIN line_stations AS ls2
        ON ls1.line_id = ls2.line_id
        AND ls2.position = ls1.position + 1
      INNER JOIN stations AS s1
        ON s1.id = ls1.station_id
      INNER JOIN stations AS s2
        ON s2.id = ls2.station_id
      ORDER BY
        ls1.line_id ASC,
        ls1.position ASC
    `;

    db.all(query, [], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }

      const uniqueSegments = new Map();

      for (const row of rows) {
        const firstId = Number(row.from_id);
        const secondId = Number(row.to_id);

        const key =
          firstId < secondId
            ? `${firstId}-${secondId}`
            : `${secondId}-${firstId}`;

        if (!uniqueSegments.has(key)) {
          uniqueSegments.set(key, {
            from_id: firstId,
            from_station: row.from_station,
            to_id: secondId,
            to_station: row.to_station
          });
        }
      }

      resolve([...uniqueSegments.values()]);
    });
  });
};


export const getConnectionsWithLines = () => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT
        ls1.station_id AS a,
        ls2.station_id AS b,
        ls1.line_id AS line_id
      FROM line_stations AS ls1
      INNER JOIN line_stations AS ls2
        ON ls1.line_id = ls2.line_id
        AND ABS(ls1.position - ls2.position) = 1
      ORDER BY
        ls1.line_id ASC,
        ls1.position ASC
    `;

    db.all(query, [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(
          rows.map(row => ({
            a: Number(row.a),
            b: Number(row.b),
            line_id: Number(row.line_id)
          }))
        );
      }
    });
  });
};


export const getInterchangeStationIds = () => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT
        station_id
      FROM line_stations
      GROUP BY station_id
      HAVING COUNT(DISTINCT line_id) > 1
      ORDER BY station_id
    `;

    db.all(query, [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(
          rows.map(row => Number(row.station_id))
        );
      }
    });
  });
};

/**
 * Return all random journey events.
 */
export const getAllEvents = () => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT
        id,
        description,
        coins_effect AS effect
      FROM events
      ORDER BY id
    `;

    db.all(query, [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(
          rows.map(row => ({
            id: Number(row.id),
            description: row.description,
            effect: Number(row.effect)
          }))
        );
      }
    });
  });
};


export const saveGameResult = (
  userId,
  score,
  date
) => {
  return new Promise((resolve, reject) => {
    const query = `
      INSERT INTO games (
        user_id,
        score,
        date
      )
      VALUES (?, ?, ?)
    `;

    db.run(
      query,
      [
        Number(userId),
        Math.max(0, Number(score)),
        date
      ],
      function saveResultCallback(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      }
    );
  });
};