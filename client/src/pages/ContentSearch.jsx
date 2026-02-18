import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, BookOpen, FileText, Type, Loader2, ChevronLeft, ChevronRight,
  Filter, BookMarked, Hash, ArrowRight, X, Layers,
} from 'lucide-react';
import { contentSearch } from '../services/api';

const SCOPE_OPTIONS = [
  { value: 'all', label: 'Everything', icon: Layers },
  { value: 'books', label: 'Books', icon: BookOpen },
  { value: 'chapters', label: 'Chapters', icon: FileText },
  { value: 'content', label: 'Content', icon: Type },
];

function HighlightedText({ text, query }) {
  if (!query || !text) return <span>{text}</span>;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <span>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-amber-200 dark:bg-amber-800/60 text-gray-900 dark:text-amber-100 rounded px-0.5">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

function ResultCard({ result, query }) {
  const typeConfig = {
    book: { label: 'Book', color: 'badge-blue', icon: BookOpen },
    chapter: { label: 'Chapter', color: 'badge-purple', icon: FileText },
    content: { label: 'Content', color: 'badge-yellow', icon: Type },
  };
  const cfg = typeConfig[result.type] || typeConfig.content;
  const Icon = cfg.icon;

  const matchLabels = {
    title: 'Title match',
    author: 'Author match',
    isbn: 'ISBN match',
    genre: 'Genre match',
    description: 'Description match',
    chapter_title: 'Chapter title',
    chapter_summary: 'Chapter summary',
    chapter_content: 'Chapter content',
  };

  return (
    <div className="card p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className={`flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0 ${
          result.type === 'book' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' :
          result.type === 'chapter' ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400' :
          'bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
        }`}>
          <Icon className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={cfg.color}>{cfg.label}</span>
            <span className="text-xs text-gray-400">{matchLabels[result.matchIn] || result.matchIn}</span>
            {result.occurrences && (
              <span className="text-xs text-gray-400">({result.occurrences} occurrence{result.occurrences !== 1 ? 's' : ''})</span>
            )}
          </div>

          <Link
            to={`/books/${result.bookId}`}
            className="text-base font-semibold text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            <HighlightedText text={result.bookTitle} query={query} />
          </Link>

          <p className="text-sm text-gray-500 dark:text-gray-400">
            <HighlightedText text={result.bookAuthor} query={query} />
            {result.bookGenre && <span className="ml-2 text-xs text-gray-400">({result.bookGenre})</span>}
          </p>

          {(result.type === 'chapter' || result.type === 'content') && result.chapterTitle && (
            <div className="mt-1.5 flex items-center gap-1.5 text-sm">
              <Hash className="w-3 h-3 text-gray-400" />
              <span className="text-gray-600 dark:text-gray-400">
                Chapter {result.chapterNumber}:
              </span>
              <span className="font-medium text-gray-800 dark:text-gray-200">
                <HighlightedText text={result.chapterTitle} query={query} />
              </span>
            </div>
          )}

          {result.snippet && (
            <div className="mt-2 px-3 py-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              <HighlightedText text={result.snippet} query={query} />
            </div>
          )}
          {result.contentSnippet && result.type === 'chapter' && (
            <div className="mt-1.5 px-3 py-2 bg-amber-50 dark:bg-amber-900/10 rounded-lg text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Also in content: </span>
              <HighlightedText text={result.contentSnippet} query={query} />
            </div>
          )}

          <div className="mt-2">
            <Link
              to={`/books/${result.bookId}`}
              className="inline-flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:underline"
            >
              View book <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ContentSearch() {
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState('all');
  const [results, setResults] = useState([]);
  const [stats, setStats] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(async (searchPage = 1) => {
    if (!query.trim() || query.trim().length < 2) return;
    setLoading(true);
    setSearched(true);
    try {
      const { data } = await contentSearch({ q: query.trim(), scope, page: searchPage, limit: 20 });
      setResults(data.results);
      setTotal(data.total);
      setPage(data.page);
      setTotalPages(data.totalPages);
      setStats(data.stats);
    } catch (err) {
      setResults([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [query, scope]);

  const handleSubmit = e => {
    e.preventDefault();
    setPage(1);
    handleSearch(1);
  };

  const changePage = newPage => {
    setPage(newPage);
    handleSearch(newPage);
  };

  const exampleQueries = [
    'Boo Radley',
    'Big Brother',
    'sandworms',
    'compound interest',
    'green light',
    'riddle',
    'identity',
    'dystopia',
  ];

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Search className="w-6 h-6 text-primary-600" />
          Content Search
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Search across all books, chapters, and their full content
        </p>
      </div>

      {/* Search Form */}
      <div className="card p-5">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="input pl-9 pr-9 text-base"
                placeholder="Search for anything across all books and chapters..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                autoFocus
              />
              {query && (
                <button type="button" onClick={() => { setQuery(''); setSearched(false); setResults([]); }} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
            <button type="submit" disabled={loading || query.trim().length < 2} className="btn-primary px-6">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Search
            </button>
          </div>

          {/* Scope Filters */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500 mr-1">Scope:</span>
            {SCOPE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setScope(opt.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  scope === opt.value
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                    : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <opt.icon className="w-3 h-3" />
                {opt.label}
              </button>
            ))}
          </div>
        </form>

        {/* Example queries */}
        {!searched && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            <p className="text-xs text-gray-400 mb-2">Try searching for:</p>
            <div className="flex flex-wrap gap-2">
              {exampleQueries.map(eq => (
                <button
                  key={eq}
                  onClick={() => { setQuery(eq); setPage(1); }}
                  className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  "{eq}"
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Stats Bar */}
      {searched && stats && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="font-medium text-gray-900 dark:text-white">
            {total} result{total !== 1 ? 's' : ''} found
          </span>
          <span className="text-gray-300 dark:text-gray-700">|</span>
          <span className="text-gray-500 dark:text-gray-400">
            {stats.uniqueBooks} book{stats.uniqueBooks !== 1 ? 's' : ''}
          </span>
          {stats.bookHits > 0 && <span className="badge-blue text-xs">{stats.bookHits} book matches</span>}
          {stats.chapterHits > 0 && <span className="badge-purple text-xs">{stats.chapterHits} chapter matches</span>}
          {stats.contentHits > 0 && <span className="badge-yellow text-xs">{stats.contentHits} content matches</span>}
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-3">
          {results.map((r, i) => (
            <ResultCard key={`${r.type}-${r.bookId}-${r.chapterId || i}`} result={r} query={query} />
          ))}
        </div>
      ) : searched ? (
        <div className="text-center py-16">
          <Search className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-700" />
          <p className="mt-3 text-gray-500 dark:text-gray-400 text-lg">No results found for "{query}"</p>
          <p className="text-sm text-gray-400 mt-1">Try different keywords or broaden the search scope</p>
        </div>
      ) : null}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button onClick={() => changePage(Math.max(1, page - 1))} disabled={page === 1} className="btn-secondary px-3 py-2">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="flex items-center px-4 text-sm text-gray-600 dark:text-gray-400">
            Page {page} of {totalPages}
          </span>
          <button onClick={() => changePage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="btn-secondary px-3 py-2">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
