import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Web3Provider } from './context/Web3Context';
import PrivateRoute from './components/PrivateRoute';
import ToastProvider from './components/ToastProvider';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import TaskList from './pages/TaskList';
import AnnotateTask from './pages/AnnotateTask';
import Earnings from './pages/Earnings';
import AdminPanel from './pages/AdminPanel';
import ProviderPanel from './pages/ProviderPanel';

import ResetPassword from './pages/ResetPassword';

export default function App() {
  return (
    <AuthProvider>
      <Web3Provider>
        <BrowserRouter>
          <ToastProvider />
        <Routes>
          <Route path="/login"          element={<Login />} />
          <Route path="/register"       element={<Register />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/*" element={
            <PrivateRoute>
              <Routes>
                <Route path="/dashboard"    element={<Dashboard />} />
                <Route path="/tasks"        element={<PrivateRoute doctorOnly><TaskList /></PrivateRoute>} />
                <Route path="/annotate/:id" element={<PrivateRoute doctorOnly><AnnotateTask /></PrivateRoute>} />
                <Route path="/earnings"     element={<Earnings />} />
                <Route path="/provider"     element={<PrivateRoute providerOnly><ProviderPanel /></PrivateRoute>} />
                <Route path="/admin"        element={<PrivateRoute adminOnly><AdminPanel /></PrivateRoute>} />
                <Route path="*"             element={<Navigate to="/dashboard" />} />
              </Routes>
            </PrivateRoute>
          } />
        </Routes>
        </BrowserRouter>
      </Web3Provider>
    </AuthProvider>
  );
}
