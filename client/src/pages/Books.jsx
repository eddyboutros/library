import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Plus, Grid3X3, List, ChevronLeft, ChevronRight, Star,
  Edit, Trash2, BookOpen, X, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { getBooks, createBook, updateBook, deleteBook } from '../services/api';
import BookCard from '../components/BookCard';
import BookFormModal from '../components/BookFormModal';

export default function Books() {
  const { user, isStaff } = useAuth();
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('grid');

  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState('');
  const [sort, setSort] = useState('newest');
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editBook, setEditBook] = useState(null);

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getBooks({ q: search, genre, sort, available: onlyAvailable || undefined, page, limit: 20 });
      setBooks(data.books);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      if (data.genres) setGenres(data.genres);
    } catch {
      toast.error('Failed to load books');
    } finally {
      setLoading(false);
    }
  }, [search, genre, sort, onlyAvailable, page]);

  useEffect(() => { fetchBooks(); }, [fetchBooks]);

  const handleSave = async formData => {
    try {
      if (editBook) {
        await updateBook(editBook.id, formData);
        toast.success('Book updated');
      } else {
        await createBook(formData);
        toast.success('Book added');
      }
      setShowForm(false);
      setEditBook(null);
      fetchBooks();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save');
    }
  };

  const handleDelete = async id => {
    if (!confirm('Delete this book permanently?')) return;
    try {
      await deleteBook(id);
      toast.success('Book deleted');
      fetchBooks();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Delete failed');
    }
  };

  const openBook = book => navigate(`/books/${book.id}`);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Books</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{total} books in catalog</p>
        </div>
        {isStaff && (
          <button onClick={() => { setEditBook(null); setShowForm(true); }} className="btn-primary">
            <Plus className="w-4 h-4" />
            Add Book
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
              placeholder="Search by title, author, ISBN..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>

          <select className="input w-auto" value={genre} onChange={e => { setGenre(e.target.value); setPage(1); }}>
            <option value="">All Genres</option>
            {genres.map(g => <option key={g} value={g}>{g}</option>)}
          </select>

          <select className="input w-auto" value={sort} onChange={e => setSort(e.target.value)}>
            <option value="newest">Newest First</option>
            <option value="title">Title A-Z</option>
            <option value="author">Author A-Z</option>
            <option value="rating">Top Rated</option>
            <option value="year">Year (Newest)</option>
          </select>

          <label className="flex items-center gap-2 px-3 text-sm text-gray-600 dark:text-gray-400 cursor-pointer whitespace-nowrap">
            <input type="checkbox" className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" checked={onlyAvailable} onChange={e => { setOnlyAvailable(e.target.checked); setPage(1); }} />
            Available only
          </label>

          <div className="flex border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <button onClick={() => setView('grid')} className={`p-2 ${view === 'grid' ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600' : 'text-gray-400 hover:text-gray-600'}`}>
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button onClick={() => setView('list')} className={`p-2 ${view === 'list' ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600' : 'text-gray-400 hover:text-gray-600'}`}>
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Books Grid/List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : books.length === 0 ? (
        <div className="text-center py-20">
          <BookOpen className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-700" />
          <p className="mt-3 text-gray-500 dark:text-gray-400">No books found</p>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {books.map(book => (
            <BookCard key={book.id} book={book} onClick={() => openBook(book)} />
          ))}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Title</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 hidden sm:table-cell">Author</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 hidden md:table-cell">Genre</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500 dark:text-gray-400">Rating</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500 dark:text-gray-400">Status</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {books.map(book => (
                <tr key={book.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer" onClick={() => openBook(book)}>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{book.title}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden sm:table-cell">{book.author}</td>
                  <td className="px-4 py-3 hidden md:table-cell"><span className="badge-blue">{book.genre}</span></td>
                  <td className="px-4 py-3 text-center">
                    {book.rating > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        {book.rating}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={book.availableCopies > 0 ? 'badge-green' : 'badge-red'}>
                      {book.availableCopies > 0 ? 'Available' : 'Unavailable'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                    {isStaff && (
                      <div className="flex justify-end gap-1">
                        <button onClick={() => { setEditBook(book); setShowForm(true); }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                          <Edit className="w-3.5 h-3.5 text-gray-400" />
                        </button>
                        {user?.role === 'admin' && (
                          <button onClick={() => handleDelete(book.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg">
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
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

      {/* Book Form Modal */}
      {showForm && (
        <BookFormModal
          book={editBook}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditBook(null); }}
        />
      )}
    </div>
  );
}
