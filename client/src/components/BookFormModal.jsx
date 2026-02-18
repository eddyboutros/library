import { useState, useEffect } from 'react';
import { X, Sparkles, Loader2 } from 'lucide-react';
import { aiCategorize } from '../services/api';

const GENRES = [
  'Fiction', 'Non-Fiction', 'Science Fiction', 'Fantasy', 'Mystery', 'Romance',
  'Thriller', 'Horror', 'Biography', 'History', 'Science', 'Philosophy',
  'Self-Help', 'Poetry', 'Drama', 'Adventure', 'Children', 'Young Adult', 'Uncategorized',
];

export default function BookFormModal({ book, onSave, onClose }) {
  const isEdit = !!book;
  const [form, setForm] = useState({
    title: '', author: '', isbn: '', genre: 'Fiction', publishYear: '',
    publisher: '', description: '', coverUrl: '', totalCopies: 1,
  });
  const [categorizing, setCategorizing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (book) {
      setForm({
        title: book.title || '', author: book.author || '', isbn: book.isbn || '',
        genre: book.genre || 'Fiction', publishYear: book.publishYear || '',
        publisher: book.publisher || '', description: book.description || '',
        coverUrl: book.coverUrl || '', totalCopies: book.totalCopies || 1,
      });
    }
  }, [book]);

  const handleChange = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleAutoGenre = async () => {
    if (!form.title) return;
    setCategorizing(true);
    try {
      const { data } = await aiCategorize(form.title, form.author, form.description);
      handleChange('genre', data.genre);
    } catch {
      // ignore
    } finally {
      setCategorizing(false);
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ ...form, publishYear: form.publishYear ? parseInt(form.publishYear) : null, totalCopies: parseInt(form.totalCopies) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-modal rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 glass-modal border-b border-gray-200/60 dark:border-white/10 rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {isEdit ? 'Edit Book' : 'Add New Book'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/30 dark:hover:bg-white/10">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
              <input className="input" value={form.title} onChange={e => handleChange('title', e.target.value)} required />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Author *</label>
              <input className="input" value={form.author} onChange={e => handleChange('author', e.target.value)} required />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ISBN</label>
              <input className="input" value={form.isbn} onChange={e => handleChange('isbn', e.target.value)} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Genre</label>
              <div className="flex gap-2">
                <select className="input flex-1" value={form.genre} onChange={e => handleChange('genre', e.target.value)}>
                  {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <button
                  type="button"
                  onClick={handleAutoGenre}
                  disabled={categorizing || !form.title}
                  className="btn-secondary px-3"
                  title="AI auto-detect genre"
                >
                  {categorizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-primary-500" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Publish Year</label>
              <input type="number" className="input" value={form.publishYear} onChange={e => handleChange('publishYear', e.target.value)} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Publisher</label>
              <input className="input" value={form.publisher} onChange={e => handleChange('publisher', e.target.value)} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Total Copies</label>
              <input type="number" min="1" className="input" value={form.totalCopies} onChange={e => handleChange('totalCopies', e.target.value)} />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cover Image URL</label>
              <input className="input" value={form.coverUrl} onChange={e => handleChange('coverUrl', e.target.value)} placeholder="https://..." />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <textarea className="input min-h-[100px] resize-y" value={form.description} onChange={e => handleChange('description', e.target.value)} rows={3} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200/60 dark:border-white/10">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving || !form.title || !form.author} className="btn-primary">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {isEdit ? 'Save Changes' : 'Add Book'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
