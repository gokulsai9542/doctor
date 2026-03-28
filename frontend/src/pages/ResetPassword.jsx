import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, Stethoscope, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';

export default function ResetPassword() {
  const [searchParams]          = useSearchParams();
  const [token, setToken]       = useState(searchParams.get('token') || '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) return toast.error('Passwords do not match.');
    if (password.length < 6)  return toast.error('Password must be at least 6 characters.');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setDone(true);
      toast.success('Password reset successful!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed. Token may be expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 opacity-5"
        style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg mb-4">
            <Stethoscope size={32} className="text-white" />
          </div>
          <h1 className="text-white text-2xl font-bold">MedAnnotate</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {done ? (
            <div className="text-center space-y-4">
              <CheckCircle size={48} className="text-green-500 mx-auto" />
              <h2 className="text-slate-800 text-xl font-semibold">Password Reset!</h2>
              <p className="text-slate-500 text-sm">Your password has been updated successfully.</p>
              <button onClick={() => navigate('/login')} className="btn-primary w-full py-2.5">
                Back to Sign In
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-slate-800 text-xl font-semibold mb-1">Set New Password</h2>
              <p className="text-slate-400 text-sm mb-6">Enter your reset token and choose a new password.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Reset Token</label>
                  <input type="text" placeholder="Paste your reset token"
                    value={token} onChange={e => setToken(e.target.value)}
                    required className="input w-full font-mono text-xs" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">New Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type={showPass ? 'text' : 'password'} placeholder="Min. 6 characters"
                      value={password} onChange={e => setPassword(e.target.value)}
                      required className="input pl-10 pr-10 w-full" />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type={showPass ? 'text' : 'password'} placeholder="Repeat password"
                      value={confirm} onChange={e => setConfirm(e.target.value)}
                      required className="input pl-10 w-full" />
                  </div>
                </div>

                <button type="submit" disabled={loading}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-2.5">
                  {loading ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full spinner" /> Resetting...</>
                  ) : 'Reset Password'}
                </button>
              </form>

              <p className="text-center text-sm text-slate-500 mt-6">
                <Link to="/login" className="text-blue-600 font-medium hover:underline">Back to Sign In</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
