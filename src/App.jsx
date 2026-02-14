import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Stats from './pages/Stats';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={<Dashboard />}
          />
          <Route
            path="/stats"
            element={<Stats />}
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
