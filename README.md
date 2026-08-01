# quick_chat_room

A real-time chat app built with Next.js, Prisma, and SQLite.

## Features

- Create a display name to join the chat room (remembered via localStorage)
- Send messages that are stored in a SQLite database
- Live updates via polling (2s) as messages are sent
- Auto-creates users on first message

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

## Tech Stack

- [Next.js](https://nextjs.org) 16 (App Router, TypeScript, Tailwind CSS)
- [Prisma](https://www.prisma.io) ORM with SQLite
- Route Handlers for the chat API (`/api/messages`)
