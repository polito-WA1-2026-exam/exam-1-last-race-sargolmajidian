import { useEffect, useState } from 'react';

import {
  Alert,
  Card,
  Container,
  Spinner,
  Table
} from 'react-bootstrap';

export default function RankingView() {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadRanking = async () => {
      try {
        const response = await fetch('/api/ranking', {
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error(
            'Failed to fetch ranking data.'
          );
        }

        const data = await response.json();

        setRankings(
          Array.isArray(data)
            ? data
            : []
        );
      } catch (loadError) {
        console.error(
          'Ranking loading failed:',
          loadError
        );

        setError(
          loadError.message ||
          'Failed to load ranking.'
        );
      } finally {
        setLoading(false);
      }
    };

    loadRanking();
  }, []);

  return (
    <Container
      className="py-4"
      style={{ maxWidth: '700px' }}
    >
      <Card
        bg="dark"
        text="light"
        className="border-secondary shadow-lg"
      >
        <Card.Body className="p-4">
          <h2 className="text-warning text-center fw-bold mb-4">
            🏆 Global Leaderboard
          </h2>

          {loading ? (
            <div className="text-center py-4">
              <Spinner
                animation="border"
                variant="warning"
              />
            </div>
          ) : error ? (
            <Alert variant="danger">
              {error}
            </Alert>
          ) : (
            <Table
              variant="dark"
              striped
              bordered
              hover
              responsive
              className="border-secondary text-center"
            >
              <thead>
                <tr className="text-warning">
                  <th>Rank</th>
                  <th>Player Name</th>
                  <th>High Score (Coins)</th>
                </tr>
              </thead>

              <tbody>
                {rankings.length > 0 ? (
                  rankings.map((ranking, index) => (
                    <tr
                      key={
                        ranking.user_id ??
                        ranking.id ??
                        ranking.name
                      }
                    >
                      <td className="fw-bold">
                        {index + 1}
                      </td>

                      <td>
                        {ranking.name}
                      </td>

                      <td className="text-success fw-bold">
                        {ranking.max_score} 💰
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="3"
                      className="text-muted py-3"
                    >
                      No games played yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
}