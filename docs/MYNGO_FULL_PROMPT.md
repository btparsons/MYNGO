# MYNGO \- Real-time Webinar Engagement Game

## Project Overview

Create a visually STUNNING real-time webinar engagement game called MYNGO that will wow hackathon judges immediately. This application will be deployed to MYNGO.ai and must be fully functional and production-ready.

## Critical Build Instructions

**CRITICAL BUILD INSTRUCTIONS:** Build this entire application in ONE CONTINUOUS FLOW without stopping. Read all requirements first, then implement everything systematically. Auto-fix any errors and continue building. Only stop for true blocking issues. Do not ask for confirmation between sections \- build everything from start to finish in a single uninterrupted process.

**When implementing:** Use sensible defaults for any ambiguous details. Prioritize visual polish and smooth performance. Every decision should optimize for the "wow factor" that will impress hackathon judges.

### Specific Overrides for This Build

- **Component length:** Allow up to 400 lines for complex game components (BingoCard, HostDashboard)  
- **Planning:** Skip approval requests \- implement all features directly as this must complete in one build  
- **Dark mode:** Already default per system settings, focus on glassmorphism and neon accents  
- **Icons:** Use lucide-react for ALL icons (no custom SVGs unless for logo)  
- **Debugging:** Fix errors inline without extensive logging \- prioritize completion

### Alignment with Project Standards

- **"Beautiful and stunning" means:** Premium glassmorphism, smooth animations, particle effects, and visual polish that screams "$99/month SaaS"  
- **"Wow factor" implementation:** Every interaction should delight \- hover effects, micro-animations, satisfying feedback  
- **Production-ready:** Handle errors gracefully, optimize performance, ensure reliability

## Step 1: Visual Design Requirements

### Core Design System

- Dark mode with rich blacks (`#0A0A0B`, `#13131A`)  
- Neon accent colors: Electric purple (`#8B5CF6`), Cyan (`#06B6D4`), Pink (`#EC4899`)  
- Glassmorphism effects with backdrop-blur and subtle borders  
- Smooth spring animations using CSS transitions  
- Gradient mesh backgrounds with floating animated elements  
- Premium feel comparable to Stripe or Linear.app

### Critical Polish Elements

- Animated gradient backgrounds (purple → pink → blue → cyan)  
- Floating MYNGO balls with parallax mouse effects  
- Large, bold typography with gradient text effects  
- Glass-morphism cards with hover lift effects  
- Smooth scroll animations with intersection observer  
- CTA buttons with glow effects and micro-interactions  
- Loading states with skeleton screens  
- Error states with friendly animations

## Step 2: Application Structure

### Landing Page

Create stunning hero section:

- **Tagline:** "Transform Your Webinars Into Experiences" (gradient text)  
- **Live counters:** Active games and players (animate on load)  
  - Shows total number of games currently active  
  - Shows total number of players across all games  
  - System capacity indicator (e.g., "153 spots available") Real-time room availability  
- **Historical peak counters below** (persistent high scores)  
  - Highest number of concurrent games  
  - Highest number of concurrent players  
- Two glass CTAs: "Host a Game" / "Join a Game"  
- Features grid with glass cards  
- Floating background elements

### Host Flow Screens

#### Host Setup (3 steps)

1. **Game Settings**  
     
   - Question mark/help button at top for dropdown guide  
   - "Try Demo Mode First" recommendation message  
   - **Expected Players Slider** (10-500 players)  
     - Important for analytics to compare expectations vs actual  
     - Sets baseline but allows overflow  
   - **Meeting Duration Slider**  
     - Text shows 15 min increments  
     - Slider moves in 5 min increments (15-90 minutes)  
     - Auto-calculate optimal call frequency display  
   - **Auto-Call Frequency Calculator Display:**

```
Example: 10 players, 15 minute meeting
- Calls needed for 99% win probability: ~40
- Recommended interval: 20 seconds
- Buffer time included: 10%
```

   - Auto-close timer option  
     - "Automatically end game after X minutes"  
     - Helps hosts not forget during long meetings  
   - Demo mode checkbox with explanation  
   - Help tooltips on all options  
   - "Quick Setup Guide" button that triggers popup  
   - Quick Setup Guide Popup (Glass-morphism modal)

   

2. **Review Settings**  
     
   - Configuration summary  
   - Back/Create Room buttons

   

3. **Room Created**  
     
   - Success animation  
   - Large room code display  
   - Copy functionality  
   - Start Dashboard button

#### Host Dashboard

**Central Control Panel (Main Focus Area)**

- Giant glowing "CALL NUMBER" button (manual mode)  
  - Pulses to draw attention  
  - Shows "CALLING..." during reveal animation  
  - Disabled during auto-mode unless paused  
- Auto-Call Mode Toggle Section:  
  - Toggle switch: "Manual" / "Auto"  
  - When Auto is enabled:  
    - Interval selector appears (10s, 20s, 30s, 45s, 60s, 90s)  
    - "PAUSE" button becomes prominent (yellow/amber)  
    - Countdown timer shows "Next call in: 17s"  
    - "SKIP TO NEXT" button for immediate call  
  - When Paused:  
    - "RESUME" button (green) replaces pause  
    - "CALL NUMBER" button re-enables for manual calls  
    - Timer shows "PAUSED" status  
- Mode Indicator Badge:  
  - "MANUAL MODE" or "AUTO MODE \- 30s"  
  - Visual state clearly shown at all times  
- Last Called Number Display:  
  - Large display showing most recent: "G-54"  
  - Subtle animation when new number appears

**Top Control Bar (Always Visible)**

- **Room Code Display** (Large, center) \- Always visible for reference  
- Room Status Section:  
  - "Players: 23/50" with live updates  
  - "OPEN ROOM" / "CLOSE ROOM" toggle button  
    - Green when open, red when closed  
    - When closed: "Room Closed (23 players)"  
    - Prevents new players from joining when closed  
  - Sound toggle icon (speaker with slash when muted)  
- Cancel Game Button (far right, subtle red):  
  - Requires confirmation click  
  - Opens cancellation reason modal

**Central Dashboard Display:**

- **Game Statistics Panel:**  
  - Numbers called: "32/75"  
  - Near wins: "2 players 1 away\!"  
  - Progress bar showing % to completion  
  - Active players count  
- **Auto-Call Status Section:**  
  - Current mode indicator (AUTO/MANUAL)  
  - Countdown timer: "Next call in: 17s"  
  - Big "PAUSE" button to switch to manual  
  - In manual mode: Big red "CALL NUMBER" button  
  - Message: "Press PAUSE to enter manual mode"

**Game Cancellation Modal (Glass-morphism overlay)** Title: "Why are you ending this game?"

Cancellation Reasons:

1. **"Time Constraints"** \- When selected:  
     
   - Shows "Finding closest winners..."  
   - Displays ranked list of players by:  
     - Most numbers marked on their card  
     - Most potential winning patterns  
   - Message: "Screenshot this list for prize distribution"  
   - Allows host to award prizes fairly

   

2. **"Technical Issues"** \- When selected:  
     
   - Shows disclaimer: "Due to technical difficulties, neither the host nor MYNGO developers are responsible for prize distribution"  
   - Confirms cancellation

   

3. **"Testing/Demo Mode"** \- Quick graceful exit  
     
4. **"Other"** \- When selected:  
     
   - Text input appears (30 character limit / \~5 words)  
   - Placeholder: "Brief reason..."

Confirm/Cancel buttons at bottom

**Automatic Cancellation:**

- If host connection lost for 30+ seconds  
- Game marked as "Connection Aborted"  
- All players notified immediately  
- This reason is system-generated, not selectable

**Control Flow Logic:**

- Manual Mode: Only "CALL NUMBER" button active  
- Auto Mode Running: Pause and Skip buttons active, Call disabled  
- Auto Mode Paused: All buttons active (Resume, Call, Skip)  
- Clear visual states for each mode prevent confusion

### Player Flow Screens

#### Join Game

1. Enter room code  
2. Choose nickname (with suggestions)  
3. Join confirmation

#### Player Game View

- **Top Bar:**  
  - "Leave Game" button (top left)  
  - Welcome message: "Welcome \[Name\]\!"  
  - Connection status indicator  
  - Numbers marked: "12/24 marked"  
- **MYNGO Card (Center):**  
  - 5x5 grid with glassmorphism  
  - Called numbers highlight automatically  
  - Click to mark highlighted numbers  
  - WILD space in center (pre-marked)  
  - Numbers disappear when marked  
- **Called Numbers Panel (Right side):**  
  - Most recent number at top (larger display)  
  - History list below with:  
    - Number called  
    - Green dot if on your card  
    - Timestamp  
  - Helps late joiners catch up  
  - Collapsible on mobile  
- **Game Status:**  
  - Progress indicator  
  - "So Close\!" banner (yellow) when 1 away  
  - MYNGO button appears at bottom when winning pattern achieved  
  - First click wins in case of ties

### End Game Screens

- Victory celebration (confetti, animations)  
- Game complete summary  
- Cancellation screen (if applicable)

## Step 3: User Experience Flows

### Host Journey

1. **Landing:** Immediately captivated by animated gradient background and floating MYNGO balls  
2. **Click "Host a Game"** → Smooth transition with glass card sliding up  
3. **Setup:** Three effortless steps with progress indicator  
   - Choose settings (capacity, auto-call) with helpful tooltips  
   - Review configuration with visual preview  
   - Success animation reveals room code with confetti micro-burst  
4. **Dashboard:** Command center feeling with:  
   - Massive room code always visible  
   - Satisfying "CALL NUMBER" button that pulses for attention  
   - Live player avatars animating in as they join  
   - Real-time progress tracking with visual indicators  
5. **Number calling:** Dramatic 3-second reveal with particle explosion  
6. **Winner moment:** Epic celebration sequence all players see

### Player Journey

1. **Landing:** Same stunning first impression  
2. **Join:** Glass card with glowing input field for room code  
   - Live validation (green \= valid format)  
   - Smooth transition to nickname screen  
   - Playful nickname suggestions appear  
3. **Waiting:** "Generating your card..." with preview animation  
4. **Game:** Immersive experience with:  
   - MYNGO card as hero element with glassmorphism  
   - Numbers glow on hover, satisfying pop when marked  
   - Called numbers panel shows history  
   - Progress meter builds excitement  
   - MYNGO button appears and pulses when winning  
5. **Victory:** Full-screen celebration with confetti and sound

### Key UX Principles

- Every click provides immediate visual feedback  
- Transitions use spring physics for natural feel  
- Error states are friendly, never frustrating  
- Loading states are beautiful, not boring  
- Success moments feel celebratory  
- The game should be addictively fun to play

## Step 4: BINGO Game Logic

### Server-Side Logic

Use Supabase Edge Functions for:

- Secure room code generation  
- Card generation (prevent tampering)  
- Win validation  
- Fair number calling algorithm for bingo-like game

### Card Generation

**CRITICAL MYNGO Card Layout Instructions**

Card Structure \- EXACTLY 5x5 Grid:

- 5 COLUMNS labeled M-Y-N-G-O (left to right)  
- 5 ROWS of numbers (top to bottom)  
- Numbers run VERTICALLY down each column, NOT horizontally

**EXPLICIT Column Layout:**

- Column 1 (M): Contains 5 numbers from 1-15, reading TOP to BOTTOM  
- Column 2 (Y): Contains 5 numbers from 16-30, reading TOP to BOTTOM  
- Column 3 (N): Contains 4 numbers from 31-45 plus WILD in center space  
- Column 4 (G): Contains 5 numbers from 46-60, reading TOP to BOTTOM  
- Column 5 (O): Contains 5 numbers from 61-75, reading TOP to BOTTOM

**Visual Example of Correct Layout:**

```
M    Y    N    G    O
3    22   31   48   65   <- Row 1
8    18   44   52   71   <- Row 2
12   29   WILD 59   67   <- Row 3 (center)
1    25   40   46   73   <- Row 4
14   16   33   55   62   <- Row 5
```

**IMPORTANT:** Each column must be populated with its own numbers BEFORE moving to the next column. Do NOT fill row by row. Fill the entire M column first, then Y column, etc.

**CSS Grid Implementation Note:** Use CSS Grid with grid-auto-flow: column to ensure proper vertical population. Numbers must be placed in column order: M1-M5, then Y1-Y5, then N1-N5, etc.

### Win Detection

- Check horizontal, vertical, diagonal lines  
- Real-time validation  
- Require manual MYNGO click

### Auto-Call Timing Algorithm

**Dynamic Interval Calculation:**

```javascript
// Example calculation
players       = 10;
meetingMins   = 15;
buffer        = 0.90;  // 10% time buffer
calls99       = Math.round(45 - 0.5 * players);  // ≈ 40 calls
intervalSecs  = (meetingMins * 60 * buffer) / calls99; // ≈ 20.25s
```

Calculate optimal calling frequency based on:

- Expected number of players (affects probability)  
- Meeting duration selected by host  
- 99% probability of winner threshold  
- 10% time buffer for safety  
- Minimum 5 seconds between calls, maximum 90 seconds  
- Display calculation to host during setup

## Step 5: Technical Implementation

### Database & Backend Setup

- Use Supabase for real-time database (free tier supports 500 concurrent connections)  
- Tables needed:  
  - `rooms` (id, code, host\_id, config, status, created\_at)  
  - `players` (id, room\_id, name, card, marked\_numbers, joined\_at)  
  - `called_numbers` (id, room\_id, number, called\_at)  
  - `game_events` (id, room\_id, type, data, created\_at)  
- Real-time subscriptions for live updates  
- Row Level Security policies for data protection

### System Capacity Management

- Maximum 10 concurrent game rooms  
- Maximum 500 total players across all rooms  
- Auto-cleanup of inactive rooms after 30 minutes  
- New room creation blocked at system capacity  
- Graceful "Server Full" messages  
- Real-time capacity tracking  
- Automatic room recycling for abandoned games

### Real-Time Architecture

- Supabase real-time subscriptions for:  
  - Player joins/leaves  
  - Number calls  
  - Win claims  
  - Game status changes  
- Optimistic UI updates with reconciliation  
- Connection state management  
- Automatic reconnection with exponential backoff

### State Management

- React Query for server state  
- Zustand/Context for UI state  
- Subscription cleanup on unmount  
- Cache invalidation strategies

Use React hooks and context for:

- Game state (room data, called numbers)  
- Player state (card, marked numbers)  
- Connection state  
- UI state (modals, animations)

**Game State Structure** The room/game state should track:

- Unique 6-character room code  
- Host identifier  
- Game status (waiting, active, completed, or cancelled)  
- Configuration settings including capacity limit and auto-call preferences  
- Map of all players with their data  
- Array of called numbers in order  
- Winner information when game ends  
- Timestamps for game start and end

**Player State Structure** Each player record should maintain:

- Unique identifier  
- Display name (validated for uniqueness)  
- Their MYNGO card as a 5x5 grid  
- Set of numbers they've marked  
- Connection status  
- Join timestamp

### Real-Time Sync

- Polling every 2 seconds  
- Optimistic UI updates  
- State reconciliation  
- Connection recovery

### Data Storage

- Use localStorage for game state  
- Session storage for player data  
- No backend required for MVP  
- Clean up after 30 minutes (demo mode)

### Error Handling

- Network disconnection recovery with exponential backoff  
- Graceful degradation for slow connections  
- User-friendly error messages with retry options  
- Fallback UI for failed operations  
- Input validation with helpful feedback

### Security Measures

- Sanitize all user inputs (names, room codes)  
- Rate limiting on room creation (client-side)  
- Unique room code generation (avoid collisions)  
- XSS prevention on displayed content  
- Session timeout after 2 hours

### Performance Optimizations

- React.memo for card components  
- Debounced number clicking  
- Lazy load sound effects  
- Virtual scrolling for large player lists  
- RequestAnimationFrame for animations  
- CSS containment for better rendering

## Step 6: Features Implementation

### Room Management

- Create room with 6-character codes (no ambiguous characters)  
- Room capacity limits and controls  
- Open/close room functionality  
- Auto-close timer option  
- Graceful game cancellation with reasons

### Game Mechanics

- Manual number marking only  
- Called number history  
- Near-win detection ("1 away\!")  
- First-click wins for ties  
- Victory celebration sequence

**Winner Announcement System** When MYNGO is confirmed:

- All players receive full-screen overlay  
- Host dashboard shows prominent winner banner

**Winner Overlay for All Players (Glass-morphism modal):**

- Confetti animation explosion  
- "🎉 MYNGO\! We Have a Winner\!"  
- "\[Player Name\] wins\!" (ensure name fits in card)  
- Their winning pattern highlighted  
- Duration played: "23 minutes"  
- Numbers called: "47 numbers"  
- Fade in with celebration sound  
- Auto-dismiss after 8 seconds or click  
- Stays up 30 seconds for host (screenshot time)

**Host Winner Notification:**

- Dashboard flashes gold briefly  
- Winner card appears center screen  
- Options: "Confirm & End Game" or "Continue Playing"  
- If continue: "Playing for 2nd place" mode

### Host Controls

- **Player Card Viewing:**  
  - Click any player name to see their card  
  - View what numbers they've marked  
  - Check their progress toward winning  
- **Manual/Auto calling modes:**  
  - Pause button switches between modes  
  - Manual mode for presentation timing control  
  - "Use PAUSE button to enter manual mode" message  
- **Game Statistics Display:**  
  - Players in room  
  - Numbers called out of 75  
  - Near wins tracking  
  - Progress percentage  
- **Cancel game with reason selection**  
- **Real-time player list** (right sidebar)

### Player Features

- **Late join support** with full called numbers history  
- **Visual feedback for marking:**  
  - Numbers highlight when called  
  - Click to mark (number disappears)  
  - Can only mark called numbers  
  - Green dot indicators in history  
- **Connection status indicator**  
- **"Leave Game" button** (top of screen)  
- **Responsive card layout**  
- **Name selection:**  
  - Can use own name or suggested names  
  - Character limit to fit in winner card

## Step 7: Polish & Delight

### Animations

- Number reveal: 3D flip with glow  
- Card entrance: Stagger with spring  
- Marking: Satisfying pop effect  
- Victory: Screen shake \+ confetti  
- Transitions: Smooth 60fps

### Sound Design

- Toggleable sound effects  
- Number marking: Soft pop  
- Near win: Ascending chime  
- Victory: Epic orchestral hit  
- Ambient: Soft background music

### Responsive Design

- Mobile-first approach  
- Touch gestures for marking  
- Landscape optimization  
- Pinch to zoom on cards  
- Collapsible panels

## Step 8: Production Configuration

### Deployment Ready

- Configure for MYNGO.ai domain  
- Meta tags and SEO optimization  
- Social sharing previews  
- PWA capabilities  
- Cross-browser compatibility

### Game Analytics & History

**Data Collection (Every 5 minutes during game):**

- Current players online  
- Players who joined  
- Players who left (names preserved)  
- Participation metrics

**Game History Tracking:**

- Game ID and room code  
- Number of calls made  
- Total game duration  
- Completion status (completed/cancelled/aborted)  
- Cancellation reason if applicable  
- Demo mode flag  
- Host can download report at game end

**Demo Mode Data Handling:**

- All demo data auto-deleted after 30 minutes  
- No persistent storage for demo games  
- Separate tracking from real games

**Future Features (Mentioned but not in MVP):**

- Host login system for historical access  
- Backend data entry for post-game info  
- Email report delivery (premium feature)  
- Extended analytics dashboard

## Step 9: Demo Mode

### Interactive Tutorial Mode

- 8-12 bot players with diverse behaviors  
- Bots join at staggered intervals (simulating real arrivals)  
- Mix of player types:  
  - "Sarah\_Quick" \- marks numbers immediately  
  - "Mike\_Slow" \- takes 3-5 seconds to mark  
  - "Emma\_Chatty" \- shows emoji reactions  
  - "David\_AFK" \- misses some numbers  
  - "Lisa\_Lucky" \- always close to winning  
  - "James\_Newbie" \- joins late  
  - "Amy\_Keen" \- marks wrong numbers occasionally (then corrects)  
  - "Carlos\_Pro" \- optimal player behavior

### Tutorial Overlay for Host

- First-time host sees glass tooltips:  
  1. "This is your room code \- players need this to join"  
  2. "Watch players arrive in real-time here"  
  3. "Click here to call numbers (or use auto-mode)"  
  4. "Monitor player progress \- see who's close\!"  
  5. "Click any player to view their card"  
- Tooltips dismiss on interaction  
- "Skip tutorial" option available

### Bot Behaviors

- Realistic marking delays (1-5 seconds)  
- 70% mark correctly, 20% miss, 10% mark wrong  
- Show emoji reactions: 😊 when close, 😴 when behind  
- One bot programmed to win after \~15-20 numbers  
- Victory triggers full celebration sequence

### Demo Mode Indicator

- Subtle "DEMO MODE" badge in corner  
- "Start Real Game" button always visible  
- Auto-cleanup after 30 minutes

## Step 10: MVP Data Model

### Database Structure

**Rooms Table** Store game room information including:

- Unique identifier (UUID)  
- 6-character room code (unique constraint)  
- Host identifier linking to who created it  
- Configuration as JSON containing:  
  - Capacity limit (10-50 players)  
  - Auto-call enabled/disabled  
  - Auto-call interval in seconds  
  - Auto-close timer in minutes (optional)  
  - Demo mode flag  
- Status field (waiting, active, completed, cancelled)  
- Creation timestamp  
- Start and end timestamps

**Players Table** Store individual player data including:

- Unique identifier (UUID)  
- Room ID linking to rooms table  
- Display name (50 character limit)  
- MYNGO card stored as JSON (5x5 grid)  
- Array of marked numbers  
- Boolean flag for bot players  
- Join timestamp  
- Connection status  
- Last activity timestamp

**Called Numbers Table** Track game progression with:

- Unique identifier  
- Room ID reference  
- Number called (1-75)  
- Timestamp when called  
- Order sequence number

**Game Events Table** Audit trail containing:

- Event ID  
- Room ID reference  
- Event type (player\_joined, number\_called, game\_won, etc.)  
- Event data as JSON  
- Timestamp  
- Player ID if applicable

**Database Indexes** Create indexes on:

- Room codes for fast lookups  
- Room IDs in all related tables  
- Player room assignments  
- Called number sequences

## Step 11: Critical Implementation Notes

### No Authentication Required

- Use session-based identification  
- Generate unique IDs client-side  
- No login/signup flows  
- Guest-only access

### Stunning Visual Priorities

1. Glassmorphism on all cards  
2. Smooth spring animations  
3. Particle effects on interactions  
4. Gradient animations  
5. Premium loading states  
6. Delightful micro-interactions

### Performance Requirements

- First paint under 1 second  
- Interactive under 3 seconds  
- 60fps animations  
- Smooth on low-end devices  
- Works on 3G connections

### Database Performance

- Handle 50 concurrent players per room  
- Support 500 total concurrent players  
- Maximum 10 active rooms simultaneously  
- Sub-100ms response times for critical actions  
- Efficient real-time subscriptions  
- Graceful degradation at capacity

### Cross-Platform Support

**Device Compatibility:**

- Works on all devices (phones, tablets, desktops)  
- Responsive design adapts to screen size  
- Touch-optimized for mobile devices  
- Landscape and portrait orientations

**Browser Support:**

- Chrome, Firefox, Safari, Edge (latest 2 versions)  
- Mobile browsers fully supported  
- Graceful degradation for older browsers  
- Progressive enhancement approach

**Accessibility:**

- Can be played solo (self-hosted games)  
- No account required  
- Guest access for all players  
- Simple, intuitive interface

### Connection Management

- Connection pooling for 500 concurrent users  
- Rate limiting per room (50 players max)  
- Global rate limiting (10 rooms max)  
- Automatic cleanup queries for abandoned rooms  
- Connection recycling for better efficiency

## Step 12: Legal Disclaimers & End States

### Technical Issues Disclaimer

**Mandatory on ALL screens (host and player):** "Notice: MYNGO is provided for entertainment purposes only. In case of technical difficulties, neither the host nor MYNGO developers are responsible for prize distribution. This is a game meant for fun and engagement. No warranties are provided for any use case."

**Additional Disclaimers:**

- Display prominently during setup  
- Include in game rules/help sections  
- Show in cancellation modals  
- Protects all parties from prize disputes

### Game Ended/Cancelled Screen (All Players)

Glass-morphism card showing:

- Large heading: "Game Ended" or "Game Cancelled"  
- Reason: "\[Host provided reason\]"  
- If time constraints: "Host is determining winners"  
- Three action buttons:  
  - "Join a Game" (primary)  
  - "Host a Game" (secondary)  
  - "Back to Home" (tertiary)  
- Subtle animation: particles slowly falling

### Connection Lost Handling

- 5 second grace period for reconnection  
- After 30 seconds: Auto-cancel with reason "Connection Aborted"  
- Players see immediate notification  
- Game state preserved for 5 minutes (allow checking)

### Game Completion Screen (Normal End)

When game ends with a winner:

- Title: "🎉 Game Complete\!"  
- Winner showcase: "\[Name\] won after \[X\] numbers"  
- Game Statistics:  
  - Total players: X  
  - Duration: XX minutes  
  - Numbers called: XX  
  - Your numbers marked: XX/24  
- Three buttons (same as cancelled)

### Game Cancelled Screen (Abnormal End)

When game cancelled:

- Title: "Game Cancelled"  
- Reason: "\[Specific reason given\]"  
- Same stats as above (if available)  
- Same three buttons  
- More subdued visual treatment (no confetti)

Both screens appear simultaneously to all players. Host sees admin version with additional stats.

## Step 13: Build Commands

### Required Libraries

- React with TypeScript  
- Tailwind CSS for styling  
- Framer Motion for animations (optional \- use CSS if needed)  
- Canvas-confetti for celebrations  
- Howler.js for sound (optional)  
- UUID for ID generation  
- @supabase/supabase-js for database  
- @tanstack/react-query for server state  
- zustand for client state (optional)

### File Structure

```
/src
  /components
    /host
    /player
    /shared
  /hooks
  /utils
  /styles
  /types
```

### Supabase Configuration Initial Setup

**Fresh Database Setup (Hackathon Compliant)**

- Create NEW Supabase project during hackathon  
- Initialize tables from scratch  
- Generate new API keys  
- Document creation timestamp  
- Everything built within hackathon timeframe

**Quick Setup Commands**

- Run these in Supabase SQL editor  
- Creates all tables in under 1 minute  
- \[include full schema\]

**Environment Setup**

- Create new Supabase project  
- Enable real-time for all tables  
- Set up environment variables:

```
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_ANON_KEY=your_key
```

### Security Rules

- Rooms: Anyone can read, only host can update  
- Players: Anyone in room can read, self-update only  
- Called numbers: Read-only for players  
- Use RLS policies to enforce rules

### Performance Optimization

- Connection pooling for 50 concurrent users  
- Batch updates where possible  
- Debounce rapid state changes  
- Use database functions for atomic operations

## Final Notes

Make it memorable, make it beautiful, make it feel expensive. This must be a fully functional, production-ready application that can handle real users immediately. Every interaction should spark joy and the judges should want to keep playing even after the demo ends.

The application should be built ready for direct deployment through Bolt.new's Netlify integration, with all necessary configurations for connecting to the custom domain MYNGO.ai.

**IMPORTANT**: Prioritize visual polish and smooth interactions over complex features. It's better to have fewer features that work flawlessly and look stunning than many features that feel unfinished. This is for a hackathon \- WOW factor is everything\!

**FINAL**: Complete this entire build without interruption. The result should be a fully functional MYNGO game ready for immediate deployment and hackathon demonstration.

