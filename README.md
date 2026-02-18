# Athena — Mini Library Management System

A full-featured library management system with Excel-based storage, SSO authentication, AI-powered features, and a modern React UI.

## Features

### Core
- **Book Management** — Add, edit, delete books with rich metadata (title, author, ISBN, genre, year, publisher, description, cover URL, copies)
- **Book Contents & Chapters** — Add full chapter content to every book, including chapter numbers, titles, summaries, and detailed text
- **Check-in / Check-out** — Borrow and return books with due date tracking, overdue alerts, and self-checkout for members
- **Search & Filter** — Find books by title, author, genre, ISBN, or description with sorting and pagination
- **Global Content Search** — Search across all books, chapters, and chapter content with highlighted results, snippets, and scope filters
- **Book Reviews** — Rate and review books (1–5 stars) with aggregated ratings

### Authentication & Authorization
- **Google SSO** — Single sign-on via Google OAuth 2.0 (optional, configurable)
- **Local Auth** — Email/password registration and login with bcrypt hashing
- **Demo Accounts** — One-click login as Admin, Librarian, or Member for quick testing
- **JWT Sessions** — Stateless token-based authentication
- **Role-Based Access Control**:
  - **Admin** — Full system access, user management, role assignment
  - **Librarian** — Book management, chapter management, check-in/check-out processing
  - **Member** — Browse catalog, read chapters, self-checkout, reviews, AI assistant

### AI Features
- **AI Chat Assistant (Athena)** — Conversational interface for library queries, book discovery, and catalog questions
- **Smart Search** — Natural language search ("dystopian novels about surveillance", "books for a rainy day")
- **Personalized Recommendations** — Based on borrowing history and reading preferences
- **Auto-Categorization** — AI suggests genres when adding new books
- Works with OpenAI API when configured, gracefully degrades to local intelligence without it

### Extra Features
- **Dashboard** — Stats cards, genre distribution charts (pie + bar), top-rated books, recent activity feed
- **Dark Mode** — Toggle between light and dark themes
- **Responsive Design** — Mobile-friendly sidebar navigation
- **Overdue Tracking** — Visual indicators for overdue books with day counts
- **Checkout Limits** — Members limited to 5 active checkouts
- **Excel Storage** — All data persisted in `.xlsx` files (books, users, transactions, reviews, chapters)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js, Express |
| Frontend | React 19, Vite |
| Styling | Tailwind CSS 3 |
| Charts | Recharts |
| Icons | Lucide React |
| Auth | Passport.js, JWT, bcryptjs |
| SSO | Google OAuth 2.0 |
| Storage | Excel via SheetJS (xlsx) |
| AI | OpenAI API (optional) |

## Quick Start

### Prerequisites
- Node.js 18+

### Installation

```bash
# Install server dependencies
npm install

# Install client dependencies
cd client && npm install && cd ..
```

### Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required:
- `JWT_SECRET` — Secret key for JWT tokens (change in production!)

Optional:
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Enable Google SSO
- `OPENAI_API_KEY` — Enable AI-powered features

### Running

```bash
# Start both server and client (concurrent)
npm run dev
```

Or separately:
```bash
npm run server   # Express API on :3001
npm run client   # Vite dev server on :5173
```

Open **http://localhost:5173** in your browser.

### Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@library.com | admin123 |
| Librarian | librarian@library.com | librarian123 |
| Member | member@library.com | member123 |

Use the "Quick Demo Access" buttons on the login page for one-click access.

## Data Storage

All data is stored in Excel files under `server/data/`:

| File | Contents |
|------|----------|
| `books.xlsx` | Book catalog with metadata |
| `chapters.xlsx` | Chapter content (number, title, summary, full text) per book |
| `users.xlsx` | User accounts and roles |
| `transactions.xlsx` | Check-in/check-out records |
| `reviews.xlsx` | Book reviews and ratings |

These files are auto-created and seeded on first run with 20 sample books, 23 chapters across 6 books, 3 demo users, and sample transactions.

## API Endpoints

### Auth
- `POST /api/auth/login` — Email/password login
- `POST /api/auth/register` — New user registration
- `POST /api/auth/demo` — Demo account login
- `GET /api/auth/google` — Google SSO initiation
- `GET /api/auth/me` — Current user profile

### Books
- `GET /api/books` — List/search books (with filtering, sorting, pagination)
- `GET /api/books/stats` — Catalog statistics
- `GET /api/books/:id` — Book details with reviews
- `POST /api/books` — Add book (staff only)
- `PUT /api/books/:id` — Update book (staff only)
- `DELETE /api/books/:id` — Delete book (admin only)
- `POST /api/books/:id/reviews` — Add review

### Chapters
- `GET /api/chapters/book/:bookId` — List chapters for a book (sorted by number)
- `GET /api/chapters/:id` — Single chapter with full content
- `POST /api/chapters` — Add chapter (staff only)
- `POST /api/chapters/bulk` — Bulk add chapters (staff only)
- `PUT /api/chapters/:id` — Update chapter (staff only)
- `DELETE /api/chapters/:id` — Delete chapter (staff only)
- `PUT /api/chapters/reorder/:bookId` — Reorder chapters (staff only)

### Content Search
- `GET /api/search?q=...&scope=all` — Global full-text search across books, chapters, and content

  Query parameters:
  - `q` — Search query (min 2 chars)
  - `scope` — `all`, `books`, `chapters`, or `content`
  - `page`, `limit` — Pagination

  Returns ranked results with snippets, match locations, occurrence counts, and stats.

### Transactions
- `GET /api/transactions` — List transactions
- `GET /api/transactions/stats` — Transaction statistics
- `POST /api/transactions/checkout` — Check out book (staff)
- `POST /api/transactions/checkin` — Return book (staff)
- `POST /api/transactions/self-checkout` — Member self-checkout

### Users
- `GET /api/users` — List users (staff only)
- `PUT /api/users/:id/role` — Change role (admin only)
- `PUT /api/users/:id/status` — Activate/deactivate (admin only)

### AI
- `GET /api/ai/status` — AI engine status
- `POST /api/ai/search` — Smart search
- `GET /api/ai/recommendations` — Personalized recommendations
- `POST /api/ai/chat` — Chat with Athena
- `POST /api/ai/categorize` — Auto-detect genre

## Project Structure

```
Library-Management/
├── server/
│   ├── index.js              # Express server + Passport config
│   ├── seed.js               # Initial data seeding (books, users, chapters)
│   ├── middleware/
│   │   └── auth.js           # JWT auth + role-based access
│   ├── routes/
│   │   ├── auth.js           # Authentication routes
│   │   ├── books.js          # Book CRUD + search
│   │   ├── chapters.js       # Chapter CRUD + bulk add + reorder
│   │   ├── search.js         # Global content search across all data
│   │   ├── transactions.js   # Check-in/check-out
│   │   ├── users.js          # User management
│   │   └── ai.js             # AI feature endpoints
│   ├── services/
│   │   ├── excel.js          # Excel read/write service (5 stores)
│   │   └── ai.js             # AI service (OpenAI + fallbacks)
│   └── data/                 # Auto-generated Excel files
├── client/
│   ├── src/
│   │   ├── App.jsx           # Router + protected routes
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── services/
│   │   │   └── api.js        # Axios API client
│   │   ├── components/
│   │   │   ├── Layout.jsx    # Sidebar + navbar
│   │   │   ├── BookCard.jsx  # Book display card
│   │   │   └── BookFormModal.jsx
│   │   └── pages/
│   │       ├── Login.jsx
│   │       ├── Dashboard.jsx
│   │       ├── Books.jsx         # Book catalog grid/list
│   │       ├── BookDetail.jsx    # Book detail + chapter viewer/editor
│   │       ├── ContentSearch.jsx # Global full-text search
│   │       ├── Transactions.jsx
│   │       ├── Users.jsx
│   │       └── AIAssistant.jsx
│   └── ...config files
├── .env.example
├── package.json
└── README.md
```
