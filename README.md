# School Management System API

A comprehensive school management system backend for Ugandan primary and secondary schools with multi-tenant architecture.

## Features Implemented

### Core Infrastructure
- Express.js + TypeScript server
- PostgreSQL database with Prisma ORM
- JWT authentication with access and refresh tokens
- Role-based authorization middleware
- Email service with Nodemailer
- Cloudinary integration for file uploads
- Rate limiting and security middleware
- Comprehensive error handling

### Database Schema
Complete schema with 13 models including:
- Users (with role-based access)
- Schools (multi-tenant)
- Staff, Students
- Classes, Subjects, Subject Assignments
- Payments
- Resources (learning materials)
- Submissions (student work)
- Countries (curriculum data)
- Refresh Tokens

### Roles Supported
- SUPER_ADMIN - Manages all schools
- SCHOOL_ADMIN - Manages individual school
- TEACHER - Manages classes and resources
- ACCOUNTANT - Manages finances
- SECRETARY - Administrative tasks
- COOK, OTHER_STAFF - Other roles
- STUDENT - Access resources and submit work

### APIs Implemented

#### Authentication APIs (/api/auth)
- POST /register - Register new user
- POST /login - User login
- POST /refresh - Refresh access token
- POST /logout - User logout
- GET /profile - Get user profile

#### School Management APIs (/api/schools) - Super Admin
- POST / - Create new school with admin
- GET / - Get all schools (paginated, searchable)
- GET /:id - Get school details
- PUT /:id - Update school
- DELETE /:id - Delete school
- PATCH /:id/toggle-status - Activate/deactivate school

## Project Structure

```
backend/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── config/
│   │   ├── index.ts           # App configuration
│   │   ├── database.ts        # Prisma client
│   │   ├── cloudinary.ts      # Cloudinary setup
│   │   └── nodemailer.ts      # Email setup
│   ├── controllers/
│   │   ├── auth.controller.ts # Auth logic
│   │   └── school.controller.ts # School management
│   ├── middleware/
│   │   ├── auth.middleware.ts # JWT authentication
│   │   ├── authorize.middleware.ts # Role authorization
│   │   ├── error.middleware.ts # Error handling
│   │   └── validate.middleware.ts # Request validation
│   ├── routes/
│   │   ├── auth.routes.ts     # Auth endpoints
│   │   └── school.routes.ts   # School endpoints
│   ├── services/
│   │   └── email.service.ts   # Email templates
│   ├── utils/
│   │   ├── jwt.ts             # JWT utilities
│   │   └── password.ts        # Password hashing
│   ├── types/
│   │   └── index.ts           # TypeScript types
│   └── server.ts              # Main server file
├── .env                       # Environment variables
├── package.json
├── tsconfig.json
└── README.md
```

## Setup Instructions

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

1. Install dependencies:
```bash
cd backend
npm install
```

2. Configure environment variables:
Edit the `.env` file and update the following:

```env
# Database - Update with your PostgreSQL credentials
DATABASE_URL="postgresql://username:password@localhost:5432/schoolmanagement?schema=public"

# JWT Secrets - Generate strong secrets for production
JWT_ACCESS_SECRET=your_strong_secret_here
JWT_REFRESH_SECRET=your_strong_refresh_secret_here

# Cloudinary - Add your Cloudinary credentials
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email - Add your email service credentials
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
```

3. Generate Prisma client:
```bash
npm run prisma:generate
```

4. Run database migrations:
```bash
npm run prisma:migrate
```

5. Start development server:
```bash
npm run dev
```

The API will be available at http://localhost:5000

## Testing the API

### Health Check
```bash
curl http://localhost:5000/health
```

### Register Super Admin
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@schoolms.com",
    "password": "admin123",
    "firstName": "Super",
    "lastName": "Admin",
    "role": "SUPER_ADMIN"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@schoolms.com",
    "password": "admin123"
  }'
```

### Create School (requires Super Admin token)
```bash
curl -X POST http://localhost:5000/api/schools \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "name": "Example Primary School",
    "address": "Kampala, Uganda",
    "phone": "+256700000000",
    "email": "info@exampleschool.com",
    "level": "PRIMARY",
    "adminFirstName": "John",
    "adminLastName": "Doe",
    "adminEmail": "admin@exampleschool.com",
    "adminPassword": "school123"
  }'
```

## APIs Yet to be Implemented

### Staff Management (/api/staff)
- Create staff members with roles
- Assign teachers to classes and subjects
- Manage staff details and salaries

### Student Management (/api/students)
- CRUD operations for students
- Assign students to classes
- Track student details and parent info

### Class Management (/api/classes)
- Create classes for primary (P1-P7) and secondary (S1-S6)
- Assign class teachers
- Set fees per class

### Subject Management (/api/subjects)
- Create subjects based on Uganda curriculum
- Assign subjects to classes
- Assign teachers to subjects

### Finance Management (/api/payments)
- Record student payments
- Track balances
- Generate financial reports
- Class-wise financial performance

### Resource Management (/api/resources)
- Teachers upload learning materials
- Teachers create assignments
- Upload exams and holiday packages
- Students access resources

### Submission Management (/api/submissions)
- Students submit assignments
- Teachers grade submissions
- Provide feedback

### Reports & Analytics
- Student reports
- Financial reports
- School performance metrics

### File Upload Endpoints
- Upload images (avatars, logos)
- Upload documents (PDFs, Word files)
- Upload learning resources

## Next Steps

1. **Implement remaining controllers and routes:**
   - Staff controller + routes
   - Student controller + routes
   - Class controller + routes
   - Subject controller + routes
   - Payment controller + routes
   - Resource controller + routes
   - Submission controller + routes

2. **Add Uganda curriculum data:**
   - Seed primary classes (P1-P7)
   - Seed secondary classes (S1-S6)
   - Add subjects per level

3. **Implement file upload functionality:**
   - Multer middleware for file handling
   - Cloudinary upload utilities
   - File validation and size limits

4. **Add data seeding:**
   - Create seed script for demo data
   - Sample schools, users, students

5. **Testing:**
   - Unit tests with Jest
   - Integration tests for API endpoints
   - Test authentication and authorization

6. **Documentation:**
   - API documentation with Swagger
   - Postman collection

7. **Frontend Development:**
   - Next.js setup
   - Authentication flow
   - Dashboards for each role
   - Forms and data tables

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run database migrations
npm run prisma:studio    # Open Prisma Studio (DB GUI)
```

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| PORT | Server port | 5000 |
| NODE_ENV | Environment | development/production |
| DATABASE_URL | PostgreSQL connection string | postgresql://... |
| JWT_ACCESS_SECRET | Secret for access tokens | random_string |
| JWT_REFRESH_SECRET | Secret for refresh tokens | random_string |
| JWT_ACCESS_EXPIRY | Access token expiry | 15m |
| JWT_REFRESH_EXPIRY | Refresh token expiry | 7d |
| CLOUDINARY_CLOUD_NAME | Cloudinary cloud name | your_cloud |
| CLOUDINARY_API_KEY | Cloudinary API key | 123456789 |
| CLOUDINARY_API_SECRET | Cloudinary API secret | secret_key |
| EMAIL_HOST | SMTP host | smtp.gmail.com |
| EMAIL_PORT | SMTP port | 587 |
| EMAIL_USER | Email address | email@example.com |
| EMAIL_PASSWORD | Email app password | app_password |
| EMAIL_FROM | From address | School MS <noreply@schoolms.com> |
| FRONTEND_URL | Frontend URL | http://localhost:3000 |

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Authentication:** JWT
- **File Upload:** Cloudinary
- **Email:** Nodemailer
- **Validation:** express-validator
- **Security:** Helmet, CORS, Rate Limiting

## License

MIT

## Support

For issues or questions, contact the development team.
