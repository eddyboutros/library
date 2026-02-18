import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeftRight, Search, Filter, ChevronLeft, ChevronRight, BookOpen,
  RotateCcw, Clock, AlertTriangle, CheckCircle, X, Loader2, UserCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { getTransactions, getBooks, getUsersList, checkoutBook, checkinBook } from '../services/api';

export default function Transactions() {
  const { user, isStaff } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const [showCheckout, setShowCheckout] = useState(false);
  const [allBooks, setAllBooks] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [checkoutForm, setCheckoutForm] = useState({ bookId: '', userId: '', dueDate: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getTransactions({ status: statusFilter || undefined, page, limit: 15 });
      setTransactions(data.transactions);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch {
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  const openCheckoutModal = async () => {
    try {
      const [booksRes, usersRes] = await Promise.all([
        getBooks({ available: true, limit: 100 }),
        getUsersList(),
      ]);
      setAllBooks(booksRes.data.books || []);
      setAllUsers(usersRes.data.users || []);

      const defaultDue = new Date();
      defaultDue.setDate(defaultDue.getDate() + 14);
      setCheckoutForm({ bookId: '', userId: '', dueDate: defaultDue.toISOString().split('T')[0], notes: '' });
      setShowCheckout(true);
    } catch {
      toast.error('Failed to load data');
    }
  };

  const handleCheckout = async e => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await checkoutBook({
        bookId: checkoutForm.bookId,
        userId: checkoutForm.userId,
        dueDate: new Date(checkoutForm.dueDate).toISOString(),
        notes: checkoutForm.notes,
      });
      toast.success('Book checked out successfully');
      setShowCheckout(false);
      fetchTransactions();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Checkout failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckin = async transactionId => {
    try {
      await checkinBook({ transactionId });
      toast.success('Book checked in successfully');
      fetchTransactions();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Check-in failed');
    }
  };

  const formatDate = d => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
  const isOverdue = tx => tx.status === 'active' && new Date(tx.dueDate) < new Date();
  const daysUntilDue = tx => {
    const diff = Math.ceil((new Date(tx.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Transactions</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{total} total transactions</p>
        </div>
        {isStaff && (
          <button onClick={openCheckoutModal} className="btn-primary">
            <BookOpen className="w-4 h-4" />
            Check Out Book
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-2">
          {['', 'active', 'returned'].map(s => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                  : 'text-gray-500 hover:bg-white/30 dark:hover:bg-white/10'
              }`}
            >
              {s === '' ? 'All' : s === 'active' ? 'Active' : 'Returned'}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-20">
          <ArrowLeftRight className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-700" />
          <p className="mt-3 text-gray-500 dark:text-gray-400">No transactions found</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/30 dark:bg-white/5">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Book</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 hidden md:table-cell">Borrower</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 hidden sm:table-cell">Checkout Date</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Due Date</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500 dark:text-gray-400">Status</th>
                {isStaff && (
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {transactions.map(tx => (
                <tr key={tx.id} className="hover:bg-white/20 dark:hover:bg-white/5">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{tx.bookTitle}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{tx.bookAuthor}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div>
                      <p className="text-gray-900 dark:text-white">{tx.userName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{tx.userEmail}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                    {formatDate(tx.checkoutDate)}
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className={`${isOverdue(tx) ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
                        {formatDate(tx.dueDate)}
                      </p>
                      {tx.status === 'active' && (
                        <p className={`text-xs ${isOverdue(tx) ? 'text-red-500' : 'text-gray-400'}`}>
                          {isOverdue(tx) ? `${Math.abs(daysUntilDue(tx))} days overdue` : `${daysUntilDue(tx)} days left`}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {tx.status === 'returned' ? (
                      <span className="badge-green"><CheckCircle className="w-3 h-3 mr-1" /> Returned</span>
                    ) : isOverdue(tx) ? (
                      <span className="badge-red"><AlertTriangle className="w-3 h-3 mr-1" /> Overdue</span>
                    ) : (
                      <span className="badge-yellow"><Clock className="w-3 h-3 mr-1" /> Active</span>
                    )}
                  </td>
                  {isStaff && (
                    <td className="px-4 py-3 text-right">
                      {tx.status === 'active' && (
                        <button onClick={() => handleCheckin(tx.id)} className="btn-secondary text-xs px-2.5 py-1.5">
                          <RotateCcw className="w-3 h-3" /> Return
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary px-3 py-2">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="flex items-center px-4 text-sm text-gray-600 dark:text-gray-400">
            Page {page} of {totalPages}
          </span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary px-3 py-2">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCheckout(false)} />
          <div className="relative glass-modal rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/60 dark:border-white/10">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Check Out Book</h2>
              <button onClick={() => setShowCheckout(false)} className="p-1 rounded-lg hover:bg-white/30 dark:hover:bg-white/10">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleCheckout} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Book *</label>
                <select className="input" value={checkoutForm.bookId} onChange={e => setCheckoutForm(f => ({ ...f, bookId: e.target.value }))} required>
                  <option value="">Select a book...</option>
                  {allBooks.filter(b => b.availableCopies > 0).map(b => (
                    <option key={b.id} value={b.id}>{b.title} — {b.author} ({b.availableCopies} avail)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Borrower *</label>
                <select className="input" value={checkoutForm.userId} onChange={e => setCheckoutForm(f => ({ ...f, userId: e.target.value }))} required>
                  <option value="">Select a user...</option>
                  {allUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email}) — {u.role}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date *</label>
                <input type="date" className="input" value={checkoutForm.dueDate} onChange={e => setCheckoutForm(f => ({ ...f, dueDate: e.target.value }))} required />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <input className="input" value={checkoutForm.notes} onChange={e => setCheckoutForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes..." />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200/60 dark:border-white/10">
                <button type="button" onClick={() => setShowCheckout(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
                  Check Out
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
