import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookMarked, LogIn, UserPlus, Eye, EyeOff, Shield, BookOpen, Users, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { login, register, demoLogin, getSSOStatus } from '../services/api';
import DarkVeil from '../components/DarkVeil';
import BookTransition from '../components/BookTransition';
import '../components/BookTransition.css';

export default function Login() {
  const { user, loginWithToken } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ssoStatus, setSsoStatus] = useState({ google: false });
  const [transitioning, setTransitioning] = useState(false);
  const [transitionName, setTransitionName] = useState('');

  useEffect(() => {
    if (user && !transitioning) navigate('/', { replace: true });
  }, [user, navigate, transitioning]);

  useEffect(() => {
    getSSOStatus().then(({ data }) => setSsoStatus(data)).catch(() => {});
  }, []);

  const startTransition = (userData) => {
    setTransitionName(userData.name?.split(' ')[0] || '');
    setTransitioning(true);
  };

  const handleTransitionComplete = useCallback(() => {
    setTransitioning(false);
    navigate('/', { replace: true });
  }, [navigate]);

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = mode === 'login'
        ? await login(form.email, form.password)
        : await register(form.name, form.email, form.password);
      loginWithToken(data.token, data.user);
      toast.success(`Welcome, ${data.user.name}!`);
      startTransition(data.user);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async role => {
    setLoading(true);
    try {
      const { data } = await demoLogin(role);
      loginWithToken(data.token, data.user);
      toast.success(`Logged in as ${data.user.name} (${role})`);
      startTransition(data.user);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex relative">
      {/* Full-screen animated background */}
      <div className="fixed inset-0 z-0" style={{ width: '100%', height: '100%' }}>
        <DarkVeil hueShift={220} noiseIntensity={0.02} scanlineIntensity={0} speed={0.25} scanlineFrequency={0} warpAmount={0.3} />
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Left: Hero */}
      <div className={`hidden lg:flex lg:w-1/2 p-12 flex-col justify-between relative z-10 transition-opacity duration-500 ${transitioning ? 'opacity-0' : ''}`}>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/15 backdrop-blur-md border border-white/20">
              <BookMarked className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">Athena Library</h1>
          </div>
          <p className="text-white/70 text-lg mt-1">Smart Library Management System</p>
        </div>

        <div className="relative z-10 space-y-8">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold">Smart Catalog</h3>
              <p className="text-white/60 text-sm">Manage your entire book collection with AI-powered categorization</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold">Role-Based Access</h3>
              <p className="text-white/60 text-sm">Admin, Librarian, and Member roles with tailored permissions</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold">AI Assistant</h3>
              <p className="text-white/60 text-sm">Get personalized recommendations and natural language search</p>
            </div>
          </div>
        </div>

        <p className="relative z-10 text-white/40 text-sm">Powered by Excel-based storage • SSO Ready • AI Enhanced</p>
      </div>

      {/* Right: Form */}
      <div className={`flex-1 flex items-center justify-center p-6 sm:p-12 relative z-10 transition-opacity duration-500 ${transitioning ? 'opacity-0' : ''}`}>
        <div className="w-full max-w-md rounded-2xl p-8 shadow-2xl border border-white/20" style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(24px) saturate(1.5)', WebkitBackdropFilter: 'blur(24px) saturate(1.5)' }}>
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/15 border border-white/20">
              <BookMarked className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Athena Library</h1>
          </div>

          <h2 className="text-2xl font-bold text-white mb-1">
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="text-white/60 mb-8">
            {mode === 'login' ? 'Sign in to your library account' : 'Register for a new account'}
          </p>

          {/* Demo Accounts */}
          <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
            <p className="text-sm font-medium text-white/80 mb-3">Quick Demo Access</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { role: 'admin', label: 'Admin', color: 'bg-red-500' },
                { role: 'librarian', label: 'Librarian', color: 'bg-blue-500' },
                { role: 'member', label: 'Member', color: 'bg-green-500' },
              ].map(d => (
                <button
                  key={d.role}
                  onClick={() => handleDemo(d.role)}
                  disabled={loading}
                  className="flex flex-col items-center gap-1 px-3 py-2.5 rounded-lg bg-white/8 border border-white/10 hover:bg-white/15 hover:shadow-sm transition-all text-center"
                >
                  <div className={`w-2 h-2 rounded-full ${d.color}`} />
                  <span className="text-xs font-medium text-white/80">{d.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* SSO */}
          {ssoStatus.google && (
            <div className="mb-6">
              <a
                href="/api/auth/google"
                className="flex items-center justify-center gap-3 w-full px-4 py-2.5 bg-white/10 border border-white/15 rounded-lg hover:bg-white/20 transition-colors text-sm font-medium text-white/90"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Continue with Google
              </a>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/15" /></div>
                <div className="relative flex justify-center text-xs"><span className="px-2 text-white/50 rounded" style={{ background: 'rgba(0,0,0,0.3)' }}>or continue with email</span></div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">Full Name</label>
                <input className="login-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="John Doe" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1">Email</label>
              <input type="email" className="login-input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="login-input pr-10"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === 'login' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-white/50">
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button onClick={() => setMode(m => m === 'login' ? 'register' : 'login')} className="text-primary-400 font-medium hover:underline">
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>

      {/* Book-opening transition */}
      {transitioning && (
        <BookTransition onComplete={handleTransitionComplete} userName={transitionName} />
      )}
    </div>
  );
}
