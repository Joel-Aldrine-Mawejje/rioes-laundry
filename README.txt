RIOES LAUNDRY - HOSTING PACK
Files: index.html (the app), firebase-config.js (your Firebase settings), firestore.rules, manifest.json + sw.js (install + offline), icon-192.png, icon-512.png, FIREBASE-SETUP.txt.
Do FIREBASE-SETUP.txt FIRST if you want shared data and logins; otherwise the app runs device-only.

OPTION A - GitHub Pages (free)
1. Create a free account at github.com and click New repository. Name it e.g. rioes-laundry. Public is required for free Pages.
2. Click "uploading an existing file", drag in ALL the files (unzip first), then Commit changes.
3. Go to Settings > Pages. Under Branch choose "main" and "/ (root)", then Save.
4. After a minute your app is live at https://YOURNAME.github.io/rioes-laundry/
5. On each phone: open that link in Chrome, menu > Add to Home screen / Install app.

OPTION B - Netlify Drop (even simpler)
1. Go to app.netlify.com/drop, drag the unzipped folder onto the page.
2. You get a live link immediately. Create a free account to keep it.

IMPORTANT
- Without Firebase set up: data stays in each browser and devices do NOT share. With Firebase set up (FIREBASE-SETUP.txt): shared data and staff logins.
- Download a backup (Settings > Backup) regularly either way.
- To update the app later, replace index.html in your repository.
