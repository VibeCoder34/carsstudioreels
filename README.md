This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## ElevenLabs (TTS) Integration

This repo includes a server-side Text-to-Speech endpoint backed by ElevenLabs:

- **API route**: `POST /api/tts`
- **Implementation**: `src/app/api/tts/route.ts`, `src/lib/elevenlabs.ts`

### Required environment variables (local only)

Add these to your `.env.local` (do not commit):

- `ELEVENLABS_API_KEY`: ElevenLabs API key
- `ELEVENLABS_VOICE_ID`: default voice id (optional)
- `ELEVENLABS_MODEL_ID`: default model id (optional, e.g. `eleven_multilingual_v2`)
- `ELEVENLABS_OUTPUT_FORMAT`: default output format (optional, e.g. `mp3_44100_128`)

### Example request

```bash
curl -X POST "http://localhost:3000/api/tts" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Merhaba! CarStudio Reels için deneme seslendirme.",
    "outputFormat": "mp3_44100_128"
  }' --output speech.mp3
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
