# JobTracker - AI-Powered Job Application Manager

[![Next.js](https://img.shields.io/badge/Next.js-13-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Firebase](https://img.shields.io/badge/Firebase-9.0-orange)](https://firebase.google.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.0-blue)](https://tailwindcss.com/)

A modern, full-stack web application for tracking job applications with AI-powered features, automated email integration, and comprehensive analytics.

## ✨ Features

### 🎯 Core Functionality
- **Job Application Tracking**: Manage applications with status updates, notes, and timelines
- **Multiple View Modes**: Table view and Kanban board for different workflows
- **Advanced Filtering**: Search, filter by status, date ranges, and sorting options
- **Bulk Operations**: Select and manage multiple applications at once

### 🤖 AI-Powered Features
- **Resume Analysis**: AI-powered resume scoring against job descriptions using Google Gemini
- **Smart Recommendations**: Get personalized suggestions to improve your applications
- **Fallback Analysis**: Pattern-matching system when AI quotas are exceeded

### 📧 Email Integration
- **Gmail Auto-Import**: Automatically detect and import job applications from your email
- **Smart Parsing**: Extract company names, job titles, and application details
- **Confidence Scoring**: AI-powered confidence ratings for imported jobs

### 📊 Analytics & Insights
- **Application Dashboard**: Visual overview of your job search progress
- **Success Metrics**: Track response rates, interview conversion, and more
- **Data Cleanup Tools**: Merge duplicates and recategorize applications

### 🎨 User Experience
- **Responsive Design**: Optimized for desktop and mobile devices
- **Dark Mode Support**: Comfortable viewing in any lighting
- **Real-time Notifications**: Instant feedback for all actions
- **Accessible UI**: Built with accessibility best practices

## 🚀 Tech Stack

### Frontend
- **Framework**: Next.js 13 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: React Context API
- **Forms**: React Hook Form + Zod validation

### Backend
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth (Email/Password + Google OAuth)
- **File Storage**: Firebase Storage
- **API Routes**: Next.js serverless functions

### External Services
- **AI**: Google Gemini API for resume analysis
- **Email**: Gmail API for automated job import
- **Hosting**: Vercel (recommended)

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Firebase project
- Google Cloud project (for APIs)

### 1. Clone the Repository
```bash
git clone https://github.com/kingjaymane/job-Tracker-Webapp.git
cd job-Tracker-Webapp
```

### 2. Install Dependencies
```bash
npm install
# or
yarn install
```

### 3. Environment Configuration
Create a `.env.local` file in the root directory:

```bash
cp .env.example .env.local
```

Fill in your actual credentials:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY="your_firebase_api_key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project-id.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project-id.firebasestorage.app"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your_messaging_sender_id"
NEXT_PUBLIC_FIREBASE_APP_ID="your_firebase_app_id"

# Email Integration - Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"

# AI Integration - Google Gemini
GOOGLE_GEMINI_API_KEY="your_gemini_api_key"
```

### 4. Firebase Setup

#### Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /jobApplications/{document} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
  }
}
```

#### Authentication Methods
Enable the following in Firebase Console:
- Email/Password
- Google OAuth

### 5. Google Cloud APIs
Enable these APIs in Google Cloud Console:
- Gmail API
- Google Generative AI API

### 6. Run the Development Server
```bash
npm run dev
# or
yarn dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## 📱 Usage

### Getting Started
1. **Sign Up**: Create an account or sign in with Google
2. **Add Jobs**: Manually add job applications or connect your Gmail
3. **Analyze Resumes**: Use the AI-powered resume analyzer
4. **Track Progress**: Monitor your applications through the dashboard

### Key Features

#### Gmail Integration
1. Go to Email Integration section
2. Click "Connect Gmail"
3. Grant necessary permissions
4. Scan emails to auto-import job applications

#### Resume Analysis
1. Navigate to Resume Analyzer
2. Paste a job description
3. Upload or paste your resume
4. Get AI-powered feedback and scoring

#### Job Management
- **Add Jobs**: Use the "+" button or import from email
- **Update Status**: Drag and drop in Kanban view or use dropdowns
- **Bulk Actions**: Select multiple jobs for batch operations
- **Filter & Search**: Use the toolbar to find specific applications

## 🔧 Development

### Project Structure
```
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   └── page.tsx           # Main dashboard
├── components/            # React components
│   ├── ui/               # shadcn/ui base components
│   └── ...               # Feature components
├── contexts/             # React Context providers
├── lib/                  # Utility functions and services
├── hooks/                # Custom React hooks
└── ...
```

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Contributing
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Other Platforms
The app can be deployed to any platform supporting Next.js:
- Netlify
- Railway
- Render
- AWS Amplify

## 🔒 Security & Privacy

- **Data Protection**: All user data is isolated using Firebase security rules
- **Authentication**: Secure authentication with Firebase Auth
- **API Security**: Environment variables protect sensitive keys
- **Privacy**: Email data is processed securely and not stored unnecessarily

## 🤝 Support

- **Documentation**: Check this README and inline comments
- **Issues**: Report bugs via [GitHub Issues](https://github.com/kingjaymane/job-Tracker-Webapp/issues)
- **Discussions**: Ask questions in [GitHub Discussions](https://github.com/kingjaymane/job-Tracker-Webapp/discussions)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) for the amazing React framework
- [Firebase](https://firebase.google.com/) for backend services
- [shadcn/ui](https://ui.shadcn.com/) for beautiful UI components
- [Tailwind CSS](https://tailwindcss.com/) for utility-first styling
- [Google AI](https://ai.google.dev/) for Gemini API

---

**Built with ❤️ by [Jerhald Mercado](https://github.com/kingjaymane)**
