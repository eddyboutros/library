import { useState, useEffect, useCallback } from 'react';
import {
  Users as UsersIcon, Search, Plus, Shield, ShieldCheck, ShieldAlert,
  User, ToggleLeft, ToggleRight, ChevronLeft, ChevronRight, X, Loader2, Eye, EyeOff,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { getUsers, updateUserRole, updateUserStatus, createUser } from '../services/api';

const ROLE_CONFIG = {
  admin: { label: 'Admin', icon: ShieldAlert, color: 'badge-red' },
  librarian: { label: 'Librarian', icon: ShieldCheck, color: 'badge-blue' },
  member: { label: 'Member', icon: User, color: 'badge-green' },
};

export default function UsersPage() {
  const { user: currentUser, isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', email: '', password: '', role: 'member' });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getUsers({ q: search || undefined, role: roleFilter || undefined, page, limit: 15 });
      setUsers(data.users);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, page]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await updateUserRole(userId, newRole);
      toast.success('Role updated');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update role');
    }
  };

  const handleStatusToggle = async (userId, currentStatus) => {
    try {
      await updateUserStatus(userId, !currentStatus);
      toast.success(currentStatus ? 'User deactivated' : 'User activated');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update status');
    }
  };

  const handleCreate = async e => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createUser(createForm);
      toast.success('User created');
      setShowCreate(false);
      setCreateForm({ name: '', email: '', password: '', role: 'member' });
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Users</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{total} registered users</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            Add User
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="input pl-9"
              placeholder="Search by name or email..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className="flex gap-2">
            {['', 'admin', 'librarian', 'member'].map(r => (
              <button
                key={r}
                onClick={() => { setRoleFilter(r); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  roleFilter === r
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                    : 'text-gray-500 hover:bg-white/30 dark:hover:bg-white/10'
                }`}
              >
                {r === '' ? 'All' : r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-20">
          <UsersIcon className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-700" />
          <p className="mt-3 text-gray-500 dark:text-gray-400">No users found</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/30 dark:bg-white/5">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">User</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 hidden md:table-cell">Email</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500 dark:text-gray-400">Role</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500 dark:text-gray-400 hidden sm:table-cell">Provider</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500 dark:text-gray-400">Status</th>
                {isAdmin && <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {users.map(u => {
                const roleConf = ROLE_CONFIG[u.role] || ROLE_CONFIG.member;
                const isSelf = u.id === currentUser?.id;
                return (
                  <tr key={u.id} className="hover:bg-white/20 dark:hover:bg-white/5">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-sm font-medium">
                          {u.name?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {u.name} {isSelf && <span className="text-xs text-gray-400">(you)</span>}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 md:hidden">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden md:table-cell">{u.email}</td>
                    <td className="px-4 py-3 text-center">
                      {isAdmin && !isSelf ? (
                        <select
                          value={u.role}
                          onChange={e => handleRoleChange(u.id, e.target.value)}
                          className="input py-1 px-2 w-auto text-xs"
                        >
                          <option value="admin">Admin</option>
                          <option value="librarian">Librarian</option>
                          <option value="member">Member</option>
                        </select>
                      ) : (
                        <span className={roleConf.color}>{roleConf.label}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center hidden sm:table-cell">
                      <span className="badge-purple">{u.provider || 'local'}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={u.isActive ? 'badge-green' : 'badge-red'}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        {!isSelf && (
                          <button
                            onClick={() => handleStatusToggle(u.id, u.isActive)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              u.isActive ? 'hover:bg-red-50 dark:hover:bg-red-900/10 text-red-400' : 'hover:bg-green-50 dark:hover:bg-green-900/10 text-green-400'
                            }`}
                            title={u.isActive ? 'Deactivate' : 'Activate'}
                          >
                            {u.isActive ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
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

      {/* Create User Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative glass-modal rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/60 dark:border-white/10">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Add New User</h2>
              <button onClick={() => setShowCreate(false)} className="p-1 rounded-lg hover:bg-white/30 dark:hover:bg-white/10">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name *</label>
                <input className="input" value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
                <input type="email" className="input" value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="input pr-10"
                    value={createForm.password}
                    onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                <select className="input" value={createForm.role} onChange={e => setCreateForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="member">Member</option>
                  <option value="librarian">Librarian</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200/60 dark:border-white/10">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
