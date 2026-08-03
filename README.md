# quick_chat_room

# Specially This App is Completely Created by KritiAi our own personal Assistant.
Its Created by KritiAi From Scratch, from frontend, backend to API integration database management and deployments its solemnly completed by KritiAi.

link to visit <a>https://quick-chat-room.vercel.app/</a>

A social chat app built with Next.js, Prisma, and PostgreSQL — a mix of WhatsApp-style chat lists, Facebook-style rooms, and Instagram-style gradients.

## Features

- **Accounts** — register with a username + password, log in, and the browser remembers your session
- **WhatsApp-style sidebar** — your rooms listed like chats, with last-message previews and search
- **Create a room** — get a shareable invite link (or 6-digit code) to send to others
- **Join a room** — enter a 6-digit code or open an invite link
- **Profile photos** — every user can add a profile photo with an Instagram-style gradient ring
- **Admin powers** — the room creator is the admin and can remove members; only the admin can
- **Room-based messaging** — messages are scoped to each room with live polling updates
- **Admin leave deletes the room** — when the admin leaves, the room and all its messages are removed automatically

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
- Route Handlers for the chat API (`/api/auth`, `/api/rooms`, `/api/messages`, `/api/users`)
- Passwords hashed with Node `crypto.scrypt`; sessions via bearer tokens

Thank you for visiting.

Atul Tiwari
