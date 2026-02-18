import { BookOpen, Star, User, Calendar } from 'lucide-react';

export default function BookCard({ book, onClick }) {
  const available = book.availableCopies > 0;
  const colors = {
    Fiction: 'from-blue-500 to-indigo-600',
    'Science Fiction': 'from-violet-500 to-purple-600',
    Fantasy: 'from-emerald-500 to-teal-600',
    Romance: 'from-pink-500 to-rose-600',
    Thriller: 'from-red-500 to-orange-600',
    Mystery: 'from-amber-500 to-yellow-600',
    'Non-Fiction': 'from-cyan-500 to-blue-600',
    Biography: 'from-teal-500 to-cyan-600',
    Philosophy: 'from-gray-500 to-slate-600',
    'Self-Help': 'from-lime-500 to-green-600',
    Horror: 'from-gray-700 to-gray-900',
    Poetry: 'from-fuchsia-500 to-pink-600',
    History: 'from-orange-500 to-amber-600',
    Adventure: 'from-green-500 to-emerald-600',
    Drama: 'from-rose-500 to-red-600',
    'Young Adult': 'from-sky-500 to-blue-600',
    Children: 'from-yellow-400 to-orange-500',
  };
  const gradient = colors[book.genre] || 'from-primary-500 to-primary-700';

  return (
    <div
      onClick={onClick}
      className="group card overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
    >
      {/* Cover */}
      <div className={`relative h-44 bg-gradient-to-br ${gradient} p-5 flex flex-col justify-between`}>
        <div className="flex justify-between items-start">
          <span className="badge bg-white/20 backdrop-blur-sm text-white text-xs">{book.genre}</span>
          {!available && (
            <span className="badge bg-red-500/90 text-white text-xs">Unavailable</span>
          )}
        </div>
        <div>
          <BookOpen className="w-8 h-8 text-white/40 mb-2" />
          <h3 className="text-white font-bold text-lg leading-tight line-clamp-2 group-hover:underline decoration-white/50">
            {book.title}
          </h3>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <User className="w-3.5 h-3.5" />
          <span className="truncate">{book.author}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {book.rating > 0 && (
              <>
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{book.rating}</span>
                <span className="text-xs text-gray-400">({book.ratingCount})</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <Calendar className="w-3 h-3" />
            {book.publishYear > 0 ? book.publishYear : 'Ancient'}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {book.availableCopies}/{book.totalCopies} available
          </span>
          <div className="flex gap-0.5">
            {Array.from({ length: book.totalCopies }, (_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${
                  i < book.availableCopies ? 'bg-emerald-400' : 'bg-red-400'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
