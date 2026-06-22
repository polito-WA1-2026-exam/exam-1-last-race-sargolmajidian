import { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';
import AuthProvider from './context/AuthProvider';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import HomeView from './views/HomeView';
import LoginView from './views/LoginView';
import RankingView from './views/RankingView';
import GameView from './views/GameView';

function NavigationBar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:3001/api/sessions/current', {
        method: 'DELETE',
        credentials: 'include'
      });
    } catch (err) {
      console.error("Logout fetch error:", err);
    }
    logout();
    navigate('/'); 
  };

  return (
    <Navbar bg="dark" variant="dark" expand="lg" className="border-bottom border-secondary mb-4 shadow">
      <Container>
        <Navbar.Brand as={Link} to="/" className="fw-bold text-warning">
          🚇 Last Race
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/">Home</Nav.Link>
            {/* FIXED: Only show Leaderboard link to registered users to respect specs strict privacy */}
            {user && <Nav.Link as={Link} to="/ranking">Leaderboard</Nav.Link>}
          </Nav>
          <Nav className="ms-auto align-items-center">
            {user ? (
              <>
                <Navbar.Text className="me-3 text-light">
                  Hello, <span className="text-warning fw-semibold">{user.name}</span>
                </Navbar.Text>
                <Button variant="outline-danger" size="sm" onClick={handleLogout}>
                  Logout
                </Button>
              </>
            ) : (
              <Button as={Link} to="/login" variant="warning" size="sm" className="fw-bold">
                Login
              </Button>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

// FIXED: Protected Component Route Guard to block anonymous URL tampering fully
function ProtectedRoute({ children }) {
  const { user } = useContext(AuthContext);
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function AppContent() {
  const { loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100 bg-dark text-warning">
        <div className="spinner-border" role="status"></div>
        <span className="ms-2">Loading system...</span>
      </div>
    );
  }

  return (
    <Router>
      <NavigationBar />
      <Container className="flex-grow-1 pb-5">
        <Routes>
          <Route path="/" element={<HomeView />} />
          <Route path="/login" element={<LoginView />} />
          
          {/* FIXED: Protected Routes strictly guarding system integrity against manual URL input */}
          <Route path="/ranking" element={
            <ProtectedRoute>
              <RankingView />
            </ProtectedRoute>
          } />
          <Route path="/game" element={
            <ProtectedRoute>
              <GameView />
            </ProtectedRoute>
          } />

          {/* Fallback redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Container>
    </Router>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}