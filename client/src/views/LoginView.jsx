import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, Form, Button, Alert, Container } from 'react-bootstrap';

export default function LoginView() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('http://localhost:3001/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include'
      });
      if (res.ok) {
        const userData = await res.json();
        login(userData);
        navigate('/');
      } else {
        setError('Invalid username or password.');
      }
    } catch {
  setError(
    'Connection failure. Please verify server status.'
  );
}
  };

  return (
    <Container className="d-flex justify-content-center align-items-center mt-5">
      <Card bg="dark" text="light" className="border-secondary p-4 shadow" style={{ width: '100%', maxWidth: '420px' }}>
        <Card.Body>
          <h3 className="text-center text-warning fw-bold mb-4">Account Login</h3>
          
          {error && <Alert variant="danger" className="py-2 small">{error}</Alert>}
          
          <Form onSubmit={handleSubmit}>
            {/* Field 1: Username */}
            <Form.Group className="mb-3" controlId="formUsername">
              <Form.Label className="small text-secondary">Username</Form.Label>
              <Form.Control 
                type="text" 
                placeholder="e.g., john.doe@polito.it" 
                value={username} 
                onChange={e => setUsername(e.target.value)} 
                required 
                className="bg-dark text-light border-secondary"
              />
            </Form.Group>

            {/* Field 2: Password */}
            <Form.Group className="mb-4" controlId="formPassword">
              <Form.Label className="small text-secondary">Password</Form.Label>
              <Form.Control 
                type="password" 
                placeholder="Enter password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
                className="bg-dark text-light border-secondary"
              />
            </Form.Group>

            <Button variant="warning" type="submit" className="w-100 fw-bold shadow">
              Sign In
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}