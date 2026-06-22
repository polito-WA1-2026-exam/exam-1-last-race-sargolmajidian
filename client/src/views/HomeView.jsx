import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Card, Button, Container } from 'react-bootstrap';

export default function HomeView() {
  const { user } = useContext(AuthContext);

  return (
    <Container className="py-4" style={{ maxWidth: '800px' }}>
      <div className="text-center mb-5">
        <h1 className="display-4 fw-bold text-warning mb-3">Welcome to "Last Race"</h1>
        <p className="lead text-secondary">
          Navigate the underground network, plan logic-driven routes under time pressure, and manage your coins!
        </p>
      </div>
      
      <Card bg="dark" text="light" className="border-secondary mb-4 shadow-lg">
        <Card.Body className="p-4">
          <Card.Title className="text-warning border-bottom border-secondary pb-2 mb-3 fw-bold">
            📋 Game Regulations
          </Card.Title>
          <ul className="lh-lg" style={{ paddingLeft: '20px' }}>
            <li>Every simulation starts with an initial capital of <strong>20 coins</strong>.</li>
            <li>Registered operators can view the fully connected topography and start matches.</li>
            <li>During the planning loop, you have <strong>90 seconds</strong> to assemble a valid linear route.</li>
            <li>Random ambient network events will apply modifiers ranging from <strong>-4 to +4 coins</strong>.</li>
          </ul>
        </Card.Body>
      </Card>

      <div className="text-center mt-4">
        {user ? (
          <Button as={Link} to="/game" variant="warning" size="lg" className="px-5 fw-bold shadow">
            Launch Simulation
          </Button>
        ) : (
          <div className="p-3 bg-secondary bg-opacity-10 border border-secondary rounded">
            <p className="mb-0 text-muted">
              Authorization required. Please <Link to="/login" className="text-warning fw-semibold text-decoration-none">Login</Link> to initialize the network terminal.
            </p>
          </div>
        )}
      </div>
    </Container>
  );
}