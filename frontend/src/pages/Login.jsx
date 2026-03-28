import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Stethoscope, AlertCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [form, setForm]         = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const { login } = useAuth();
  const navigate  = useNavigate();

  useEffect(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      login(data.token, data.user);
      toast.success(`Welcome back, ${data.user.name}!`);
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid credentials';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email: forgotEmail });
      setResetToken(data.resetToken);
      toast.success('Reset token generated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate reset link.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 opacity-5"
        style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg mb-4">
            <Stethoscope size={32} className="text-white" />
          </div>
          <h1 className="text-white text-2xl font-bold">MedAnnotate</h1>
          <p className="text-slate-400 text-sm mt-1">Medical Image Annotation Platform</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-slate-800 text-xl font-semibold mb-1">Sign in</h2>
          <p className="text-slate-400 text-sm mb-6">Enter your credentials to continue</p>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-5">
              <AlertCircle size={16} className="flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="email" placeholder="doctor@hospital.com"
                  value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  required className="input pl-10" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-slate-700">Password</label>
                <button type="button" onClick={() => { setShowForgot(true); setResetToken(''); setForgotEmail(''); }}
                  className="text-xs text-blue-600 hover:underline">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type={showPass ? 'text' : 'password'} placeholder="••••••••"
                  value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                  required className="input pl-10 pr-10" />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 mt-2">
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full spinner" /> Signing in...</>
              ) : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-600 font-medium hover:underline">Create account</Link>
          </p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm relative">
            <button onClick={() => setShowForgot(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>

            <h3 className="text-slate-800 text-lg font-semibold mb-1">Reset Password</h3>
            <p className="text-slate-400 text-sm mb-5">Enter your email to get a reset token.</p>

            {!resetToken ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="email" placeholder="your@email.com" required
                    value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                    className="input pl-10 w-full" />
                </div>
                <button type="submit" disabled={forgotLoading}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-2.5">
                  {forgotLoading ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full spinner" /> Sending...</>
                  ) : 'Send Reset Link'}
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
                  Reset token generated! Copy it and use it to reset your password.
                </div>
                <div className="bg-slate-100 rounded-lg p-3 text-xs font-mono break-all text-slate-700 select-all">
                  {resetToken}
                </div>
                <button onClick={() => { setShowForgot(false); navigate(`/reset-password?token=${resetToken}`); }}
                  className="btn-primary w-full py-2.5">
                  Go to Reset Password
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
