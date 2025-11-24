# HAULT - Backend API

A secure Node.js/Express API for managing file storage on your local network.

## Project Structure

```
backend/
├── server.js                 # Main server entry point
├── package.json             # Dependencies
├── .env                     # Environment variables (create from .env.example)
├── db/
│   └── config.js           # Database configuration & schema
├── middleware/
│   └── auth.js             # JWT authentication middleware
├── routes/
│   ├── auth.js             # Authentication routes (register/login)
│   ├── files.js            # File management routes
│   └── users.js            # User profile routes
├── storage/                 # File storage directory (auto-created)
│   ├── thumbnails/         # Image thumbnails
│   └── user_*/             # User-specific directories
└── data/
    └── storage.db          # SQLite database (auto-created)
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and update the `JWT_SECRET` with a secure random string:

```
JWT_SECRET=$(openssl rand -base64 32)
```

### 3. Start the Server

**Development mode (with auto-restart):**

```bash
npm run dev
```

**Production mode:**

```bash
npm start
```

The server will start on `http://localhost:3001` (or your configured PORT).

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/verify` - Verify token

### Files

- `POST /api/files/upload` - Upload files (requires auth)
- `GET /api/files` - Get all user files (requires auth)
- `GET /api/files/download/:id` - Download file (requires auth)
- `DELETE /api/files/:id` - Delete file (requires auth)

### Users

- `GET /api/users/profile` - Get user profile with stats (requires auth)

## Testing the API

### Register a user

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Login

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }'
```

### Upload a file

```bash
curl -X POST http://localhost:3001/api/files/upload \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "files=@/path/to/your/file.jpg"
```

## Security Features

- ✅ JWT-based authentication
- ✅ Password hashing with bcrypt
- ✅ Rate limiting (100 requests per 15 minutes)
- ✅ Helmet.js security headers
- ✅ CORS configuration
- ✅ User-specific file access control
- ✅ File size limits (500MB)

## Next Steps

1. ✅ Backend API is complete
2. 🔄 Build the frontend React application
3. 🔄 Add HTTPS support with self-signed certificates
4. 🔄 Implement file sharing between users
5. 🔄 Add video transcoding for streaming
6. 🔄 Implement search and tagging

## Notes

- The database and storage directories are created automatically on first run
- Thumbnails are generated automatically for image uploads
- Files are organized by user ID to prevent conflicts
- All file operations require authentication
