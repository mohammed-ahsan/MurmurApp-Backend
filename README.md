# Murmur Backend API

A robust REST API backend for the Murmur social media application, built with Node.js, Express, TypeScript, and PostgreSQL.

## 🚀 Features

- **Authentication System**: JWT-based authentication with secure password hashing using bcrypt
- **User Management**: Complete user profiles with followers/following counts
- **Murmur Posts**: Create, read, update, and delete short posts (280 characters max)
- **Social Features**: Like murmur posts, follow/unfollow users
- **Notifications**: Real-time notifications for likes, follows, and replies
- **Reply System**: Threaded conversations and replies to murmurs
- **Search**: Search users by username or display name
- **Security**: Helmet for security headers, CORS, rate limiting, input validation
- **Database**: PostgreSQL with Prisma ORM for type-safe database operations

## 📋 Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: 
  - Helmet (security headers)
  - bcryptjs (password hashing)
  - express-rate-limit (rate limiting)
  - CORS (cross-origin resource sharing)
  - express-validator (input validation)
- **Logging**: Morgan
- **Development Tools**: Nodemon, ts-node

## 🔧 Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (v18 or higher)
- PostgreSQL (v13 or higher)
- npm or yarn
- Git

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/mohammed-ahsan/MurmurApp-Backend.git
   cd MurmurApp-Backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```bash
   cp .env.example .env
   ```
   
   Or create it manually with the following variables:
   ```env
   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/murmur_db?schema=public"
   POOLED_URL="postgresql://username:password@localhost:5432/murmur_db?pgbouncer=true&connect_timeout=15"
   
   # Server
   PORT=3000
   NODE_ENV=development
   
   # JWT
   JWT_SECRET=your_super_secret_jwt_key_here
   JWT_EXPIRES_IN=7d
   
   # Frontend URLs (for CORS)
   FRONTEND_URL=http://localhost:19006
   ```

4. **Set up the database**
   
   Make sure PostgreSQL is running and create the database:
   ```bash
   # Using psql
   psql -U postgres
   CREATE DATABASE murmur_db;
   \q
   ```
   
   Run database migrations:
   ```bash
   npm run db:migrate
   ```
   
   Generate Prisma client:
   ```bash
   npm run db:generate
   ```

   (Optional) Seed the database with test data:
   ```bash
   npm run db:seed
   ```

## 🏃 Running the Application

### Development Mode

Start the server with hot reload:
```bash
npm run dev
```

The server will run on `http://localhost:3000`

### Production Mode

Build the TypeScript code:
```bash
npm run build
```

Start the production server:
```bash
npm start
```

## 🔐 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with salt rounds for secure password storage
- **Rate Limiting**: Prevents brute force attacks
- **CORS**: Configured for specific frontend origins
- **Helmet**: Security headers for Express
- **Input Validation**: Request validation using express-validator
- **Environment Variables**: Sensitive data stored in .env files

## 🛠️ Available Scripts

```bash
# Development
npm run dev          # Start server in development mode with hot reload

# Production
npm run build        # Build TypeScript to JavaScript
npm start            # Start production server

# Database
npm run db:generate  # Generate Prisma client
npm run db:migrate   # Run database migrations
npm run db:push      # Push schema changes to database
npm run db:studio    # Open Prisma Studio (database GUI)
npm run db:seed      # Seed database with test data

# Testing
npm test             # Run tests
```

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Check if PostgreSQL is running
pg_isready

# Test database connection
psql -U username -d murmur_db

# Reset database (WARNING: This will delete all data)
npm run db:push
```

### Port Already in Use
```bash
# Find process using port 3000
netstat -ano | findstr :3000

# Kill the process (Windows)
taskkill /PID <PID> /F
```

### Migration Issues
```bash
# Reset migrations (WARNING: This will delete all data)
npm run db:push

# Or manually
npx prisma migrate reset
```

## 📝 Environment Variables Reference

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Yes | - |
| `POOLED_URL` | PostgreSQL connection string with pooling | No | - |
| `PORT` | Server port | No | 3000 |
| `NODE_ENV` | Environment mode | No | development |
| `JWT_SECRET` | Secret key for JWT tokens | Yes | - |
| `JWT_EXPIRES_IN` | JWT token expiration time | No | 7d |
| `FRONTEND_URL` | Frontend URL for CORS | No | http://localhost:19006 |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 👥 Author

**Mohammed Ahsan**
- GitHub: [@mohammed-ahsan](https://github.com/mohammed-ahsan)

## 🌐 Demo

Check out the live demo of the Murmur app: [YouTube Demo](https://youtube.com/shorts/TfPk1MvzgJg?feature=share)

## 🔗 Related Repositories

- **Frontend (React Native)**: [MurmurApp](https://github.com/mohammed-ahsan/MurmurApp)

---

Made with ❤️ by Mohammed Ahsan
