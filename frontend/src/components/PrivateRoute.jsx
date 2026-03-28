import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PrivateRoute({ children, adminOnly = false, providerOnly = false, doctorOnly = false }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (adminOnly  && user.role !== 'admin')  return <Navigate to="/dashboard" />;
  if (providerOnly && !['provider', 'admin'].includes(user.role)) return <Navigate to="/dashboard" />;
  if (doctorOnly && user.role !== 'doctor') return <Navigate to="/dashboard" />;
  return children;
}
