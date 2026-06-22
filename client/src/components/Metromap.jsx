import { useMemo } from 'react';

const LINE_COLORS = {
  1: '#ef4444',
  2: '#1d82f5',
  3: '#34c759',
  4: '#ffd60a'
};

const STATION_LAYOUT = {
  Centrale: {
    x: 80,
    y: 110,
    labelX: 80,
    labelY: 58
  },

  'Porta Velaria': {
    x: 300,
    y: 110,
    labelX: 300,
    labelY: 58
  },

  'Crocevia del Falco': {
    x: 540,
    y: 110,
    labelX: 540,
    labelY: 58
  },

  'Piazza delle Lanterne': {
    x: 800,
    y: 110,
    labelX: 800,
    labelY: 58
  },

  'Fontana Oscura': {
    x: 300,
    y: 275,
    labelX: 300,
    labelY: 330
  },

  'Borgo Sereno': {
    x: 540,
    y: 275,
    labelX: 540,
    labelY: 330
  },

  'Viale dei Mosaici': {
    x: 800,
    y: 275,
    labelX: 800,
    labelY: 330
  },

  'Stazione Est': {
    x: 90,
    y: 455,
    labelX: 90,
    labelY: 510
  },

  'Torre Cinerea': {
    x: 540,
    y: 455,
    labelX: 540,
    labelY: 510
  },

  "Campo dell'Eco": {
    x: 800,
    y: 455,
    labelX: 800,
    labelY: 510
  },

  'Porta Nuova': {
    x: 985,
    y: 455,
    labelX: 985,
    labelY: 510
  },

  'Stazione Ovest': {
    x: 1120,
    y: 455,
    labelX: 1120,
    labelY: 510
  }
};

function normalizeTopologyRow(row) {
  return {
    lineId: Number(
      row.line_id ??
      row.lineId
    ),

    lineName: String(
      row.line_name ??
      row.lineName ??
      ''
    ),

    stationId: Number(
      row.station_id ??
      row.stationId
    ),

    stationName: String(
      row.station_name ??
      row.stationName ??
      ''
    ),

    position: Number(row.position)
  };
}

function buildLines(network) {
  const linesById = new Map();

  for (const rawRow of network) {
    const row = normalizeTopologyRow(rawRow);

    const rowIsValid =
      Number.isInteger(row.lineId) &&
      Number.isInteger(row.stationId) &&
      Number.isFinite(row.position) &&
      row.stationName.length > 0;

    if (!rowIsValid) {
      continue;
    }

    if (!linesById.has(row.lineId)) {
      linesById.set(row.lineId, {
        id: row.lineId,
        name: row.lineName,
        stations: []
      });
    }

    linesById
      .get(row.lineId)
      .stations
      .push(row);
  }

  const lines = [...linesById.values()];

  for (const line of lines) {
    line.stations.sort(
      (first, second) =>
        first.position - second.position
    );
  }

  lines.sort(
    (first, second) =>
      first.id - second.id
  );

  return lines;
}

function buildLinePoints(stations) {
  const points = [];

  for (const station of stations) {
    const layout =
      STATION_LAYOUT[station.stationName];

    if (!layout) {
      continue;
    }

    points.push(
      `${layout.x},${layout.y}`
    );
  }

  return points.join(' ');
}

export default function MetroMap({
  network,
  stations,
  showEdges = true,
  startStationId = null,
  targetStationId = null
}) {
 const validNetwork = useMemo(
  () => (
    Array.isArray(network)
      ? network
      : []
  ),
  [network]
);

const validStations = useMemo(
  () => (
    Array.isArray(stations)
      ? stations
      : []
  ),
  [stations]
);


  const lines = useMemo(
    () => buildLines(validNetwork),
    [validNetwork]
  );

  if (
    validNetwork.length === 0 ||
    validStations.length === 0
  ) {
    return (
      <div className="metro-network-loading">
        Loading network graph...
      </div>
    );
  }

  return (
    <div className="metro-network-wrapper">
      <svg
        className="metro-network-svg"
        viewBox="0 0 1200 555"
        role="img"
        aria-label="Underground network map"
      >
        <rect
          x="0"
          y="0"
          width="1200"
          height="555"
          rx="22"
          fill="#0e141b"
        />

        {showEdges &&
          lines.map(line => {
            const points =
              buildLinePoints(line.stations);

            if (
              !points ||
              line.stations.length < 2
            ) {
              return null;
            }

            return (
              <polyline
                key={`metro-line-${line.id}`}
                points={points}
                fill="none"
                stroke={
                  LINE_COLORS[line.id] ||
                  '#adb5bd'
                }
                strokeWidth="15"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}

        {validStations.map(station => {
          const layout =
            STATION_LAYOUT[station.name];

          if (!layout) {
            return null;
          }

          const isInterchange =
            Number(station.is_interchange) === 1;

          const isStart =
            startStationId !== null &&
            startStationId !== undefined &&
            Number(station.id) ===
              Number(startStationId);

          const isTarget =
            targetStationId !== null &&
            targetStationId !== undefined &&
            Number(station.id) ===
              Number(targetStationId);

          let labelColor = '#ffffff';

          if (!showEdges && isStart) {
            labelColor = '#22c55e';
          }

          if (!showEdges && isTarget) {
            labelColor = '#ef4444';
          }

          return (
            <g key={`station-${station.id}`}>
              {!showEdges && isStart && (
                <circle
                  cx={layout.x}
                  cy={layout.y}
                  r="30"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="5"
                />
              )}

              {!showEdges && isTarget && (
                <circle
                  cx={layout.x}
                  cy={layout.y}
                  r="30"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="5"
                />
              )}

              {isInterchange ? (
                <>
                  <circle
                    cx={layout.x}
                    cy={layout.y}
                    r="22"
                    fill="#0e141b"
                    stroke="#ffffff"
                    strokeWidth="6"
                  />

                  <circle
                    cx={layout.x}
                    cy={layout.y}
                    r="10"
                    fill="#f8f9fa"
                    stroke="#495057"
                    strokeWidth="4"
                  />
                </>
              ) : (
                <circle
                  cx={layout.x}
                  cy={layout.y}
                  r="9"
                  fill="#f8f9fa"
                  stroke="#495057"
                  strokeWidth="4"
                />
              )}

              <text
                x={layout.labelX}
                y={layout.labelY}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={labelColor}
                fontSize="18"
                fontWeight="700"
                fontFamily="Arial, sans-serif"
                paintOrder="stroke"
                stroke="#0e141b"
                strokeWidth="6"
                strokeLinejoin="round"
                pointerEvents="none"
              >
                {station.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}