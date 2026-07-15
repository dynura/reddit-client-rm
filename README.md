# Reddit Multi-Lane Dashboard Client
This repository contains my completed solution to the [Reddit Client](https://roadmap.sh/projects/reddit-client) challenge on roadmap.sh. The platform allows developers and users to build a completely custom browser dashboard to view, clean, and monitor real-time post feeds across isolated subreddit networks simultaneously.

## Project Details
The objective of this challenge was to create a responsive, multi-lane feed reader that updates asynchronously, parses post scores, clarifies user context tags, and saves custom layouts locally. The application starts as a pristine, user-configured empty dashboard canvas, giving the operator full control over the subreddits they track.

## Crucial Architecture Notice: Feed Stream Transition
Unlike traditional client apps that rely on standard unauthenticated `https://www.reddit.com/r/{subreddit}.json` fetch streams, this platform relies on an automated JSONP script-injection layer (`.json?jsonp=callback`). 

### Why this approach was taken:
- **API Lockdown Mitigation:** Reddit updated its access layers to reject direct server-less `fetch` and `axios` client queries with `403 Forbidden` or `429 Too Many Requests` errors unless wrapped inside high-overhead OAuth authentication flows. 
- **Zero-Server Client Integrity:** By using a callback script injection mechanism, the frontend completely bypasses CORS restrictions and header blockades, ensuring the app remains 100% serverless and instantly ready for static deployment.

### Critical Future Risk:
⚠️ **Stability warning:** This application depends entirely on Reddit continuing to serve public legacy JSONP/RSS alternative stream wrappers. If Reddit decides to deprecate, lock down, or shut down these remaining legacy fallback interfaces in the future, the data fetching pipeline of this application will break down permanently unless a dedicated backend proxy server or certified OAuth pipeline is introduced.

## Requirements Met
- **Customizable Multi-Lane Matrix:** Allows users to dynamically add new subreddits or instantly delete tracked columns using a modular user interface architecture.
- **Explicit Author Context Labeling:** Explicitly headers poster identities using clean `u/{username}` prefixes, preventing any structural layout confusion between the main column subreddits and individual creators.
- **Real-Time Vote Trackers:** Automatically parses live upvote metadata (`score` / `ups`) directly from the feed data stream and displays them with formatted localized counters on every post card element.
- **Persistent Storage Slate:** Implements automated state preservation through localized `localStorage` arrays, restoring your unique board configurations across page reloads without requiring an account.
- **Monochrome Design Language (Tailwind):** Built with a high-contrast minimalist monochrome design layout featuring an adaptive system-level Dark and Light mode toggle.

## File Structure
```text
reddit-client-rm/
├── src/
│   ├── App.jsx                # Core JSONP script stream logic, lane modules, and dashboard layout
│   ├── index.css              # Tailwind global directives and minimalist theme rules
│   └── main.jsx               # React hydration and client entry point
├── postcss.config.js          # PostCSS compilation setups
├── package.json               # Runtime package dependencies and build scripts
└── README.md                  # Detailed architectural project documentation
```

## Setup & Preview
To run the application locally:
- Clone the repository and enter the workspace:
```bash
cd reddit-client-rm
```
- Install the required dependencies:
```bash
npm install
```
- Boot up the development server:
```bash
npm run dev
```
- Launch the platform:
Navigate to the local URL provided by your terminal (typically http://localhost:5173/) to interact with the dashboard.