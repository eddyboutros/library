import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, BookOpen, Star, User, Calendar, Edit, Trash2, Plus, ChevronDown,
  ChevronRight, FileText, Loader2, X, BookCopy, Save, GripVertical, Sparkles,
  Hash, AlignLeft, Type,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import {
  getBook, getBookChapters, createChapter, updateChapter, deleteChapter,
  selfCheckout, addReview, updateBook, deleteBook,
} from '../services/api';

function ChapterView({ chapter, isStaff, onEdit, onDelete, isExpanded, onToggle }) {
  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
      >
        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 text-sm font-bold flex-shrink-0">
          {chapter.chapterNumber}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 dark:text-white truncate">{chapter.title}</p>
          {chapter.summary && !isExpanded && (
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{chapter.summary}</p>
          )}
        </div>
        {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-800">
          {chapter.summary && (
            <div className="mt-3 px-3 py-2 bg-primary-50 dark:bg-primary-900/10 rounded-lg">
              <p className="text-sm text-primary-800 dark:text-primary-300 italic">{chapter.summary}</p>
            </div>
          )}
          {chapter.content && (
            <div className="mt-3 prose prose-sm dark:prose-invert max-w-none">
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{chapter.content}</p>
            </div>
          )}
          {!chapter.content && !chapter.summary && (
            <p className="mt-3 text-sm text-gray-400 italic">No content added yet.</p>
          )}
          {isStaff && (
            <div className="mt-3 flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
              <button onClick={() => onEdit(chapter)} className="btn-ghost text-xs px-2 py-1">
                <Edit className="w-3 h-3" /> Edit
              </button>
              <button onClick={() => onDelete(chapter.id)} className="btn-ghost text-xs px-2 py-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10">
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ChapterFormModal({ chapter, bookId, onSave, onClose }) {
  const isEdit = !!chapter;
  const [form, setForm] = useState({
    chapterNumber: '', title: '', summary: '', content: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (chapter) {
      setForm({
        chapterNumber: chapter.chapterNumber || '',
        title: chapter.title || '',
        summary: chapter.summary || '',
        content: chapter.content || '',
      });
    }
  }, [chapter]);

  const handleSubmit = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ ...form, bookId, chapterNumber: parseInt(form.chapterNumber) || undefined });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-modal rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 glass-modal border-b border-white/10 rounded-t-2xl z-10">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {isEdit ? 'Edit Chapter' : 'Add Chapter'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <Hash className="w-3.5 h-3.5 inline mr-1" />Chapter #
              </label>
              <input type="number" min="1" className="input" value={form.chapterNumber} onChange={e => setForm(f => ({ ...f, chapterNumber: e.target.value }))} placeholder="Auto" />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <Type className="w-3.5 h-3.5 inline mr-1" />Title *
              </label>
              <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required placeholder="Chapter title" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <AlignLeft className="w-3.5 h-3.5 inline mr-1" />Summary
            </label>
            <textarea className="input min-h-[60px] resize-y" value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} rows={2} placeholder="Brief chapter summary..." />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <FileText className="w-3.5 h-3.5 inline mr-1" />Content / Details
            </label>
            <textarea className="input min-h-[200px] resize-y font-mono text-sm" value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={8} placeholder="Full chapter content..." />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving || !form.title} className="btn-primary">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isEdit ? 'Save Changes' : 'Add Chapter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function BookDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isStaff, isAdmin } = useAuth();

  const [book, setBook] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);

  const [expandedChapters, setExpandedChapters] = useState(new Set());
  const [chapterForm, setChapterForm] = useState(null); // null = closed, {} = new, chapter = edit
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [reviewLoading, setReviewLoading] = useState(false);
  const [tab, setTab] = useState('chapters');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [bookRes, chapRes] = await Promise.all([getBook(id), getBookChapters(id)]);
      setBook(bookRes.data.book);
      setReviews(bookRes.data.reviews || []);
      setChapters(chapRes.data.chapters || []);
    } catch {
      toast.error('Failed to load book');
      navigate('/books');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleChapter = chId => {
    setExpandedChapters(prev => {
      const next = new Set(prev);
      next.has(chId) ? next.delete(chId) : next.add(chId);
      return next;
    });
  };

  const expandAll = () => setExpandedChapters(new Set(chapters.map(c => c.id)));
  const collapseAll = () => setExpandedChapters(new Set());

  const handleSaveChapter = async data => {
    try {
      if (chapterForm?.id) {
        await updateChapter(chapterForm.id, data);
        toast.success('Chapter updated');
      } else {
        await createChapter(data);
        toast.success('Chapter added');
      }
      setChapterForm(null);
      const { data: chapData } = await getBookChapters(id);
      setChapters(chapData.chapters || []);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save chapter');
    }
  };

  const handleDeleteChapter = async chapterId => {
    if (!confirm('Delete this chapter and all its content?')) return;
    try {
      await deleteChapter(chapterId);
      toast.success('Chapter deleted');
      setChapters(prev => prev.filter(c => c.id !== chapterId));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Delete failed');
    }
  };

  const handleSelfCheckout = async () => {
    try {
      await selfCheckout(book.id);
      toast.success('Book checked out! Due in 14 days.');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Checkout failed');
    }
  };

  const handleReview = async () => {
    setReviewLoading(true);
    try {
      await addReview(book.id, reviewForm);
      toast.success('Review added');
      setReviewForm({ rating: 5, comment: '' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add review');
    } finally {
      setReviewLoading(false);
    }
  };

  const handleDeleteBook = async () => {
    if (!confirm('Delete this book and all its chapters permanently?')) return;
    try {
      await deleteBook(book.id);
      toast.success('Book deleted');
      navigate('/books');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Delete failed');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!book) return null;

  const genreColors = {
    Fiction: 'from-blue-500 to-indigo-600',
    'Science Fiction': 'from-violet-500 to-purple-600',
    Fantasy: 'from-emerald-500 to-teal-600',
    Romance: 'from-pink-500 to-rose-600',
    Thriller: 'from-red-500 to-orange-600',
    'Non-Fiction': 'from-cyan-500 to-blue-600',
    Biography: 'from-teal-500 to-cyan-600',
    Philosophy: 'from-gray-500 to-slate-600',
    'Self-Help': 'from-lime-500 to-green-600',
  };
  const gradient = genreColors[book.genre] || 'from-primary-500 to-primary-700';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Back */}
      <Link to="/books" className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Books
      </Link>

      {/* Header Card */}
      <div className="card overflow-hidden">
        <div className={`bg-gradient-to-br ${gradient} px-6 py-8 sm:px-8`}>
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="flex-1">
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="badge bg-white/20 backdrop-blur-sm text-white">{book.genre}</span>
                <span className={`badge ${book.availableCopies > 0 ? 'bg-emerald-500/80' : 'bg-red-500/80'} text-white`}>
                  {book.availableCopies > 0 ? `${book.availableCopies} available` : 'Unavailable'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">{book.title}</h1>
              <p className="text-white/80 text-lg">{book.author}</p>
            </div>
            {book.rating > 0 && (
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                <Star className="w-5 h-5 text-amber-300 fill-amber-300" />
                <span className="text-xl font-bold text-white">{book.rating}</span>
                <span className="text-white/60 text-sm">({book.ratingCount})</span>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-4">
            {book.publishYear && (
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Calendar className="w-4 h-4 flex-shrink-0" /> {book.publishYear > 0 ? book.publishYear : 'Ancient'}
              </div>
            )}
            {book.publisher && (
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <BookOpen className="w-4 h-4 flex-shrink-0" /> {book.publisher}
              </div>
            )}
            {book.isbn && (
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <BookCopy className="w-4 h-4 flex-shrink-0" /> {book.isbn}
              </div>
            )}
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <FileText className="w-4 h-4 flex-shrink-0" /> {chapters.length} chapter{chapters.length !== 1 ? 's' : ''}
            </div>
          </div>

          {book.description && (
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">{book.description}</p>
          )}

          <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-200 dark:border-gray-800">
            {book.availableCopies > 0 && (
              <button onClick={handleSelfCheckout} className="btn-primary">
                <BookOpen className="w-4 h-4" /> Borrow This Book
              </button>
            )}
            {isStaff && (
              <Link to={`/books`} className="btn-secondary">
                <Edit className="w-4 h-4" /> Edit Book
              </Link>
            )}
            {isAdmin && (
              <button onClick={handleDeleteBook} className="btn-danger">
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800">
        {[
          { id: 'chapters', label: `Chapters (${chapters.length})`, icon: FileText },
          { id: 'reviews', label: `Reviews (${reviews.length})`, icon: Star },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Chapters Tab */}
      {tab === 'chapters' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {chapters.length > 0 && (
                <>
                  <button onClick={expandAll} className="btn-ghost text-xs">Expand All</button>
                  <button onClick={collapseAll} className="btn-ghost text-xs">Collapse All</button>
                </>
              )}
            </div>
            {isStaff && (
              <button onClick={() => setChapterForm({})} className="btn-primary text-sm">
                <Plus className="w-4 h-4" /> Add Chapter
              </button>
            )}
          </div>

          {chapters.length > 0 ? (
            <div className="space-y-2">
              {chapters.map(ch => (
                <ChapterView
                  key={ch.id}
                  chapter={ch}
                  isStaff={isStaff}
                  onEdit={setChapterForm}
                  onDelete={handleDeleteChapter}
                  isExpanded={expandedChapters.has(ch.id)}
                  onToggle={() => toggleChapter(ch.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 card">
              <FileText className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-700" />
              <p className="mt-3 text-gray-500 dark:text-gray-400">No chapters added yet</p>
              {isStaff && (
                <button onClick={() => setChapterForm({})} className="btn-primary mt-4 text-sm">
                  <Plus className="w-4 h-4" /> Add First Chapter
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Reviews Tab */}
      {tab === 'reviews' && (
        <div className="space-y-4">
          {reviews.length > 0 ? (
            <div className="space-y-3">
              {reviews.map(r => (
                <div key={r.id} className="card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                      <div className="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-700 dark:text-primary-400 text-xs font-bold">
                        {r.userName?.charAt(0)}
                      </div>
                      {r.userName}
                    </span>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star key={i} className={`w-4 h-4 ${i < r.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 dark:text-gray-700'}`} />
                      ))}
                    </div>
                  </div>
                  {r.comment && <p className="text-sm text-gray-600 dark:text-gray-400">{r.comment}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-6">No reviews yet. Be the first!</p>
          )}

          <div className="card p-4">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Leave a Review</h4>
            <div className="flex items-center gap-1 mb-3">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setReviewForm(f => ({ ...f, rating: n }))}>
                  <Star className={`w-6 h-6 cursor-pointer transition-colors ${n <= reviewForm.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300 dark:text-gray-600'}`} />
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input className="input flex-1" placeholder="Write your review..." value={reviewForm.comment} onChange={e => setReviewForm(f => ({ ...f, comment: e.target.value }))} />
              <button onClick={handleReview} disabled={reviewLoading} className="btn-primary">
                {reviewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Post'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chapter Form Modal */}
      {chapterForm !== null && (
        <ChapterFormModal
          chapter={chapterForm?.id ? chapterForm : null}
          bookId={book.id}
          onSave={handleSaveChapter}
          onClose={() => setChapterForm(null)}
        />
      )}
    </div>
  );
}
