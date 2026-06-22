export function buildUndirectedGraph(topology) {
  const graph = {};
  const lines = {};

  for (const item of topology) {
    if (!graph[item.station_name]) {
      graph[item.station_name] = [];
    }

    if (!lines[item.line_id]) {
      lines[item.line_id] = [];
    }

    lines[item.line_id].push({
      stationName: item.station_name,
      position: Number(item.position)
    });
  }


  for (const lineStations of Object.values(lines)) {
    lineStations.sort(
      (first, second) =>
        first.position - second.position
    );

    for (
      let index = 0;
      index < lineStations.length - 1;
      index++
    ) {
      const firstStation =
        lineStations[index].stationName;

      const secondStation =
        lineStations[index + 1].stationName;

      if (!graph[firstStation].includes(secondStation)) {
        graph[firstStation].push(secondStation);
      }

      if (!graph[secondStation].includes(firstStation)) {
        graph[secondStation].push(firstStation);
      }
    }
  }

  return graph;
}


export function findShortestPath(
  startName,
  destinationName,
  graph
) {
  if (
    typeof startName !== 'string' ||
    typeof destinationName !== 'string'
  ) {
    return -1;
  }

  if (startName === destinationName) {
    return 0;
  }

  if (
    !Object.hasOwn(graph, startName) ||
    !Object.hasOwn(graph, destinationName)
  ) {
    return -1;
  }



  const queue = [
    {
      stationName: startName,
      distance: 0
    }
  ];

  const visited = new Set([startName]);

  while (queue.length > 0) {
    const current = queue.shift();

    for (
      const neighbor of
      graph[current.stationName] || []
    ) {
      if (visited.has(neighbor)) {
        continue;
      }

      if (neighbor === destinationName) {
        return current.distance + 1;
      }

      visited.add(neighbor);

      queue.push({
        stationName: neighbor,
        distance: current.distance + 1
      });
    }
  }

  return -1;
}


export function buildBidirectionalLineMap(connections) {
  const lineMap = {};

  if (!Array.isArray(connections)) {
    return lineMap;
  }

  for (const connection of connections) {
    const stationA = Number(connection.a);
    const stationB = Number(connection.b);
    const lineId = Number(connection.line_id);

    if (
      !Number.isInteger(stationA) ||
      !Number.isInteger(stationB) ||
      !Number.isInteger(lineId)
    ) {
      continue;
    }

    const forwardKey = `${stationA}-${stationB}`;
    const reverseKey = `${stationB}-${stationA}`;

    if (!lineMap[forwardKey]) {
      lineMap[forwardKey] = [];
    }

    if (!lineMap[reverseKey]) {
      lineMap[reverseKey] = [];
    }

    if (!lineMap[forwardKey].includes(lineId)) {
      lineMap[forwardKey].push(lineId);
    }

    if (!lineMap[reverseKey].includes(lineId)) {
      lineMap[reverseKey].push(lineId);
    }
  }

  return lineMap;
}

function getPhysicalSegmentKey(stationA, stationB) {
  const firstStation = Number(stationA);
  const secondStation = Number(stationB);

  return firstStation < secondStation
    ? `${firstStation}-${secondStation}`
    : `${secondStation}-${firstStation}`;
}



export function getActiveLinesForPartialRoute(
  route,
  connections,
  interchangeSet
) {
  if (!Array.isArray(route) || route.length === 0) {
    return 'INVALID';
  }

  if (
    route.some(
      stationId =>
        !Number.isInteger(Number(stationId))
    )
  ) {
    return 'INVALID';
  }

  if (route.length === 1) {
    return null;
  }

  const normalizedRoute = route.map(Number);

  const normalizedInterchangeSet = new Set(
    [...interchangeSet].map(Number)
  );

  const lineMap =
    buildBidirectionalLineMap(connections);

  const usedSegments = new Set();

  let activeLines = null;

  for (
    let index = 0;
    index < normalizedRoute.length - 1;
    index++
  ) {
    const currentStation =
      normalizedRoute[index];

    const nextStation =
      normalizedRoute[index + 1];

    if (currentStation === nextStation) {
      return 'INVALID';
    }

    const physicalSegmentKey =
      getPhysicalSegmentKey(
        currentStation,
        nextStation
      );

    

    if (usedSegments.has(physicalSegmentKey)) {
      return 'INVALID';
    }

    usedSegments.add(physicalSegmentKey);

    const segmentLines =
      lineMap[
        `${currentStation}-${nextStation}`
      ] || [];

    /*
     * Every consecutive station pair must be a real network segment.
     */
    if (segmentLines.length === 0) {
      return 'INVALID';
    }

    /*
     * The first physical segment determines the initial active lines.
     */
    if (activeLines === null) {
      activeLines = new Set(segmentLines);
      continue;
    }

    
    if (
      normalizedInterchangeSet.has(currentStation)
    ) {
      activeLines = new Set(segmentLines);
      continue;
    }

    /*
     * At a non-interchange station, the selected segment must share
     * at least one line with the previous active lines.
     */
    const commonLines = segmentLines.filter(
      lineId => activeLines.has(lineId)
    );

    if (commonLines.length === 0) {
      return 'INVALID';
    }

    activeLines = new Set(commonLines);
  }

  return activeLines;
}


export function validateRoute(
  route,
  connections,
  interchangeSet
) {
  if (!Array.isArray(route) || route.length < 2) {
    return false;
  }

  if (
    !Array.isArray(connections) ||
    !(interchangeSet instanceof Set)
  ) {
    return false;
  }

  const activeLines =
    getActiveLinesForPartialRoute(
      route,
      connections,
      interchangeSet
    );

  return activeLines !== 'INVALID';
}