# Full-Stack Authentication System

A production-ready authentication system built with React, Node.js, Express, and MongoDB (Azure Cosmos DB). Features modern UI/UX, secure JWT authentication, and comprehensive user management.

## 🚀 Features

### Frontend
- **Modern Authentication UI** - Beautiful, responsive login/register forms with glassmorphism design
- **Form Validation** - Real-time validation with visual feedback
- **Password Strength Indicator** - Visual password strength meter
- **Protected Routes** - Route-based authentication with automatic redirects
- **Responsive Design** - Mobile-first design that works on all devices
- **Loading States** - Smooth loading animations and transitions
- **Error Handling** - Comprehensive error handling with user-friendly messages

### Backend
- **Express Server** - RESTful API with proper middleware setup
- **MongoDB Integration** - Azure Cosmos DB with Mongoose ODM
- **JWT Authentication** - Access and refresh token implementation
- **Password Security** - bcrypt hashing with salt rounds
- **Input Validation** - Server-side validation using express-validator
- **Rate Limiting** - Protection against brute force attacks
- **CORS Configuration** - Proper cross-origin resource sharing setup
- **Security Headers** - Helmet.js for security best practices

### Security Features
- **Password Hashing** - bcrypt with 12 salt rounds
- **JWT Tokens** - Secure token generation and validation
- **HTTP-Only Cookies** - Secure token storage
- **Rate Limiting** - API protection against abuse
- **Input Sanitization** - Protection against injection attacks
- **CORS Protection** - Controlled cross-origin requests

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, React Router
- **Backend**: Node.js, Express.js, TypeScript
- **Database**: MongoDB (Azure Cosmos DB)
- **Authentication**: JWT, bcryptjs
- **Validation**: express-validator
- **Icons**: Lucide React
- **Development**: Vite, Concurrently, Nodemon

## 📦 Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- MongoDB connection string (Azure Cosmos DB provided)

### Quick Start

1. **Clone and Install**
   ```bash
   npm install && npm run dev
   ```

   This single command will:
   - Install all dependencies
   - Start both frontend and backend servers concurrently
   - Frontend runs on `http://localhost:5173`
   - Backend runs on `http://localhost:5000`

### Manual Setup

If you prefer to run services separately:

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   The `.env` file is already configured with your Azure MongoDB connection string.

3. **Start Development Servers**
   ```bash
   # Start both frontend and backend
   npm run dev

   # Or start them separately
   npm run dev:frontend  # Frontend only
   npm run dev:backend   # Backend only
   ```

## 🗄️ Database Configuration

The application is pre-configured to connect to your Azure Cosmos DB instance:

```
Connection String: mongodb://jesus321:KQH4EeDffP7vJDG34Ab9ZI2l7aXp7GbEC8H0CSFxedd5vqGDbMezEm87XbhPKmVBE2P2xjThaOkSACDb5uO3cw==@jesus321.mongo.cosmos.azure.com:10255/?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@jesus321@
```

The database will automatically create the necessary collections when you register your first user.

## 🔐 API Endpoints

### Authentication Routes (`/api/auth`)

- **POST** `/register` - Register a new user
- **POST** `/login` - Login user
- **GET** `/me` - Get current user (protected)
- **POST** `/logout` - Logout user (protected)
- **POST** `/refresh` - Refresh access token

### Request Examples

**Register:**
```json
POST /api/auth/register
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Login:**
```json
POST /api/auth/login
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

## 🎨 UI Components

### Pages
- **Login Page** - Secure login with email/password
- **Register Page** - Registration with validation
- **Dashboard** - Protected user dashboard

### Features
- Form validation with real-time feedback
- Password strength indicator
- Loading states and animations
- Error handling with user-friendly messages
- Responsive design for all screen sizes

## 🔒 Security Implementation

### Password Requirements
- Minimum 6 characters
- At least one lowercase letter
- At least one uppercase letter
- At least one number

### JWT Configuration
- Access tokens expire in 24 hours
- Refresh tokens expire in 7 days
- HTTP-only cookies for secure storage
- Automatic token refresh functionality

### Rate Limiting
- General API: 100 requests per 15 minutes
- Auth endpoints: 5 requests per 15 minutes

## 🚀 Deployment

### Frontend Build
```bash
npm run build
```

### Environment Variables for Production
Update the `.env` file with production values:
- Set `NODE_ENV=production`
- Update `FRONTEND_URL` to your production domain
- Use strong JWT secrets
- Configure proper CORS origins

## 📁 Project Structure

```
/
├── backend/
│   ├── config/
│   │   └── database.js          # MongoDB connection
│   ├── middleware/
│   │   └── auth.js              # Authentication middleware
│   ├── models/
│   │   └── User.js              # User model
│   ├── routes/
│   │   └── auth.js              # Authentication routes
│   └── server.js                # Express server
├── src/
│   ├── components/
│   │   ├── Dashboard.tsx        # User dashboard
│   │   ├── LoadingSpinner.tsx   # Loading component
│   │   ├── Login.tsx            # Login form
│   │   ├── ProtectedRoute.tsx   # Route protection
│   │   └── Register.tsx         # Registration form
│   ├── context/
│   │   └── AuthContext.tsx      # Authentication context
│   ├── App.tsx                  # Main app component
│   ├── index.css                # Tailwind styles
│   └── main.tsx                 # App entry point
├── .env                         # Environment variables
├── package.json                 # Dependencies and scripts
└── README.md                    # This file
```

## 🧪 Testing the Application

1. **Start the application**: `npm run dev`
2. **Register a new user** at `http://localhost:5173/register`
3. **Login** with your credentials
4. **Access the dashboard** to view your profile
5. **Test logout** functionality

## 🛡️ Security Best Practices Implemented

- ✅ Password hashing with bcrypt
- ✅ JWT token authentication
- ✅ HTTP-only cookies
- ✅ Input validation and sanitization
- ✅ Rate limiting
- ✅ CORS protection
- ✅ Security headers with Helmet
- ✅ Environment variable management
- ✅ Protected routes
- ✅ Secure error handling

## 🤝 Contributing

This is a complete, production-ready authentication system. Feel free to extend it with additional features such as:
- Email verification
- Password reset functionality
- Two-factor authentication
- Social login integration
- User profile management
- Admin panel

## 📝 License

This project is open source and available under the MIT License.