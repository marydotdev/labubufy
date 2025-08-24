# Labubu Images Public URL Setup

Since Replicate models need publicly accessible URLs, you have several options:

## Option 1: GitHub Raw URLs (Recommended for development)

1. Create a public GitHub repository or use this one
2. Upload your labubu images to `public/labubu-images/`
3. Get the raw URLs in format: `https://raw.githubusercontent.com/username/repo/main/public/labubu-images/labubu1.png`

Example URLs:
```
https://raw.githubusercontent.com/maryhaedrich/labubufy/main/public/labubu-images/labubu1.png
https://raw.githubusercontent.com/maryhaedrich/labubufy/main/public/labubu-images/labubu2.png
```

## Option 2: Imgur (Quick and easy)

1. Go to https://imgur.com
2. Upload each labubu image
3. Get the direct image URLs

## Option 3: Add to environment variables

Add to your `.env.local`:
```
NEXT_PUBLIC_LABUBU_1_URL=https://your-cdn.com/labubu1.png
NEXT_PUBLIC_LABUBU_2_URL=https://your-cdn.com/labubu2.png
# ... etc
```

## Current Status
The code now uses placeholder images for development. Replace these with actual Labubu image URLs in the `getLabubuImageUrl` function in `lib/config.ts`.