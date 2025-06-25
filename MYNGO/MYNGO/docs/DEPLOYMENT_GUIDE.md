# MYNGO - Deployment Guide

## Table of Contents
1. [Environment Setup](#environment-setup)
2. [Supabase Configuration](#supabase-configuration)
3. [Local Development](#local-development)
4. [Production Deployment](#production-deployment)
5. [Environment Variables](#environment-variables)
6. [Database Setup](#database-setup)
7. [Troubleshooting](#troubleshooting)

## Environment Setup

### Prerequisites
- **Node.js**: Version 18.0 or higher
- **npm**: Version 8.0 or higher (comes with Node.js)
- **Git**: For version control
- **Supabase Account**: Free tier available at [supabase.com](https://supabase.com)

### System Requirements
- **Memory**: Minimum 4GB RAM for development
- **Storage**: At least 1GB free space
- **Network**: Stable internet connection for real-time features

## Supabase Configuration

### 1. Create Supabase Project

1. Visit [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: `myngo-production` (or your preferred name)
   - **Database Password**: Generate a secure password
   - **Region**: Choose closest to your users
5. Click "Create new project"
6. Wait for project initialization (2-3 minutes)

### 2. Get Project Credentials

Once your project is ready:

1. Go to **Settings** → **API**
2. Copy the following values:
   - **Project URL**: `https://your-project-id.supabase.co`
   - **Anon Public Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 3. Configure Database Schema

The database schema is automatically applied through migrations. The following tables will be created:

- `rooms`: Game room data and configuration
- `players`: Player information and game state
- `called_numbers`: History of called bingo numbers
- `game_history`: Analytics and game completion data

### 4. Set Up Row Level Security (RLS)

RLS policies are automatically configured to allow:
- Public read/write access for game functionality
- Proper data isolation between games
- Secure real-time subscriptions

## Local Development

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd myngo

# Install dependencies
npm install
```

### 2. Environment Configuration

Create `.env.local` file in the project root:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Important**: Never commit `.env.local` to version control. The `.env.example` file shows the required format.

### 3. Start Development Server

```bash
# Start the development server
npm run dev
```

The application will be available at `http://localhost:5173`

### 4. Verify Setup

1. Open the application in your browser
2. Create a test room from the host setup page
3. Join the room from another browser tab/window
4. Test real-time functionality by calling numbers

## Production Deployment

### Option 1: Netlify (Recommended)

#### Automatic Deployment

1. **Connect Repository**:
   - Login to [Netlify](https://netlify.com)
   - Click "New site from Git"
   - Connect your Git repository

2. **Configure Build Settings**:
   ```
   Build command: npm run build
   Publish directory: dist
   ```

3. **Set Environment Variables**:
   - Go to Site Settings → Environment Variables
   - Add:
     ```
     VITE_SUPABASE_URL=https://your-project-id.supabase.co
     VITE_SUPABASE_ANON_KEY=your-anon-key-here
     ```

4. **Deploy**:
   - Click "Deploy site"
   - Netlify will automatically build and deploy your application

#### Manual Deployment

```bash
# Build the application
npm run build

# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy to Netlify
netlify deploy --prod --dir=dist
```

### Option 2: Vercel

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Deploy**:
   ```bash
   # Build the application
   npm run build
   
   # Deploy to Vercel
   vercel --prod
   ```

3. **Set Environment Variables**:
   - Go to Vercel dashboard
   - Navigate to your project settings
   - Add environment variables in the "Environment Variables" section

### Option 3: Custom Server

```bash
# Build the application
npm run build

# Serve the dist folder using any static file server
# Example with serve:
npx serve -s dist -l 3000
```

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | `https://abc123.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbGciOiJIUzI1NiIs...` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_APP_TITLE` | Application title | `MYNGO` |
| `VITE_DEBUG_MODE` | Enable debug logging | `false` |

### Environment Files

- `.env.local`: Local development (not committed)
- `.env.example`: Template file showing required variables
- Production: Set via deployment platform (Netlify, Vercel, etc.)

## Database Setup

### Automatic Migration

The database schema is automatically applied when you first access the application. The migration files in `supabase/migrations/` contain:

1. **Initial Schema**: Tables, indexes, and constraints
2. **RLS Policies**: Security rules for data access
3. **Functions**: Database functions for game logic

### Manual Migration (if needed)

If you need to manually apply migrations:

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Login and link project:
   ```bash
   supabase login
   supabase link --project-ref your-project-id
   ```

3. Apply migrations:
   ```bash
   supabase db push
   ```

### Database Monitoring

Monitor your database usage in the Supabase dashboard:
- **Database** → **Usage**: Check storage and connection limits
- **Database** → **Logs**: Monitor query performance
- **Auth** → **Users**: Track user activity (if auth is enabled)

## Troubleshooting

### Common Issues

#### 1. Environment Variables Not Loading

**Symptoms**: Application shows connection errors
**Solution**:
```bash
# Verify environment variables are set
echo $VITE_SUPABASE_URL
echo $VITE_SUPABASE_ANON_KEY

# Restart development server after adding variables
npm run dev
```

#### 2. Real-time Features Not Working

**Symptoms**: Players don't see live updates
**Solution**:
- Check Supabase project status in dashboard
- Verify RLS policies are correctly applied
- Check browser console for WebSocket errors
- Ensure network allows WebSocket connections

#### 3. Build Failures

**Symptoms**: `npm run build` fails
**Solution**:
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for TypeScript errors
npm run lint

# Build with verbose output
npm run build -- --verbose
```

#### 4. Database Connection Issues

**Symptoms**: "Failed to connect to database" errors
**Solution**:
- Verify Supabase project is active (not paused)
- Check project URL and API key are correct
- Ensure project has not exceeded free tier limits
- Check Supabase status page for service issues

### Performance Optimization

#### 1. Enable Gzip Compression

For custom deployments, enable gzip compression:
```nginx
# Nginx configuration
gzip on;
gzip_types text/css application/javascript application/json;
```

#### 2. CDN Configuration

For better global performance:
- Use Netlify's global CDN (automatic)
- Or configure CloudFlare for custom deployments

#### 3. Database Optimization

Monitor and optimize database performance:
- Check slow query logs in Supabase dashboard
- Add indexes for frequently queried columns
- Monitor connection pool usage

### Security Considerations

#### 1. Environment Variables

- Never commit `.env.local` to version control
- Use different Supabase projects for development and production
- Rotate API keys periodically

#### 2. RLS Policies

- Review RLS policies in Supabase dashboard
- Test data access with different user scenarios
- Monitor for unauthorized access attempts

#### 3. CORS Configuration

Supabase automatically handles CORS for your domain. For custom domains:
- Add your domain to Supabase project settings
- Configure proper CORS headers

### Support Resources

- **Supabase Documentation**: [docs.supabase.com](https://docs.supabase.com)
- **React Documentation**: [react.dev](https://react.dev)
- **Vite Documentation**: [vitejs.dev](https://vitejs.dev)
- **Tailwind CSS**: [tailwindcss.com](https://tailwindcss.com)

### Monitoring and Analytics

#### Application Monitoring

- Use browser developer tools for client-side debugging
- Monitor Supabase dashboard for database performance
- Set up error tracking (Sentry, LogRocket, etc.) for production

#### Game Analytics

The application automatically tracks:
- Game completion rates
- Player engagement metrics
- Performance statistics
- Error rates and types

Access analytics through the `game_history` table in your Supabase dashboard.

This deployment guide ensures a smooth setup process for both development and production environments, with comprehensive troubleshooting support for common issues.