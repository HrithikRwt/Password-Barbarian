# Password Barbarian: Clash-of-Clans-Themed Password Strength Checker

A single-page web app that turns password strength checking into a village raid.
Type a password and watch a small original-art village react in real time: weak
passwords get flattened by a barbarian raider, moderate ones take partial damage,
and strong ones bounce the attack off a shield. A live "Scout Report" explains
*why* the password is weak, an "Enemy ETA" panel shows an estimated brute-force
crack time, and a real breach lookup checks the password against the
[Have I Been Pwned](https://haveibeenpwned.com/) Pwned Passwords database —
without ever sending your actual password anywhere.

There's also a "Call the Builder" feature that takes a weak/moderate password
you typed and mutates it into a stronger variant (capitalization, leet-speak
substitutions, an inserted symbol, an appended suffix) - a real transformation
of what you typed, not a random generated password.

All village and character art is original SVG/CSS — no Supercell assets, logos,
or copyrighted material are used anywhere in this project.

---

## Project structure

```
coc-password-checker/
├── index.html      # Markup: village SVG, input, intel panels
├── style.css        # All styling (dark stone/gold fantasy theme, animations)
├── script.js         # Strength engine, village animation controller,
│                      #   HIBP k-anonymity lookup, builder mutation logic
└── README.md         # You are here
```

Everything is vanilla HTML/CSS/JS — no build step, no bundler, no npm install.

---

## How to run it locally

**Option A — just open the file.**
Double-click `index.html`, or drag it into a browser tab. Everything works,
*including* the breach-lookup API call, because it's a simple cross-origin
`fetch()` to a public API that allows browser requests directly — no local
server is strictly required.

**Option B — use a tiny local server (recommended).**
Some browsers restrict certain behaviors (like clipboard access or service
workers) on the `file://` protocol, so a local server gives you the most
production-accurate experience. Pick whichever you have installed:

```bash
# Python 3
cd coc-password-checker
python3 -m http.server 8000
# then open http://localhost:8000

# Node (no install needed, via npx)
cd coc-password-checker
npx serve .

# VS Code
# Right-click index.html → "Open with Live Server" (if you have that extension)
```

No `.env`, no API keys, no backend — the HIBP Pwned Passwords range API is
free and requires no authentication for this use case.

---

## How to deploy it for free (GitHub Pages — simplest option)

1. Create a new GitHub repository (e.g. `raid-warden`) and push these three
   files (`index.html`, `style.css`, `script.js`) plus this `README.md` to
   the `main` branch:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Password Barbarian password checker"
   git branch -M main
   git remote add origin https://github.com/<your-username>/raid-warden.git
   git push -u origin main
   ```
2. On GitHub, open the repo → **Settings** → **Pages**.
3. Under **Build and deployment → Source**, choose **Deploy from a branch**.
4. Set **Branch** to `main` and folder to `/ (root)`, then **Save**.
5. GitHub will give you a live URL within a minute or two, typically:
   `https://<your-username>.github.io/raid-warden/`

That's it — static files, no server-side code, so GitHub Pages (or equally,
Netlify's drag-and-drop deploy, or Vercel's "Import Project") all work with
zero configuration. GitHub Pages is the simplest because it needs no account
beyond GitHub itself and no CLI tooling.

---

## Tech choices (useful for an interview / viva writeup)

**Why vanilla JS instead of a framework?**
The app is a single view with no routing, no shared component tree across
pages, and a modest amount of local UI state (current password, animation
lock, last tier). A framework's value proposition — declarative rendering
across a complex component graph, state management at scale — doesn't pay
for itself here. Vanilla JS keeps the bundle at zero build steps, loads
instantly, and makes every line of behavior traceable without a virtual DOM
layer in between. For a project this size, the framework would be overhead,
not leverage.

**Why k-anonymity for the breach check, and how it works.**
Sending a real password (or its full hash) to a third-party API would leak
the password to that API — even hashed, a full SHA-1 hash of a password is
crackable via rainbow tables for common passwords, and it's simply bad
practice to transmit user secrets off-device at all. The
[Pwned Passwords k-anonymity model](https://haveibeenpwned.com/API/v3#PwnedPasswords)
solves this: the client hashes the password locally with SHA-1, then sends
only the **first 5 hex characters** of that hash to the API. The API returns
*every* hash suffix in the world that shares that 5-character prefix (usually
several hundred to a few thousand entries), along with how many times each
has been seen in breaches. The client then checks locally whether the
*remaining* hash suffix is in that returned list. The server never sees the
full hash, let alone the password — it only ever sees a 5-character prefix
shared by thousands of other unrelated passwords, so it structurally cannot
identify which password was actually checked. That's what "k-anonymity"
means here: the real answer is hidden inside a crowd (the anonymity set) of
at least k other indistinguishable candidates.

**Why SHA-1 specifically, if it's a "broken" hash?**
SHA-1's cryptographic weaknesses (collision attacks) are irrelevant to this
use case — it's not being used for signatures or integrity verification.
It's only used as a fixed-format lookup key into HIBP's existing breach
corpus, which was built and indexed on SHA-1 to match how breached
password lists were originally processed. Using a different hash here
wouldn't be "more secure" — it would just fail to match the dataset.

**Why estimate crack time from entropy instead of calling an external API?**
Brute-force time estimation is pure math (character-set size, password
length, and an assumed guesses-per-second rate for an offline attacker)
— it needs zero network calls and can update on every keystroke with no
latency. Doing this client-side keeps the "live" feel of the app intact;
round-tripping to a server for something this cheap to compute would only
add lag for no benefit. It's clearly labeled as an *estimate* based on a
stated assumption (10 billion guesses/second, a common approximation for
fast offline GPU cracking of unsalted/fast hashes) rather than a guarantee.

**Why debounce the HIBP call instead of checking on every keystroke?**
A password can go through many intermediate states while being typed
("p", "pa", "pas", "pass"...). Firing a network request per keystroke would
spam a free public API with redundant requests, feel janky (out-of-order
responses racing each other), and burn through rate limits. Debouncing
~550ms after the last keystroke means the check only fires once the user
has actually paused, which is both kinder to the API and gives a cleaner
UX signal (a spinner appears, then a single settled result).

**Why SVG for the village art instead of an image/sprite sheet?**
SVG shapes scale losslessly at any screen size (important for the
responsive desktop/mobile requirement), can be styled and animated purely
with CSS transforms/keyframes (GPU-accelerated, no canvas redraw loop
needed), and ship as a few KB of inline markup instead of image assets to
download. It also means every "building" is addressable as a real DOM node,
so the animation controller can target `#townHall`, `#hut1`, etc. directly
with class toggles rather than managing sprite coordinates.

**Why is nothing "AI-generated random" in the Builder's suggestion?**
The brief for that feature is trust-building: users are more likely to
adopt a suggested password if they can see their own password reflected in
it, rather than being handed an unrelated string they'd have to memorize
from scratch. The mutation logic (capitalize a letter, leet-substitute a
few characters, insert a symbol, append a short suffix) is deliberately
simple and deterministic-ish so the relationship between "what I typed" and
"what I got back" stays legible.

---

## What this project is *not*

- Not affiliated with, endorsed by, or using any assets from Supercell's
  Clash of Clans — the art style is an original interpretation inspired by
  the "medieval siege village" genre, built from scratch in SVG/CSS.
- Not a password manager or vault — nothing is stored, persisted, or sent
  anywhere except the 5-character hash prefix described above.
- Not a substitute for a real password manager with randomly generated,
  unique passwords per site — it's an educational/demo tool for
  understanding what makes a password strong.
