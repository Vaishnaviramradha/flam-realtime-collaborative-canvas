# Real-Time Collaborative Drawing Canvas

A full-stack frontend R&D assignment implementation using React + TypeScript + HTML Canvas + WebSockets.

## Features
- Real-time multi-user drawing
- Shared rooms
- Live collaborator cursors and user list
- Brush color and size controls
- Clear canvas synchronization
- Export drawing as PNG
- Responsive UI and touch drawing
- In-memory room state on the WebSocket server

## Requirements
- Node.js 20+
- npm 10+

## Run locally
From the project root:

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in two browser tabs. Keep both tabs in the same room and draw.

## Production build
```bash
npm run build
```

## Run server only
```bash
npm run start
```

Health endpoint: `http://localhost:8080/health`

## Deploy
### Backend
Deploy the `server` folder to a Node hosting service such as Render, Railway, or Fly.io. The start command is:

```bash
npm start
```

Use the generated public WebSocket URL, for example `wss://YOUR-SERVER.example.com`.

### Frontend
On Vercel/Netlify, deploy the `client` folder. Add an environment variable:

```text
VITE_WS_URL=wss://YOUR-SERVER.example.com
```

Build command:
```text
npm run build
```

Output directory:
```text
dist
```

## GitHub
```bash
git init
git add .
git commit -m "Build real-time collaborative drawing canvas"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/flam-collaborative-canvas.git
git push -u origin main
```

## Notes
The assignment screenshot lists the title "Real-Time Collaborative Drawing Canvas" but does not provide a detailed specification. This implementation therefore uses a practical interpretation of that title and includes the core real-time collaboration requirements expected from a frontend R&D demo.
