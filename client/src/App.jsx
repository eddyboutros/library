import { Routes, Route, Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Books from './pages/Books';
import BookDetail from './pages/BookDetail';
import Transactions from './pages/Transactions';
import UsersPage from './pages/Users';
import AIAssistant from './pages/AIAssistant';
import ContentSearch from './pages/ContentSearch';
import BookTransition from './components/BookTransition';
import './components/BookTransition.css';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-600" />
      </div>
    );
  }
  return user ? children : <Navigate to="/login" replace />;
}

function AuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithToken, loadUser, user } = useAuth();
  const [transitioning, setTransitioning] = useState(false);

  const handleTransitionComplete = useCallback(() => {
    setTransitioning(false);
    navigate('/', { replace: true });
  }, [navigate]);

  useEffect(() => {
    const token = params.get('token');
    if (token) {
      localStorage.setItem('token', token);
      loadUser().then(() => setTransitioning(true));
    } else {
      navigate('/login', { replace: true });
    }
  }, [params, loginWithToken, loadUser, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950">
      {!transitioning && (
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-600" />
      )}
      {transitioning && (
        <BookTransition onComplete={handleTransitionComplete} userName={user?.name?.split(' ')[0] || ''} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="books" element={<Books />} />
        <Route path="books/:id" element={<BookDetail />} />
        <Route path="content-search" element={<ContentSearch />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="ai-assistant" element={<AIAssistant />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
