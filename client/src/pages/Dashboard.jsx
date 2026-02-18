import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen, Users, ArrowLeftRight, AlertTriangle, TrendingUp,
  Star, Clock, BookPlus, ArrowRight, Loader2,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { getBookStats, getTransactionStats } from '../services/api';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6'];

function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          {sub && <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{sub}</p>}
        </div>
        <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [bookStats, setBookStats] = useState(null);
  const [txStats, setTxStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getBookStats(), getTransactionStats()])
      .then(([b, t]) => {
        setBookStats(b.data);
        setTxStats(t.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  const genreData = bookStats?.genres
    ? Object.entries(bookStats.genres).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
    : [];

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Welcome back, {user?.name?.split(' ')[0]}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Here's what's happening in your library today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={BookOpen} label="Total Books" value={bookStats?.total || 0} color="bg-primary-600" sub="In catalog" />
        <StatCard icon={TrendingUp} label="Available" value={bookStats?.available || 0} color="bg-emerald-600" sub="Ready to borrow" />
        <StatCard icon={ArrowLeftRight} label="Checked Out" value={txStats?.active || 0} color="bg-amber-600" sub="Currently borrowed" />
        <StatCard icon={AlertTriangle} label="Overdue" value={txStats?.overdue || 0} color="bg-red-600" sub="Need attention" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Genre Distribution */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Genre Distribution</h3>
          {genreData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={genreData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={50}
                  paddingAngle={2}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {genreData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-center py-10">No data yet</p>
          )}
        </div>

        {/* Books by Genre Bar */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Books by Genre</h3>
          {genreData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={genreData} layout="vertical" margin={{ left: 80 }}>
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={80} />
                <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '8px' }} />
                <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-center py-10">No data yet</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Rated */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Top Rated Books</h3>
            <Link to="/books?sort=rating" className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {(bookStats?.topRated || []).map((book, i) => (
              <div key={book.id} className="flex items-center gap-3">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 text-xs font-bold">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{book.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{book.author}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{book.rating}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
            <Link to="/transactions" className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {(txStats?.recent || []).slice(0, 5).map(tx => (
              <div key={tx.id} className="flex items-center gap-3">
                <div className={`flex items-center justify-center w-7 h-7 rounded-full ${
                  tx.status === 'returned' ? 'bg-emerald-100 dark:bg-emerald-900/20' : tx.status === 'active' && new Date(tx.dueDate) < new Date() ? 'bg-red-100 dark:bg-red-900/20' : 'bg-amber-100 dark:bg-amber-900/20'
                }`}>
                  {tx.status === 'returned' ? (
                    <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{tx.bookTitle || 'Unknown'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {tx.userName} • {tx.status === 'returned' ? 'Returned' : 'Borrowed'}
                  </p>
                </div>
                <span className={`badge ${tx.status === 'returned' ? 'badge-green' : new Date(tx.dueDate) < new Date() ? 'badge-red' : 'badge-yellow'}`}>
                  {tx.status === 'returned' ? 'Returned' : new Date(tx.dueDate) < new Date() ? 'Overdue' : 'Active'}
                </span>
              </div>
            ))}
            {(!txStats?.recent || txStats.recent.length === 0) && (
              <p className="text-gray-400 text-center py-4 text-sm">No activity yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      {(user?.role === 'admin' || user?.role === 'librarian') && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
          <div className="flex flex-wrap gap-3">
            <Link to="/books" className="btn-primary">
              <BookPlus className="w-4 h-4" />
              Add Book
            </Link>
            <Link to="/transactions" className="btn-secondary">
              <ArrowLeftRight className="w-4 h-4" />
              Manage Transactions
            </Link>
            <Link to="/ai-assistant" className="btn-secondary">
              <Star className="w-4 h-4" />
              AI Assistant
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
