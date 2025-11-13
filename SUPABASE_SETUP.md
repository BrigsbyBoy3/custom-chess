# Supabase Realtime Setup Guide

This guide will help you set up Supabase Realtime for cross-device multiplayer chess.

## Step 1: Create a Supabase Account

1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project" or "Sign up"
3. Create a free account (no credit card required)

## Step 2: Create a New Project

1. After logging in, click "New Project"
2. Fill in your project details:
   - **Name**: Choose any name (e.g., "Chess Game")
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose the closest region to you
3. Click "Create new project"
4. Wait for the project to be set up (takes about 2 minutes)

## Step 3: Get Your API Credentials

1. In your Supabase project dashboard, go to **Settings** (gear icon in the sidebar)
2. Click on **API** in the settings menu
3. You'll see two important values:
   - **Project URL**: Something like `https://xxxxx.supabase.co`
   - **anon public key**: A long string starting with `eyJ...`

## Step 4: Configure the Game

1. Open `js/supabaseConfig.js` in your project
2. Replace the empty strings with your credentials:

```javascript
export const SUPABASE_CONFIG = {
  url: 'https://your-project-id.supabase.co', // Your Project URL
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' // Your anon public key
};
```

3. Save the file

## Step 5: Enable Realtime (Important!)

1. In your Supabase dashboard, go to **Database** → **Replication**
2. You don't need to enable replication for tables (we're using broadcast channels, not database tables)
3. Realtime is enabled by default for broadcast channels, so you're all set!

## Step 6: Test It!

1. Open your chess game in two different browsers (or devices)
2. Make a move in one browser
3. The move should appear in the other browser automatically!

## Troubleshooting

### "Supabase not configured" warning
- Make sure you've added your credentials to `js/supabaseConfig.js`
- Check that the URL and key are correct (no extra spaces)

### "Error initializing Supabase"
- Check the browser console for detailed error messages
- Make sure the Supabase CDN script is loading (check Network tab)
- Verify your credentials are correct

### Game not syncing across devices
- Check that both browsers have the same Supabase credentials
- Open browser console and look for "Connected to Supabase Realtime" message
- Make sure both devices are connected to the internet

## Free Tier Limits

Supabase's free tier includes:
- ✅ 2 million Realtime messages per month
- ✅ 200 peak connections per month
- ✅ Free forever (no credit card required)

For a chess game, this is more than enough!

## Security Note

The `anon` key is safe to use in client-side code. It's designed to be public. However, for production apps, you might want to:
- Use environment variables
- Set up Row Level Security (RLS) policies if you add database tables later
- Consider using the service role key only on the server side (never expose it in client code)

## Next Steps

Once you have Supabase set up, the game will automatically:
- Use Supabase Realtime for cross-device multiplayer
- Fall back to BroadcastChannel if Supabase isn't configured (for local testing)

Enjoy your cross-device multiplayer chess game! 🎉

