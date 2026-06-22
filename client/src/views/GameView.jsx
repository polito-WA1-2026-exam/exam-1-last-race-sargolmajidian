import {
  useCallback,
  useContext,
  useEffect,
  useState
} from 'react';

import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Container,
  Row
} from 'react-bootstrap';

import MetroMap from '../components/MetroMap';
import { AuthContext } from '../context/AuthContext';

/**
 * Creates the same key for both directions of a physical segment.
 *
 * 1-2 and 2-1 both become "1-2".
 */
function getSegmentKey(stationA, stationB) {
  const firstId = Number(stationA);
  const secondId = Number(stationB);

  return firstId < secondId
    ? `${firstId}-${secondId}`
    : `${secondId}-${firstId}`;
}

export default function GameView() {
  const { user } = useContext(AuthContext);

  const [phase, setPhase] = useState('SETUP');

  const [network, setNetwork] = useState([]);
  const [stations, setStations] = useState([]);
  const [availableSegments, setAvailableSegments] = useState([]);

  const [selectedSegments, setSelectedSegments] = useState([]);
  const [usedSegmentKeys, setUsedSegmentKeys] = useState([]);

  const [startStation, setStartStation] = useState(null);
  const [targetStation, setTargetStation] = useState(null);

  const [timeLeft, setTimeLeft] = useState(90);

  const [executionSteps, setExecutionSteps] = useState([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlayingAuto, setIsPlayingAuto] = useState(false);

  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadGameData = async () => {
      try {
        const [
          networkResponse,
          stationsResponse
        ] = await Promise.all([
          fetch('/api/network', {
            credentials: 'include'
          }),
          fetch('/api/stations', {
            credentials: 'include'
          })
        ]);

        if (!networkResponse.ok) {
          throw new Error('Failed to load network.');
        }

        if (!stationsResponse.ok) {
          throw new Error('Failed to load stations.');
        }

        const [
          networkData,
          stationsData
        ] = await Promise.all([
          networkResponse.json(),
          stationsResponse.json()
        ]);

        setNetwork(
          Array.isArray(networkData)
            ? networkData
            : []
        );

        setStations(
          Array.isArray(stationsData)
            ? stationsData
            : []
        );
      } catch (loadError) {
        console.error(
          'Failed to load game data:',
          loadError
        );

        setError(
          'Failed to load the underground network.'
        );
      }
    };

    loadGameData();
  }, []);

  const submitRoute = useCallback(async () => {
    if (phase !== 'PLANNING') {
      return;
    }

    setPhase('EXECUTION');
    setCurrentStepIndex(0);
    setIsPlayingAuto(false);
    setExecutionSteps([]);
    setResult(null);
    setError('');

    try {
      const response = await fetch(
        '/api/games/execute',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            segments: selectedSegments.map(
              segment => ({
                from_id: Number(segment.from_id),
                to_id: Number(segment.to_id)
              })
            )
          })
        }
      );

      if (!response.ok) {
        const responseBody = await response
          .json()
          .catch(() => ({}));

        throw new Error(
          responseBody.error ||
          'Failed to submit route.'
        );
      }

      const data = await response.json();

      const steps = Array.isArray(data.steps)
        ? data.steps
        : [];

      const normalizedResult = {
        valid: Boolean(data.valid),
        score: Math.max(
          0,
          Number(data.score) || 0
        ),
        steps
      };

      setResult(normalizedResult);
      setExecutionSteps(steps);

      if (
        normalizedResult.valid &&
        steps.length > 0
      ) {
        setIsPlayingAuto(true);
      } else {
        setPhase('RESULT');
      }
    } catch (submitError) {
      console.error(
        'Failed to submit route:',
        submitError
      );

      setError(
        submitError.message ||
        'Failed to submit the route.'
      );

      setResult({
        valid: false,
        score: 0,
        steps: []
      });

      setExecutionSteps([]);
      setPhase('RESULT');
    }
  }, [
    phase,
    selectedSegments
  ]);

  /**
   * Planning countdown.
   */
  useEffect(() => {
    if (phase !== 'PLANNING') {
      return undefined;
    }

    const timer = setTimeout(() => {
      if (timeLeft <= 1) {
        submitRoute();
        return;
      }

      setTimeLeft(previousTime =>
        Math.max(0, previousTime - 1)
      );
    }, 1000);

    return () => clearTimeout(timer);
  }, [
    phase,
    timeLeft,
    submitRoute
  ]);

  /**
   * Display valid route steps one at a time.
   */
  useEffect(() => {
    if (
      phase !== 'EXECUTION' ||
      !isPlayingAuto ||
      executionSteps.length === 0
    ) {
      return undefined;
    }

    const timer = setTimeout(() => {
      const nextStepIndex =
        currentStepIndex + 1;

      if (
        nextStepIndex >=
        executionSteps.length
      ) {
        setCurrentStepIndex(
          executionSteps.length
        );

        setIsPlayingAuto(false);
        setPhase('RESULT');
        return;
      }

      setCurrentStepIndex(nextStepIndex);
    }, 1500);

    return () => clearTimeout(timer);
  }, [
    phase,
    isPlayingAuto,
    currentStepIndex,
    executionSteps.length
  ]);

  const startPlanning = async () => {
    setError('');

    try {
      const [
        segmentsResponse,
        setupResponse
      ] = await Promise.all([
        fetch('/api/segments', {
          credentials: 'include'
        }),
        fetch('/api/game/setup', {
          credentials: 'include'
        })
      ]);

      if (!segmentsResponse.ok) {
        throw new Error(
          'Failed to load network segments.'
        );
      }

      if (!setupResponse.ok) {
        const responseBody = await setupResponse
          .json()
          .catch(() => ({}));

        throw new Error(
          responseBody.error ||
          'Failed to start a new game.'
        );
      }

      const [
        segmentsData,
        setupData
      ] = await Promise.all([
        segmentsResponse.json(),
        setupResponse.json()
      ]);

      if (
        !setupData.startStation ||
        !setupData.targetStation
      ) {
        throw new Error(
          'The server returned an invalid game setup.'
        );
      }

      setAvailableSegments(
        Array.isArray(segmentsData)
          ? segmentsData
          : []
      );

      setStartStation(setupData.startStation);
      setTargetStation(setupData.targetStation);

      setSelectedSegments([]);
      setUsedSegmentKeys([]);

      setTimeLeft(90);

      setExecutionSteps([]);
      setCurrentStepIndex(0);
      setIsPlayingAuto(false);

      setResult(null);
      setPhase('PLANNING');
    } catch (setupError) {
      console.error(
        'Failed to start game:',
        setupError
      );

      setError(
        setupError.message ||
        'Error setting up a new game.'
      );
    }
  };

  const selectSegment = segment => {
    if (phase !== 'PLANNING') {
      return;
    }

    const fromId = Number(segment.from_id);
    const toId = Number(segment.to_id);

    if (
      !Number.isInteger(fromId) ||
      !Number.isInteger(toId) ||
      fromId === toId
    ) {
      return;
    }

    const segmentKey = getSegmentKey(
      fromId,
      toId
    );

    if (usedSegmentKeys.includes(segmentKey)) {
      return;
    }

    setSelectedSegments(previousSegments => [
      ...previousSegments,
      {
        from_id: fromId,
        to_id: toId,
        from_station:
          segment.from_station ||
          `Station ${fromId}`,
        to_station:
          segment.to_station ||
          `Station ${toId}`
      }
    ]);

    setUsedSegmentKeys(previousKeys => [
      ...previousKeys,
      segmentKey
    ]);
  };

  const playAgain = () => {
    setPhase('SETUP');

    setAvailableSegments([]);
    setSelectedSegments([]);
    setUsedSegmentKeys([]);

    setStartStation(null);
    setTargetStation(null);

    setTimeLeft(90);

    setExecutionSteps([]);
    setCurrentStepIndex(0);
    setIsPlayingAuto(false);

    setResult(null);
    setError('');
  };

  const displayedCoins =
    executionSteps.length > 0
      ? executionSteps[
          Math.min(
            currentStepIndex,
            executionSteps.length - 1
          )
        ]?.coins ?? 20
      : 20;

  if (!user) {
    return (
      <Container className="mt-4">
        <Alert variant="danger">
          Access denied. Please log in first.
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="mt-4 mb-5">
      {error && (
        <Alert
          variant="danger"
          dismissible
          onClose={() => setError('')}
        >
          {error}
        </Alert>
      )}

      {phase === 'SETUP' && (
        <Card
          bg="dark"
          text="light"
          className="p-4 border-secondary shadow"
        >
          <Card.Body>
            <h2 className="text-warning mb-3">
              Phase 1: Network Setup
            </h2>

            <p className="text-white-50 mb-4">
              Study the complete underground network before
              starting. All stations, lines and connections
              are visible.
            </p>

            <MetroMap
              network={network}
              stations={stations}
              showEdges={true}
            />

            <Button
              variant="warning"
              size="lg"
              className="fw-bold mt-4"
              onClick={startPlanning}
              disabled={
                network.length === 0 ||
                stations.length === 0
              }
            >
              Ready to Play!
            </Button>
          </Card.Body>
        </Card>
      )}

      {phase === 'PLANNING' && (
        <>
          <Card
            bg="dark"
            text="light"
            className="mb-4 border-secondary shadow"
          >
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                <div>
                  <h3 className="text-warning mb-1">
                    Phase 2: Route Planning
                  </h3>

                  <p className="text-white-50 mb-0">
                    Reconstruct the network using the segment
                    list. The connecting lines are hidden.
                  </p>
                </div>

                <Badge
                  bg={
                    timeLeft < 20
                      ? 'danger'
                      : 'warning'
                  }
                  text={
                    timeLeft < 20
                      ? undefined
                      : 'dark'
                  }
                  className="p-2 fs-6 flex-shrink-0"
                >
                  ⏱️ {timeLeft}s
                </Badge>
              </div>

              <Alert
                variant="info"
                className="d-flex justify-content-around align-items-center bg-dark text-light border-secondary"
              >
                <div>
                  From:{' '}
                  <strong className="text-success">
                    {startStation?.name}
                  </strong>
                </div>

                <div>
                  To:{' '}
                  <strong className="text-danger">
                    {targetStation?.name}
                  </strong>
                </div>
              </Alert>

              <MetroMap
                network={network}
                stations={stations}
                showEdges={false}
                startStationId={startStation?.id}
                targetStationId={targetStation?.id}
              />
            </Card.Body>
          </Card>

          <Row>
            <Col lg={8}>
              <Card
                bg="dark"
                text="light"
                className="mb-4 border-secondary shadow"
              >
                <Card.Body>
                  <h5 className="text-warning mb-2">
                    All Segments
                  </h5>

                  <p className="text-white-50 small">
                    Select the segments in the order of your
                    planned route. Each physical segment may
                    be selected only once.
                  </p>

                  <Row
                    className="g-2 px-1"
                    style={{
                      maxHeight: '390px',
                      overflowY: 'auto'
                    }}
                  >
                    {availableSegments.map(segment => {
                      const segmentKey =
                        getSegmentKey(
                          segment.from_id,
                          segment.to_id
                        );

                      const alreadyUsed =
                        usedSegmentKeys.includes(
                          segmentKey
                        );

                      return (
                        <Col
                          sm={6}
                          key={segmentKey}
                        >
                          <Button
                            variant={
                              alreadyUsed
                                ? 'secondary'
                                : 'outline-warning'
                            }
                            size="sm"
                            className="w-100 text-truncate"
                            disabled={alreadyUsed}
                            onClick={() =>
                              selectSegment(segment)
                            }
                          >
                            {segment.from_station}
                            {' — '}
                            {segment.to_station}
                            {alreadyUsed && ' ✓'}
                          </Button>
                        </Col>
                      );
                    })}
                  </Row>
                </Card.Body>
              </Card>
            </Col>

            <Col lg={4}>
              <Card
                bg="dark"
                text="light"
                className="border-secondary shadow"
              >
                <Card.Body>
                  <h5 className="text-warning mb-3">
                    Selected Segments
                  </h5>

                  <div className="route-stations-box">
                    {selectedSegments.length === 0 ? (
                      <div className="text-white-50 small">
                        No segment selected yet.
                      </div>
                    ) : (
                      selectedSegments.map(
                        (segment, index) => (
                          <div
                            key={
                              `${getSegmentKey(
                                segment.from_id,
                                segment.to_id
                              )}-${index}`
                            }
                            className="route-station-item"
                          >
                            <Badge
                              bg="secondary"
                              className="route-station-number"
                            >
                              {index + 1}
                            </Badge>

                            <span className="route-station-name">
                              {segment.from_station}
                              {' — '}
                              {segment.to_station}
                            </span>

                            {index <
                              selectedSegments.length -
                                1 && (
                              <span className="route-arrow">
                                ↓
                              </span>
                            )}
                          </div>
                        )
                      )
                    )}
                  </div>

                  <Button
                    variant="success"
                    className="w-100 mt-4 fw-bold py-2 shadow"
                    onClick={submitRoute}
                    disabled={
                      selectedSegments.length === 0
                    }
                  >
                    Submit Route
                  </Button>

                  <div className="small text-white-50 mt-3">
                    The route is validated only after
                    submission. Selected segments cannot be
                    removed.
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}

      {phase === 'EXECUTION' && (
        <Card
          bg="dark"
          text="light"
          className="p-4 border-secondary shadow text-center mx-auto"
          style={{
            maxWidth: '700px'
          }}
        >
          <Card.Body>
            <h3 className="text-warning mb-4">
              Phase 3: Executing Journey
            </h3>

            {!result ? (
              <p className="text-white-50">
                Validating route...
              </p>
            ) : (
              <>
                <div className="display-4 fw-bold text-warning mb-4">
                  💰 {displayedCoins} Coins
                </div>

                <div
                  className="mb-4 text-start"
                  style={{
                    maxHeight: '300px',
                    overflowY: 'auto'
                  }}
                >
                  {executionSteps.map(
                    (step, index) => {
                      const isPassed =
                        index < currentStepIndex;

                      const isCurrent =
                        index === currentStepIndex;

                      return (
                        <div
                          key={
                            `${step.from}-` +
                            `${step.to}-${index}`
                          }
                          className={
                            `p-3 mb-2 rounded border border-secondary ` +
                            (
                              isCurrent
                                ? 'bg-warning bg-opacity-10'
                                : isPassed
                                  ? 'bg-black bg-opacity-40 text-muted'
                                  : 'bg-dark'
                            )
                          }
                        >
                          <div className="d-flex justify-content-between align-items-center fw-bold">
                            <span>
                              Step {index + 1}:{' '}
                              {step.from} ➔ {step.to}
                            </span>

                            {isPassed && (
                              <Badge bg="success">
                                Done
                              </Badge>
                            )}

                            {isCurrent && (
                              <Badge
                                bg="warning"
                                text="dark"
                              >
                                Processing...
                              </Badge>
                            )}
                          </div>

                          {(isCurrent || isPassed) && (
                            <div className="small text-white-50 mt-2 fst-italic">
                              {step.event} (
                              {step.effect >= 0
                                ? '+'
                                : ''}
                              {step.effect} coins)
                            </div>
                          )}
                        </div>
                      );
                    }
                  )}
                </div>

                {currentStepIndex <
                  executionSteps.length && (
                  <div className="text-muted small border-top border-secondary pt-3">
                    Processing your journey...
                  </div>
                )}
              </>
            )}
          </Card.Body>
        </Card>
      )}

      {phase === 'RESULT' && result && (
        <Card
          bg="dark"
          text="light"
          className="p-5 border-secondary shadow text-center mx-auto"
          style={{
            maxWidth: '520px'
          }}
        >
          <Card.Body>
            <h2 className="text-warning mb-3">
              {result.valid
                ? 'Journey Complete'
                : 'Route Failed'}
            </h2>

            {!result.valid && (
              <Alert
                variant="danger"
                className="mb-3"
              >
                Your route was invalid or incomplete.
                Your score is zero.
              </Alert>
            )}

            {result.valid && (
              <Alert
                variant="success"
                className="mb-3"
              >
                Destination reached successfully.
              </Alert>
            )}

            <div className="p-4 bg-black rounded border border-secondary mb-4">
              <div className="small text-muted mb-1">
                FINAL SCORE
              </div>

              <div className="display-3 fw-bold text-success">
                {Math.max(
                  0,
                  Number(result.score) || 0
                )}{' '}
                Coins
              </div>
            </div>

            <Button
              variant="warning"
              size="lg"
              className="w-100 fw-bold"
              onClick={playAgain}
            >
              Play Again
            </Button>
          </Card.Body>
        </Card>
      )}
    </Container>
  );
}
