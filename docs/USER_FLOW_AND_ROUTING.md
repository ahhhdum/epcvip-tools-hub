# User Flow and URL Routing Analysis

## Current Architecture

### Overview
Wordle Battle is a **Single Page Application (SPA)** using one HTML file (`wordle/index.html`) with view-based navigation. All state management happens client-side via JavaScript variables and WebSocket messages.

### Navigation Model
```
URL: /wordle/    (single URL for all states)
     │
     └── showView(viewName)  ←── JavaScript function controls visibility
              │
              ├── lobby
              ├── waiting
              ├── game
              ├── results
              ├── dailyCompleted
              └── historicalDailies
```

No browser URL changes occur during navigation. Users cannot bookmark or share specific game states.

---

## Current User Flow

### Entry Points (All lead to `/wordle/`)

```
                            ┌─────────────────────────────┐
                            │      /wordle/ loaded        │
                            └─────────────┬───────────────┘
                                          │
                            ┌─────────────▼───────────────┐
                            │   Check for SSO token       │
                            │   (from Tools Hub)          │
                            └─────────────┬───────────────┘
                                          │
                       ┌──────────────────┼──────────────────┐
                       │                  │                  │
               ┌───────▼───────┐  ┌───────▼───────┐  ┌───────▼───────┐
               │  SSO Token    │  │ Supabase      │  │  No Auth      │
               │  in URL       │  │ Session       │  │  (Guest)      │
               └───────┬───────┘  └───────┬───────┘  └───────┬───────┘
                       │                  │                  │
                       └──────────────────┼──────────────────┘
                                          │
                            ┌─────────────▼───────────────┐
                            │        Lobby View           │
                            └─────────────────────────────┘
```

### User Types and Capabilities

| Capability | Authenticated | Guest |
|------------|---------------|-------|
| Play random game (create room) | Yes | Yes |
| Play random game (join room) | Yes | Yes |
| Today's Daily Challenge | Yes | No |
| Historical Dailies | Yes | No |
| Stats tracking | Yes | No |
| Leaderboards | Yes | No |
| Win streak tracking | Yes | No |

### Authentication Paths

#### Path 1: SSO from Tools Hub
```
Tools Hub → Link with sso_token → /wordle/?sso_token=xxx → Validate → Logged in
```

#### Path 2: Direct Supabase Login
```
Lobby → Login button → Modal → Email/password → Supabase auth → Logged in
```

#### Path 3: Guest Play
```
Lobby → "Play as guest" link → Room actions visible → Can play (no stats saved)
```

---

## View Flow Diagram

```
                                    ┌──────────────────────┐
                                    │       LOBBY          │
                                    │  (Entry Point)       │
                                    └───────────┬──────────┘
                                                │
        ┌───────────────────────────────────────┼───────────────────────────────────────┐
        │                           │           │           │                           │
        ▼                           ▼           │           ▼                           ▼
┌───────────────┐           ┌───────────────┐   │   ┌───────────────┐           ┌───────────────┐
│ Create Room   │           │ Join Room     │   │   │ Daily         │           │ Historical    │
│               │           │               │   │   │ Challenge     │           │ Dailies       │
└───────┬───────┘           └───────┬───────┘   │   └───────┬───────┘           └───────┬───────┘
        │                           │           │           │                           │
        │                           │           │           │                           │
        ▼                           ▼           │           ▼                           ▼
┌───────────────────────────────────────────┐   │   ┌───────────────────────────────────────────┐
│              WAITING ROOM                 │   │   │         MODE SELECTION MODAL              │
│  - Room code display                      │   │   │   ┌─────────────┬─────────────┐           │
│  - Player list                            │   │   │   │ Play Solo   │ Play with   │           │
│  - Mode selection (creator only)          │   │   │   │             │ Friends     │           │
│  - Ready toggle                           │   │   │   └──────┬──────┴──────┬──────┘           │
│  - Start button (creator, all ready)      │   │   └──────────┼─────────────┼──────────────────┘
└───────────────────┬───────────────────────┘   │              │             │
                    │                           │              │             │
                    │ (Solo skips waiting)      │              │             │
                    ▼                           ▼              ▼             ▼
            ┌───────────────────────────────────────────────────────────────────────┐
            │                         COUNTDOWN (3-2-1)                             │
            └───────────────────────────────────┬───────────────────────────────────┘
                                                │
                                                ▼
                                    ┌───────────────────────┐
                                    │         GAME          │
                                    │  - 5x6 guess grid     │
                                    │  - On-screen keyboard │
                                    │  - Timer              │
                                    │  - Opponent boards    │
                                    └───────────┬───────────┘
                                                │
                            ┌───────────────────┴───────────────────┐
                            │                                       │
                            ▼                                       ▼
                ┌───────────────────────┐               ┌───────────────────────┐
                │       RESULTS         │               │   DAILY COMPLETED     │
                │  - Word reveal        │               │  (if daily & already  │
                │  - Player rankings    │               │   completed today)    │
                │  - Play Again         │               │  - Previous grid      │
                │  - Back to Lobby      │               │  - Stats              │
                └───────────┬───────────┘               └───────────┬───────────┘
                            │                                       │
                            ▼                                       ▼
                    Return to LOBBY                         Return to LOBBY
```

---

## CTAs by Screen

### Lobby (Not Logged In)
| CTA | Action |
|-----|--------|
| **Login** | Opens auth modal (login mode) |
| **Sign Up** | Opens auth modal (signup mode) |
| **Play as guest** | Hides auth prompt, shows room actions |

### Lobby (Logged In)
| CTA | Action |
|-----|--------|
| **Daily Challenge #XXX** | Opens mode selection modal |
| **Historical Dailies** | Shows historical dailies view |
| **Create Room** | Creates multiplayer room (WebSocket) |
| **Join** | Joins room by code (WebSocket) |
| **Logout** | Signs out, clears session |

### Waiting Room
| CTA | Action |
|-----|--------|
| **Copy room code** | Copies to clipboard |
| **Casual / Competitive** | Toggle game mode (host only) |
| **Daily / Random** | Toggle word mode (host only) |
| **I'm Ready / Not Ready** | Toggle ready status |
| **Start Game** | Begins countdown (host, all ready) |
| **Leave Room** | Returns to lobby |

### Game
| CTA | Action |
|-----|--------|
| **Keyboard keys** | Input guess letter |
| **Enter** | Submit guess |
| **Backspace** | Delete letter |

### Results
| CTA | Action |
|-----|--------|
| **Play Again** | Returns to waiting room |
| **Back to Lobby** | Returns to lobby |

### Historical Dailies
| CTA | Action |
|-----|--------|
| **Random Unplayed Daily** | Selects random unplayed, shows modal |
| **Recent daily item** | Shows mode selection for that daily |
| **Go (browse by number)** | Shows mode selection for entered number |
| **Back to Lobby** | Returns to lobby |

---

## URL Routing Analysis

### Current State: No URL Routing

**How it works today:**
- Single URL: `/wordle/`
- State stored in JavaScript variables
- Navigation via `showView(viewName)` function
- Browser back button does nothing (no history entries)
- Refresh loses all state

**Implications:**
- Cannot share game links
- Cannot bookmark specific states
- No deep linking
- Browser navigation doesn't work

---

### What URL Routing Would Enable

| Feature | Without Routing | With Routing |
|---------|-----------------|--------------|
| Share room link | Manual: "Join code ABC123" | Direct: `/wordle/room/ABC123` |
| Share daily results | Not possible | `/wordle/daily/734/results` |
| Bookmark daily | Not possible | `/wordle/daily` |
| Browser back button | Broken | Works naturally |
| Refresh during game | Loses state | Rejoins game |
| Deep link to historical | Not possible | `/wordle/daily/267` |

### Proposed URL Structure

```
/wordle/                          → Lobby (default)
/wordle/login                     → Lobby with login modal open
/wordle/signup                    → Lobby with signup modal open
/wordle/daily                     → Today's daily (auth required, redirects if not)
/wordle/daily/{number}            → Historical daily (auth required)
/wordle/room/{code}               → Join/view room
/wordle/room/{code}/game          → Active game (reconnect if disconnected)
/wordle/room/{code}/results       → Results for completed game
```

---

## Complexity Assessment

### Implementation Effort

| Component | Complexity | Description |
|-----------|------------|-------------|
| URL parsing | Low | Parse pathname, extract segments |
| History API | Medium | pushState, replaceState, popstate listener |
| State sync | Medium | Ensure JS state matches URL |
| Reconnection | High | Rejoin WebSocket room on refresh/deep link |
| Auth guards | Medium | Redirect unauthenticated users |

### Detailed Breakdown

#### 1. URL Parsing (Low)
```javascript
// Simple router function
function parseRoute() {
  const path = window.location.pathname.replace('/wordle', '');
  const segments = path.split('/').filter(Boolean);

  if (segments[0] === 'daily') {
    return { view: 'daily', number: segments[1] || 'today' };
  }
  if (segments[0] === 'room') {
    return { view: 'room', code: segments[1], subview: segments[2] };
  }
  return { view: 'lobby' };
}
```

#### 2. History API Integration (Medium)
```javascript
// Navigate with URL update
function navigate(view, params = {}) {
  const url = buildUrl(view, params);
  history.pushState({ view, ...params }, '', url);
  showView(view);
}

// Handle back/forward
window.addEventListener('popstate', (e) => {
  if (e.state) {
    handleRoute(e.state);
  }
});
```

#### 3. Auth Protection (Medium)
```javascript
// Route guards
const PROTECTED_ROUTES = ['daily', 'historical'];

function handleRoute(route) {
  if (PROTECTED_ROUTES.includes(route.view) && !authUser) {
    // Store intended destination
    sessionStorage.setItem('redirect_after_login', route.url);
    navigate('login');
    return;
  }
  // Proceed with route
}
```

#### 4. WebSocket Reconnection (High - Major Work)
This is the most complex part. Currently, WebSocket state is ephemeral.

**Changes needed:**
- Store `roomCode` and `playerId` in sessionStorage
- On page load, check if we should reconnect
- Server must support "rejoin" message type
- Handle race conditions (room may have ended)

```javascript
// On init, check for reconnection
async function checkReconnection() {
  const savedRoom = sessionStorage.getItem('wordle_room');
  const savedPlayer = sessionStorage.getItem('wordle_player');

  if (savedRoom && savedPlayer) {
    // Attempt to rejoin
    send({ type: 'rejoin', roomCode: savedRoom, playerId: savedPlayer });
  }
}

// Server-side: new message handler
case 'rejoin':
  const room = rooms.get(msg.roomCode);
  if (room && room.players.has(msg.playerId)) {
    // Reconnect player to room
    // Send current game state
  } else {
    // Room gone or player not found
    send({ type: 'rejoinFailed' });
  }
```

---

## Pros and Cons

### Pros of URL Routing

| Benefit | Impact |
|---------|--------|
| **Shareable room links** | High - easier multiplayer invites |
| **Browser back/forward** | Medium - expected UX |
| **Bookmarkable states** | Medium - return to daily challenge |
| **Deep linking** | Medium - link to specific historical daily |
| **Analytics** | Low - track page views separately |
| **SEO** | Low - not relevant for this app |

### Cons of URL Routing

| Concern | Impact |
|---------|--------|
| **WebSocket reconnection logic** | High complexity |
| **Testing surface area** | Medium - more states to test |
| **State synchronization bugs** | Medium - URL ↔ JS state drift |
| **Initial implementation time** | Medium - refactor navigation |
| **Maintenance burden** | Low - once stable, minimal |

---

## Authentication with URL Routing

### Protected Routes
```
/wordle/daily*         → Requires auth
/wordle/room/*         → No auth required (guests can join rooms)
/wordle/login          → Public
/wordle/signup         → Public
/wordle/               → Public
```

### Auth Flow with Routing

```
User → /wordle/daily/267
       │
       ├── Authenticated?
       │       │
       │       ├── Yes → Show historical daily view
       │       │
       │       └── No → Store intended URL
       │                │
       │                └── Redirect to /wordle/login
       │                           │
       │                           └── After login → Redirect to /wordle/daily/267
```

### Implementation

```javascript
// Middleware-like check on route change
function guardRoute(route) {
  const requiresAuth = route.startsWith('/wordle/daily');

  if (requiresAuth && !authUser) {
    // Save where they wanted to go
    sessionStorage.setItem('wordle_redirect', route);
    // Show login
    navigate('/wordle/login');
    return false;
  }
  return true;
}

// After successful login
function onLoginSuccess(user) {
  authUser = user;
  updateAuthUI();

  // Check for pending redirect
  const redirect = sessionStorage.getItem('wordle_redirect');
  if (redirect) {
    sessionStorage.removeItem('wordle_redirect');
    navigate(redirect);
  } else {
    navigate('/wordle/');
  }
}
```

### Security Considerations

| Concern | Mitigation |
|---------|------------|
| Direct URL access to game | Room state on server, not in URL |
| Guessing room codes | 6-char alphanumeric = 2B+ combinations |
| Accessing others' results | No sensitive data exposed |
| Auth bypass via URL | Server validates on every WebSocket message |

The current architecture is actually secure because:
1. Game state lives on the server
2. WebSocket messages require valid room membership
3. Stats operations validate email matches authenticated user

URL routing wouldn't change this - it just provides navigation convenience.

---

## Recommendation

### Option 1: Basic URL Routing (Medium Effort)
**Scope:** URL updates for navigation states, no reconnection logic

- Update URL on view changes
- Handle back/forward buttons
- Support `/wordle/daily`, `/wordle/login`, `/wordle/signup`
- Room links for sharing (`/wordle/room/{code}`) - joining, not rejoining

**Pros:** Meaningful improvement, manageable scope
**Cons:** Refresh still loses game state

### Option 2: Full URL Routing with Reconnection (High Effort)
**Scope:** Everything in Option 1 + WebSocket reconnection

- Store room/player info in sessionStorage
- Server-side rejoin logic
- Handle reconnection edge cases

**Pros:** Complete solution
**Cons:** Significant backend changes, testing complexity

### Option 3: No URL Routing (No Effort)
**Scope:** Keep current architecture

**Pros:** No work, no bugs
**Cons:** Missing quality-of-life features

---

## Conclusion

**Recommended: Phased Implementation**

After further analysis, we've designed a comprehensive reconnection architecture that addresses the core pain point: **leaving the page to share a room code causes the host to disconnect and potentially lose the room**.

See `RECONNECTION_ARCHITECTURE.md` for the full implementation plan.

### Implementation Phases

| Phase | Priority | What It Solves |
|-------|----------|----------------|
| **Phase 0** | Critical | Foundation - grace periods prevent immediate player removal |
| **Phase 2** | High | URL sharing - `/wordle/room/ABC123` for easy invites |
| **Phase 1** | High | Waiting room rejoin - reconnect after sharing code |
| **Phase 3** | Medium | In-game rejoin - full reconnection support |

### Recommended Order: 0 → 2 → 1 → 3

Phase 2 (URL sharing) is low effort and high impact. Combined with Phase 0's grace period, it largely solves the "share room code" problem without full reconnection logic.

### Related Documentation
- `RECONNECTION_ARCHITECTURE.md` - Detailed implementation plan with edge cases
- `../BACKLOG.md` - Prioritized task list for each phase
