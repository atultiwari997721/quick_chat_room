# quick_chat_room

# Specially This App is Completely Created by KritiAi our own personal Assistant.
Its Created by KritiAi From Scratch, from frontend, backend to API integration database management and deployments its solemnly completed by KritiAi.

link to visit <a>https://quick-chat-room.vercel.app/</a>

A room-based chat app built with Next.js, Prisma, and PostgreSQL.

## Features

- **Create a room** — get a shareable invite link to send to others
- **Join a room** — enter a 6-digit room code (or open an invite link)
- **Profile photos** — every user can add a profile photo
- **Admin powers** — the room creator is the admin and can see all members and remove them
- **Room-based messaging** — messages are scoped to each room with live polling updates
- **Auto data cleanup** — when a user closes the app, their data is deleted automatically; only their persistent ID is kept, and they are asked to create or join a room again

## Getting Started

First, install dependencies and set up the database:

```bash
npm install
npx prisma migrate deploy
```

Then run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment Variables

| Variable       | Description                                   |
| -------------- | --------------------------------------------- |
| `DATABASE_URL` | PostgreSQL connection string (pooled)         |
| `DIRECT_URL`   | PostgreSQL connection string (for migrations) |

## Tech Stack

- [Next.js](https://nextjs.org) 16 (App Router, TypeScript, Tailwind CSS)
- [Prisma](https://www.prisma.io) ORM with PostgreSQL
- Route Handlers for the chat API (`/api/rooms`, `/api/messages`, `/api/users`)

Thank you for visiting.

Atul Tiwari
