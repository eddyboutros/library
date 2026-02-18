import { useState, useEffect, useRef } from 'react';
import {
  Bot, Send, Search, BookOpen, Sparkles, Star, Loader2,
  User, Lightbulb, MessageSquare, Zap, BookMarked,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { aiChat, aiSearch, aiRecommendations, getAIStatus } from '../services/api';
import { useAuth } from '../context/AuthContext';

function ChatMessage({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isUser ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600' : 'bg-gradient-to-br from-violet-500 to-purple-600 text-white'
      }`}>
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>
      <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
        isUser
          ? 'bg-primary-600 text-white rounded-br-md'
          : 'bg-white/30 dark:bg-white/10 text-gray-800 dark:text-gray-200 rounded-bl-md'
      }`}>
        <div className="whitespace-pre-wrap">{msg.content}</div>
        {msg.source && !isUser && (
          <p className="mt-1 text-xs opacity-60">
            {msg.source === 'ai' ? 'Powered by AI' : 'Local assistant'}
          </p>
        )}
      </div>
    </div>
  );
}

export default function AIAssistant() {
  const { user } = useAuth();
  const [tab, setTab] = useState('chat');
  const [aiStatus, setAIStatus] = useState(null);

  // Chat state
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: `Hello${user?.name ? `, ${user.name.split(' ')[0]}` : ''}! I'm Athena, your AI library assistant. I can help you:\n\n• Find books by topic, genre, or mood\n• Get personalized reading recommendations\n• Answer questions about our catalog\n• Suggest similar books to ones you love\n\nWhat would you like to explore today?`,
    source: 'local',
  }]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchEngine, setSearchEngine] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);

  // Recommendations state
  const [recs, setRecs] = useState([]);
  const [recsEngine, setRecsEngine] = useState('');
  const [recsLoading, setRecsLoading] = useState(false);

  useEffect(() => {
    getAIStatus().then(({ data }) => setAIStatus(data)).catch(() => {});
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || chatLoading) return;
    const userMsg = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setChatLoading(true);

    try {
      const history = messages.filter(m => m.role !== 'system').map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }));
      const { data } = await aiChat(input.trim(), history);
      setMessages(prev => [...prev, { role: 'assistant', content: data.message, source: data.source }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm sorry, I encountered an error. Please try again.", source: 'error' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSearch = async e => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const { data } = await aiSearch(searchQuery);
      setSearchResults(data.results || []);
      setSearchEngine(data.engine);
    } catch {
      toast.error('Search failed');
    } finally {
      setSearchLoading(false);
    }
  };

  const loadRecommendations = async () => {
    setRecsLoading(true);
    try {
      const { data } = await aiRecommendations();
      setRecs(data.recommendations || []);
      setRecsEngine(data.engine);
    } catch {
      toast.error('Failed to load recommendations');
    } finally {
      setRecsLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'recommendations' && recs.length === 0) loadRecommendations();
  }, [tab]);

  const suggestedQueries = [
    'What are your top-rated science fiction books?',
    'Recommend something for a rainy weekend',
    'Do you have any books by Tolkien?',
    'What genres are available?',
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Bot className="w-7 h-7 text-primary-600" />
            AI Assistant
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {aiStatus?.available
              ? <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-green-500" /> OpenAI Enhanced</span>
              : <span className="flex items-center gap-1"><Lightbulb className="w-3 h-3 text-amber-500" /> Local Intelligence</span>
            }
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/20 dark:border-white/10">
        {[
          { id: 'chat', label: 'Chat', icon: MessageSquare },
          { id: 'search', label: 'Smart Search', icon: Search },
          { id: 'recommendations', label: 'Recommendations', icon: Sparkles },
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

      {/* Chat Tab */}
      {tab === 'chat' && (
        <div className="card flex flex-col h-[calc(100vh-300px)] min-h-[400px]">
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
            {messages.map((msg, i) => <ChatMessage key={i} msg={msg} />)}
            {chatLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="px-4 py-3 bg-white/30 dark:bg-white/10 rounded-2xl rounded-bl-md">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Suggested queries */}
          {messages.length <= 1 && (
            <div className="px-4 pb-2">
              <p className="text-xs text-gray-400 mb-2">Try asking:</p>
              <div className="flex flex-wrap gap-2">
                {suggestedQueries.map(q => (
                  <button key={q} onClick={() => { setInput(q); }} className="px-3 py-1.5 bg-white/30 dark:bg-white/10 rounded-full text-xs text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-white/15 transition-colors">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="p-4 border-t border-white/20 dark:border-white/10">
            <form onSubmit={e => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="Ask me anything about the library..."
                value={input}
                onChange={e => setInput(e.target.value)}
                disabled={chatLoading}
              />
              <button type="submit" disabled={chatLoading || !input.trim()} className="btn-primary px-4">
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Smart Search Tab */}
      {tab === 'search' && (
        <div className="space-y-4">
          <div className="card p-4">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  className="input pl-9"
                  placeholder="Try: 'dystopian novels about surveillance' or 'books for a beginner in philosophy'"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <button type="submit" disabled={searchLoading || !searchQuery.trim()} className="btn-primary">
                {searchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Search
              </button>
            </form>
            {searchEngine && (
              <p className="mt-2 text-xs text-gray-400">
                Powered by {searchEngine === 'ai' ? 'OpenAI' : 'local keyword matching'}
              </p>
            )}
          </div>

          {searchResults.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {searchResults.map(book => (
                <div key={book.id} className="card p-4 space-y-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white">{book.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{book.author}</p>
                  <div className="flex items-center gap-2">
                    <span className="badge-blue text-xs">{book.genre}</span>
                    {book.rating > 0 && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" /> {book.rating}
                      </span>
                    )}
                  </div>
                  {book.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{book.description}</p>
                  )}
                  <div className="pt-1">
                    <span className={book.availableCopies > 0 ? 'badge-green text-xs' : 'badge-red text-xs'}>
                      {book.availableCopies > 0 ? `${book.availableCopies} available` : 'Unavailable'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : searchQuery && !searchLoading ? (
            <div className="text-center py-10">
              <Search className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-700" />
              <p className="mt-3 text-gray-500 dark:text-gray-400">No results found. Try different keywords.</p>
            </div>
          ) : null}
        </div>
      )}

      {/* Recommendations Tab */}
      {tab === 'recommendations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Personalized for You</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Based on your reading history
                {recsEngine && <span className="text-xs ml-1">({recsEngine === 'ai' ? 'AI-powered' : 'Local engine'})</span>}
              </p>
            </div>
            <button onClick={loadRecommendations} disabled={recsLoading} className="btn-secondary">
              {recsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Refresh
            </button>
          </div>

          {recsLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            </div>
          ) : recs.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {recs.map(book => (
                <div key={book.id} className="card overflow-hidden">
                  <div className="h-2 bg-gradient-to-r from-violet-500 to-purple-600" />
                  <div className="p-4 space-y-2">
                    <div className="flex items-start gap-2">
                      <BookMarked className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" />
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{book.title}</h3>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{book.author}</p>
                    <div className="flex items-center gap-2">
                      <span className="badge-blue text-xs">{book.genre}</span>
                      {book.rating > 0 && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400" /> {book.rating}
                        </span>
                      )}
                    </div>
                    {book.reason && (
                      <div className="pt-2 border-t border-white/20 dark:border-white/10">
                        <p className="text-xs text-purple-600 dark:text-purple-400 flex items-start gap-1">
                          <Sparkles className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          {book.reason}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <BookOpen className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-700" />
              <p className="mt-3 text-gray-500 dark:text-gray-400">
                Borrow some books first, and we'll generate personalized recommendations!
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
