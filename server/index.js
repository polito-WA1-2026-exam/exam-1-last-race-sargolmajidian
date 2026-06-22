import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import LocalStrategy from 'passport-local';
import * as userDao from './dao/user-dao.js';
import * as gameDao from './dao/game-dao.js';

import {
  buildUndirectedGraph,
  findShortestPath,
  validateRoute as validateRouteHelper
} from './utils/pathUtils.js';

const app = express();
const port = 3001;

app.use(morgan('dev'));
app.use(express.json());

app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true
  })
);

app.use(
  session({
    secret: 'a secret string for sargol project session',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax'
    }
  })
);

app.use(passport.initialize());
app.use(passport.session());

/* Passport authentication */

passport.use(
  new LocalStrategy(
    {
      usernameField: 'username',
      passwordField: 'password'
    },
    async (username, password, done) => {
      try {
        const user =
          await userDao.getUserByCredentials(
            username,
            password
          );

        if (!user) {
          return done(null, false, {
            message: 'Incorrect username or password.'
          });
        }

        return done(null, user);
      } catch (err) {
        console.error(
          'Passport strategy database verification failed:',
          err
        );

        return done(err);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await userDao.getUserById(id);

    if (!user) {
      return done(null, false);
    }

    return done(null, user);
  } catch (err) {
    return done(err);
  }
});

const isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }

  return res.status(401).json({
    error: 'Not authenticated'
  });
};

function getShortestDistance(
  startName,
  destinationName,
  topology
) {
  const graph = buildUndirectedGraph(topology);

  return findShortestPath(
    startName,
    destinationName,
    graph
  );
}

function getPhysicalSegmentKey(stationA, stationB) {
  return Number(stationA) < Number(stationB)
    ? `${stationA}-${stationB}`
    : `${stationB}-${stationA}`;
}

function buildRouteFromSegments(
  startStationId,
  selectedSegments
) {
  if (
    !Array.isArray(selectedSegments) ||
    selectedSegments.length === 0
  ) {
    return null;
  }

  const normalizedStartStationId =
    Number(startStationId);

  if (!Number.isInteger(normalizedStartStationId)) {
    return null;
  }

  const route = [normalizedStartStationId];
  const usedSegments = new Set();

  let currentStationId = normalizedStartStationId;

  for (const rawSegment of selectedSegments) {
    if (!rawSegment) {
      return null;
    }

    const fromId = Number(rawSegment.from_id);
    const toId = Number(rawSegment.to_id);

    if (
      !Number.isInteger(fromId) ||
      !Number.isInteger(toId) ||
      fromId === toId
    ) {
      return null;
    }

    const segmentKey = getPhysicalSegmentKey(
      fromId,
      toId
    );

    if (usedSegments.has(segmentKey)) {
      return null;
    }

    usedSegments.add(segmentKey);

    let nextStationId = null;

    if (fromId === currentStationId) {
      nextStationId = toId;
    } else if (toId === currentStationId) {
      nextStationId = fromId;
    }

    if (nextStationId === null) {
      return null;
    }

    route.push(nextStationId);
    currentStationId = nextStationId;
  }

  return route;
}

async function saveInvalidGame(req) {
  const currentDate = new Date()
    .toISOString()
    .split('T')[0];

  await gameDao.saveGameResult(
    req.user.id,
    0,
    currentDate
  );

  req.session.currentGame = null;
}

async function returnInvalidGame(req, res) {
  await saveInvalidGame(req);

  return res.json({
    valid: false,
    score: 0,
    steps: []
  });
}

/* Authentication APIs */

app.post(
  '/api/sessions',
  passport.authenticate('local'),
  (req, res) => {
    return res.status(201).json(req.user);
  }
);

app.get('/api/sessions/current', (req, res) => {
  if (req.isAuthenticated()) {
    return res.status(200).json(req.user);
  }

  return res.status(401).json({
    error: 'Not authenticated'
  });
});

app.delete(
  '/api/sessions/current',
  isLoggedIn,
  (req, res) => {
    req.logout(err => {
      if (err) {
        return res.status(500).json({
          error: err.message
        });
      }

      req.session.destroy(sessionError => {
        if (sessionError) {
          return res.status(500).json({
            error: sessionError.message
          });
        }

        return res.status(204).end();
      });
    });
  }
);

/* Network and game data APIs */

app.get('/api/network', isLoggedIn, async (req, res) => {
  try {
    const topology =
      await gameDao.getNetworkTopology();

    return res.json(topology);
  } catch (err) {
    console.error('Network loading error:', err);

    return res.status(500).json({
      error:
        'Database error while fetching network.'
    });
  }
});

app.get('/api/stations', isLoggedIn, async (req, res) => {
  try {
    const stations =
      await gameDao.getAllStations();

    const interchangeIds = new Set(
      await gameDao.getInterchangeStationIds()
    );

    const result = stations.map(station => ({
      id: Number(station.id),
      name: station.name,
      is_interchange: interchangeIds.has(
        Number(station.id)
      )
        ? 1
        : 0
    }));

    return res.json(result);
  } catch (err) {
    console.error('Station loading error:', err);

    return res.status(500).json({
      error:
        'Database error while fetching stations.'
    });
  }
});

app.get('/api/segments', isLoggedIn, async (req, res) => {
  try {
    const segments =
      await gameDao.getSegments();

    return res.json(segments);
  } catch (err) {
    console.error('Segment loading error:', err);

    return res.status(500).json({
      error:
        'Database error while fetching segments.'
    });
  }
});

app.get('/api/ranking', isLoggedIn, async (req, res) => {
  try {
    const ranking =
      await userDao.getGlobalRanking();

    return res.json(ranking);
  } catch (err) {
    console.error('Ranking loading error:', err);

    return res.status(500).json({
      error:
        'Database error while fetching ranking.'
    });
  }
});

app.get('/api/events', isLoggedIn, async (req, res) => {
  try {
    const events =
      await gameDao.getAllEvents();

    return res.json(events);
  } catch (err) {
    console.error('Event loading error:', err);

    return res.status(500).json({
      error:
        'Database error while fetching events.'
    });
  }
});

/* Game setup */

app.get('/api/game/setup', isLoggedIn, async (req, res) => {
  try {
    const stations =
      await gameDao.getAllStations();

    const topology =
      await gameDao.getNetworkTopology();

    if (stations.length < 2) {
      return res.status(500).json({
        error:
          'Not enough stations to start a game.'
      });
    }

    const validPairs = [];

    for (const possibleStart of stations) {
      for (const possibleTarget of stations) {
        if (
          Number(possibleStart.id) ===
          Number(possibleTarget.id)
        ) {
          continue;
        }

        const distance = getShortestDistance(
          possibleStart.name,
          possibleTarget.name,
          topology
        );

        if (distance >= 3) {
          validPairs.push({
            startStation: possibleStart,
            targetStation: possibleTarget
          });
        }
      }
    }

    if (validPairs.length === 0) {
      return res.status(500).json({
        error:
          'No station pair with a minimum distance of three segments was found.'
      });
    }

    const selectedPair =
      validPairs[
        Math.floor(
          Math.random() * validPairs.length
        )
      ];

    const startStation =
      selectedPair.startStation;

    const targetStation =
      selectedPair.targetStation;

    req.session.currentGame = {
      startStationId: Number(startStation.id),
      endStationId: Number(targetStation.id)
    };

    return res.json({
      startStation,
      targetStation
    });
  } catch (err) {
    console.error('Game setup error:', err);

    return res.status(500).json({
      error:
        'Database error during game setup.'
    });
  }
});

/* Game execution */

app.post(
  '/api/games/execute',
  isLoggedIn,
  async (req, res) => {
    const { segments } = req.body;
    const currentGame =
      req.session.currentGame;

    if (!currentGame) {
      return res.status(400).json({
        error:
          'No game is currently active. Call /api/game/setup first.'
      });
    }

    const startStationId =
      Number(currentGame.startStationId);

    const endStationId =
      Number(currentGame.endStationId);

    try {
      const route = buildRouteFromSegments(
        startStationId,
        segments
      );

      if (
        route === null ||
        route.length < 2 ||
        route[0] !== startStationId ||
        route[route.length - 1] !== endStationId
      ) {
        return await returnInvalidGame(
          req,
          res
        );
      }

      const connections =
        await gameDao.getConnectionsWithLines();

      const interchangeIds =
        await gameDao.getInterchangeStationIds();

      const interchangeSet = new Set(
        interchangeIds.map(Number)
      );

      const isValid = validateRouteHelper(
        route,
        connections,
        interchangeSet
      );

      if (!isValid) {
        return await returnInvalidGame(
          req,
          res
        );
      }

      const events =
        await gameDao.getAllEvents();

      if (
        !Array.isArray(events) ||
        events.length === 0
      ) {
        return res.status(500).json({
          error:
            'No game events are available.'
        });
      }

      const stations =
        await gameDao.getAllStations();

      const stationById = new Map(
        stations.map(station => [
          Number(station.id),
          station.name
        ])
      );

      let coins = 20;
      const steps = [];

      for (
        let index = 0;
        index < route.length - 1;
        index++
      ) {
        const event =
          events[
            Math.floor(
              Math.random() * events.length
            )
          ];

        const effect = Number(event.effect);

        if (!Number.isInteger(effect)) {
          throw new Error(
            `Invalid event effect for event ${event.id}`
          );
        }

        coins += effect;

        steps.push({
          from: stationById.get(
            route[index]
          ),
          to: stationById.get(
            route[index + 1]
          ),
          event: event.description,
          effect,
          coins
        });
      }

      const finalScore = Math.max(
        0,
        coins
      );

      const currentDate = new Date()
        .toISOString()
        .split('T')[0];

      await gameDao.saveGameResult(
        req.user.id,
        finalScore,
        currentDate
      );

      req.session.currentGame = null;

      return res.json({
        valid: true,
        score: finalScore,
        steps
      });
    } catch (err) {
      console.error(
        'Game execution error:',
        err
      );

      return res.status(500).json({
        error:
          'Database error while executing the game.'
      });
    }
  }
);

/* Start server */

app.listen(port, () => {
  console.log(
    `Server listening at http://localhost:${port}`
  );
});