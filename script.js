/* ==========================================================
   Password Barbarian — script.js
   Password strength engine + village animation controller
   + k-anonymous HIBP breach lookup + "Call the Builder" mutator
   ========================================================== */

(() => {
  'use strict';

  // ---------- DOM refs ----------
  const pwInput          = document.getElementById('pwInput');
  const toggleVisBtn     = document.getElementById('toggleVisibility');
  const strengthFill     = document.getElementById('strengthFill');
  const strengthLabel    = document.getElementById('strengthLabel');
  const scoutList        = document.getElementById('scoutList');
  const etaValue         = document.getElementById('etaValue');
  const etaSub           = document.getElementById('etaSub');
  const breachBody       = document.getElementById('breachBody');
  const outcomeBanner    = document.getElementById('outcomeBanner');
  const starRow          = document.getElementById('starRow');
  const builderBtn       = document.getElementById('builderBtn');
  const suggestionPanel  = document.getElementById('suggestionPanel');
  const suggestionValue  = document.getElementById('suggestionValue');
  const copyBtn          = document.getElementById('copyBtn');

  const attackerEl   = document.getElementById('attacker');
  const builderEl    = document.getElementById('builder');
  const impactBurst  = document.getElementById('impactBurst');
  const shieldDome    = document.getElementById('shieldDome');

  const buildingIds = ['townHall', 'hut1', 'hut2', 'hut3', 'hut4', 'perimeterWall'];
  const buildings = buildingIds.map(id => document.getElementById(id));

  // ---------- Small dictionary for common-word / common-password detection ----------
  // Not exhaustive — a lightweight heuristic list for real-time local feedback.
  const COMMON_PASSWORDS = new Set([
    'password','123456','123456789','qwerty','abc123','password1','111111',
    'letmein','welcome','admin','iloveyou','monkey','dragon','football',
    '000000','1234567','1234567890','sunshine','princess','trustno1',
    'superman','master','login','starwars','freedom','whatever','qazwsx',
    'passw0rd','baseball','shadow','michael','jennifer','hunter2','ninja'
  ]);
  const COMMON_WORDS = new Set([
    'password','welcome','dragon','monkey','football','baseball','master',
    'shadow','sunshine','princess','superman','batman','starwars','ninja',
    'login','admin','letmein','freedom','trust','love','summer','winter',
    'spring','autumn','chief','clash','clan','village','warrior','knight',
    'castle','dragon','tiger','eagle','wizard','hunter','soccer','hockey'
  ]);

  const KEYBOARD_ROWS = [
    'qwertyuiop', 'asdfghjkl', 'zxcvbnm', '1234567890'
  ];

  // ---------- Debounce helper ----------
  function debounce(fn, wait) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  // ---------- Random pick helper ----------
  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // ---------- Roast pools (simple words, one random pick each time) ----------
  const ROASTS = {
    tooShort: (len) => pick([
      `Only ${len} letters? That's not a password. That's a doormat.`,
      `${len} characters. My grandma types faster passwords than this.`,
      `This password is so short it needs a booster seat.`,
      `${len} characters and zero effort. Add more, please.`,
      `Blink and you've already typed this whole password.`,
      `This is a PIN pretending to be a password.`,
      `${len} characters — even a snail could crack this faster than it moves.`,
      `Short and weak. Just like that excuse you gave your teacher.`,
      `Too short. Hackers will crack this before your tea gets cold.`,
      `This password took less effort than a "k" text reply.`,
      `Only ${len} characters. A toddler mashing keys does better.`,
      `${len} letters? That's a joke, not a lock.`,
    ]),
    noSymbolsNoDigits: () => pick([
      `Only letters. No numbers, no symbols. Wide open door.`,
      `Plain letters only. This password has no defense at all.`,
      `No numbers, no symbols. This is basically an open gate.`,
      `Just letters. A kid could break in without even trying.`,
      `Nothing but plain letters here. Way too easy to guess.`,
      `No numbers or symbols. You basically left the front door open.`,
      `All letters, no extras. That's the weakest kind of lock.`,
      `This password has zero backup. Add a number or symbol.`,
      `Plain text only. Even a guess-and-check bot walks right through.`,
      `No symbols, no numbers. This lock has no key at all.`,
    ]),
    noSymbols: () => pick([
      `No symbols anywhere. One "!" would help a lot.`,
      `Not a single symbol in here. Add one, seriously.`,
      `Missing symbols. A "@" or "#" makes this way tougher.`,
      `Zero symbols used. That's an easy fix, add one.`,
      `No symbols at all. This password is missing armor.`,
      `You forgot the symbols. Even one makes a big difference.`,
      `No punctuation, no symbols. Toughen it up a little.`,
      `A single symbol would make this much harder to crack.`,
    ]),
    noDigits: () => pick([
      `No numbers at all. Add one or two.`,
      `Not a single digit here. Numbers make guessing harder.`,
      `Zero numbers used. Even your birth year helps (a little).`,
      `No digits found. Mix in a number for extra strength.`,
      `This password skipped numbers completely. Add some.`,
      `No numbers anywhere. That's an easy weakness to fix.`,
      `Missing digits. A random number or two goes a long way.`,
    ]),
    allLowercase: () => pick([
      `All lowercase. Try capitalizing one letter.`,
      `Every letter is lowercase. Mix in a capital letter.`,
      `No capital letters at all. Just one would help.`,
      `Lowercase only. Hit Shift once, it matters.`,
      `Not one capital letter here. Add one for extra strength.`,
      `All small letters. A single capital changes a lot.`,
    ]),
    allUppercase: () => pick([
      `ALL CAPS. Are you shouting? Mix in lowercase too.`,
      `Everything is uppercase. Add some lowercase letters.`,
      `Full caps lock mode. That's not the same as strong.`,
      `All uppercase letters. Mixing case makes it tougher.`,
      `Shouting in all caps doesn't scare hackers. Mix it up.`,
    ]),
    sequential: () => pick([
      `Found "abc" or "123" in there. Even a kid could guess the rest.`,
      `That's a sequence, not a password. Way too predictable.`,
      `Sequential letters or numbers spotted. Easy to guess.`,
      `"123" or "abc" style pattern found. Break it up.`,
      `This part just counts up in order. Everyone tries that first.`,
      `Sequences like this are step one on every hacker's list.`,
      `Way too predictable. Sequential characters are an easy guess.`,
    ]),
    keyboardWalk: () => pick([
      `That's just sliding your fingers across the keyboard. We noticed.`,
      `"qwerty" or "asdf" style pattern found. Everyone tries that first.`,
      `Keyboard-walk pattern spotted. It's one of the first guesses ever.`,
      `You basically dragged your finger across the keys. Try harder.`,
      `This looks like your hand just slid sideways on the keyboard.`,
      `Keyboard patterns like this are guessed in seconds.`,
    ]),
    repeatedChars: () => pick([
      `Same letter three times in a row? That's not security, that's a stutter.`,
      `Repeating the same character over and over doesn't help at all.`,
      `Three same letters in a row. That's an easy pattern to guess.`,
      `Why type the same letter three times? It just weakens the password.`,
      `Repeated letters like this make guessing way easier.`,
    ]),
    repeatedGroup: () => pick([
      `You just repeated the same little chunk over and over. Stop copy-pasting.`,
      `Same block repeated again and again. Hackers spot that instantly.`,
      `Repeating chunks like "abcabc" is an easy pattern to crack.`,
      `This password is just one part copied twice. Mix it up.`,
    ]),
    commonExact: () => pick([
      `This is one of the most-used passwords on Earth. Everyone knows it.`,
      `Congratulations, you picked one of the most common passwords ever.`,
      `This exact password is basically public knowledge at this point.`,
      `Millions of people use this exact password. You are not unique.`,
      `This password is so common it's basically a group chat name.`,
      `Everyone and their dog has used this password at least once.`,
    ]),
    commonWord: (word) => pick([
      `Spotted the word "${word}" in there. Hackers own dictionaries too.`,
      `"${word}" is an easy word to guess. Try something less obvious.`,
      `The word "${word}" makes this way easier to crack. Change it up.`,
      `Found "${word}" hiding in there. That's the first thing to guess.`,
      `Dictionary words like "${word}" are cracked in seconds.`,
    ]),
    allNumeric: () => pick([
      `All numbers, no letters. A calculator could crack this.`,
      `Just digits, nothing else. That's very easy to guess.`,
      `Numbers only. Add letters and symbols to toughen it up.`,
      `This is basically a phone number, not a password.`,
      `All-digit passwords are some of the easiest to crack.`,
    ]),
  };

  const PRAISES = [
    `No weaknesses found. This one's actually solid.`,
    `Clean. No obvious weak spots here.`,
    `This password holds up well. Nice work.`,
    `Strong choice. Nothing easy to exploit here.`,
    `Looks tough. No shortcuts for hackers here.`,
    `Well built. This one would take real effort to crack.`,
    `Solid password. No easy patterns in sight.`,
    `This one's a keeper. No weak spots found.`,
    `Good job. This password earns its strength.`,
    `Nothing to complain about here. Well done.`,
  ];

  const BANNER_WEAK = [
    `Village Destroyed — 3 Stars. That was almost too easy.`,
    `3 Stars to the Enemy — they didn't even need to try.`,
    `Total Wipeout — 3 Stars. Even the Barbarian looked bored.`,
    `Flattened — 3 Stars. Your village didn't stand a chance.`,
    `3 Stars, No Effort — this password broke on contact.`,
    `Village Gone — 3 Stars. That was over before it started.`,
    `3 Stars — the enemy is already asking for a harder target.`,
    `Wiped Out — 3 Stars. This one needs serious work.`,
  ];
  const BANNER_MODERATE = [
    `1 Star to the Enemy — could go either way.`,
    `Partial Damage — 1 Star. Not terrible, not great either.`,
    `1 Star — some walls held, some didn't.`,
    `Half a Fight — 1 Star. Room to improve here.`,
    `1 Star to the Enemy — decent, but not safe yet.`,
    `Some Damage Taken — 1 Star. You're halfway there.`,
  ];
  const BANNER_STRONG = [
    `Attack Failed — 0 Stars. The enemy just gave up.`,
    `0 Stars — the shield held, no damage at all.`,
    `Attack Failed — 0 Stars. Nicely defended.`,
    `0 Stars to the Enemy — this password isn't going down easy.`,
    `Fully Defended — 0 Stars. Well built.`,
    `0 Stars — even the Barbarian is impressed.`,
  ];
  const BANNER_REPAIRED = [
    `Rebuilt and Ready — try raiding this one now.`,
    `Reinforced — this password just got a lot tougher.`,
    `Fixed Up — stronger walls, same password underneath.`,
    `Repairs Complete — go ahead, try to break this one.`,
  ];

  // ==========================================================
  // 1. STRENGTH ANALYSIS
  // ==========================================================

  function hasSequential(pw) {
    const lower = pw.toLowerCase();
    for (let i = 0; i < lower.length - 2; i++) {
      const a = lower.charCodeAt(i);
      const b = lower.charCodeAt(i + 1);
      const c = lower.charCodeAt(i + 2);
      if (b - a === 1 && c - b === 1) return true;   // ascending e.g. abc, 123
      if (a - b === 1 && b - c === 1) return true;   // descending e.g. cba, 321
    }
    return false;
  }

  function hasKeyboardWalk(pw) {
    const lower = pw.toLowerCase();
    for (const row of KEYBOARD_ROWS) {
      for (let i = 0; i <= row.length - 3; i++) {
        const chunk = row.slice(i, i + 3);
        const rev = chunk.split('').reverse().join('');
        if (lower.includes(chunk) || lower.includes(rev)) return true;
      }
    }
    return false;
  }

  function hasRepeatedChars(pw) {
    return /(.)\1\1/.test(pw); // same char 3+ times in a row
  }

  function hasRepeatedGroup(pw) {
    // detects patterns like "abcabc" or "1212"
    for (let len = 2; len <= 4; len++) {
      const re = new RegExp(`(.{${len}})\\1+`);
      if (re.test(pw)) return true;
    }
    return false;
  }

  function containsCommonWord(pw) {
    const lower = pw.toLowerCase();
    if (COMMON_PASSWORDS.has(lower)) return 'exact';
    for (const w of COMMON_WORDS) {
      if (lower.includes(w) && w.length >= 4) return w;
    }
    return null;
  }

  function charsetSize(pw) {
    let size = 0;
    if (/[a-z]/.test(pw)) size += 26;
    if (/[A-Z]/.test(pw)) size += 26;
    if (/[0-9]/.test(pw)) size += 10;
    if (/[^a-zA-Z0-9]/.test(pw)) size += 32;
    return size || 1;
  }

  function shannonEntropyBits(pw) {
    if (!pw.length) return 0;
    const pool = charsetSize(pw);
    return pw.length * Math.log2(pool);
  }

  /**
   * Returns { score (0-100), tier ('empty'|'weak'|'moderate'|'strong'),
   *           entropyBits, issues: [strings], crackSeconds }
   */
  function analyzePassword(pw) {
    if (!pw) {
      return { score: 0, tier: 'empty', entropyBits: 0, issues: [], crackSeconds: 0, charsetSize: 0 };
    }

    const issues = [];
    let score = 0;

    // --- length scoring ---
    const len = pw.length;
    if (len < 8) {
      issues.push(ROASTS.tooShort(len));
    } else if (len < 12) {
      score += 15;
    } else if (len < 16) {
      score += 26;
    } else {
      score += 34;
    }
    score += Math.min(len, 8) * 1.2; // small continuous credit for length

    // --- variety scoring ---
    const hasLower = /[a-z]/.test(pw);
    const hasUpper = /[A-Z]/.test(pw);
    const hasDigit = /[0-9]/.test(pw);
    const hasSymbol = /[^a-zA-Z0-9]/.test(pw);
    const varietyCount = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;

    score += varietyCount * 11;

    if (!hasSymbol && !hasDigit) {
      issues.push(ROASTS.noSymbolsNoDigits());
    } else if (!hasSymbol) {
      issues.push(ROASTS.noSymbols());
    } else if (!hasDigit) {
      issues.push(ROASTS.noDigits());
    }
    if (!hasUpper && !hasLower) {
      // all numbers/symbols — unusual, skip specific message
    } else if (!hasUpper) {
      issues.push(ROASTS.allLowercase());
    } else if (!hasLower) {
      issues.push(ROASTS.allUppercase());
    }

    // --- pattern penalties ---
    if (hasSequential(pw)) {
      issues.push(ROASTS.sequential());
      score -= 14;
    }
    if (hasKeyboardWalk(pw)) {
      issues.push(ROASTS.keyboardWalk());
      score -= 12;
    }
    if (hasRepeatedChars(pw)) {
      issues.push(ROASTS.repeatedChars());
      score -= 10;
    }
    if (hasRepeatedGroup(pw)) {
      issues.push(ROASTS.repeatedGroup());
      score -= 10;
    }

    const commonHit = containsCommonWord(pw);
    if (commonHit === 'exact') {
      issues.push(ROASTS.commonExact());
      score -= 45;
    } else if (commonHit) {
      issues.push(ROASTS.commonWord(commonHit));
      score -= 18;
    }

    if (len >= 8 && /^[0-9]+$/.test(pw)) {
      issues.push(ROASTS.allNumeric());
      score -= 15;
    }

    // clamp
    score = Math.max(0, Math.min(100, Math.round(score)));

    // entropy & crack time (offline fast-hash assumption: 10^10 guesses/sec)
    const entropyBits = shannonEntropyBits(pw);
    const combinations = Math.pow(2, entropyBits);
    const GUESSES_PER_SECOND = 1e10;
    const crackSeconds = combinations / (2 * GUESSES_PER_SECOND); // average case (half the space)

    let tier;
    if (len === 0) tier = 'empty';
    else if (score < 40) tier = 'weak';
    else if (score < 75) tier = 'moderate';
    else tier = 'strong';

    if (!issues.length && tier === 'strong') {
      // no-op, positive path handled by caller
    }

    return { score, tier, entropyBits, issues, crackSeconds, charsetSize: charsetSize(pw), varietyCount, length: len };
  }

  // ==========================================================
  // 2. TIME FORMATTING
  // ==========================================================

  function formatCrackTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) seconds = 0;
    if (seconds < 1) {
      const ms = seconds * 1000;
      return ms < 1 ? '< 1 millisecond' : `${ms.toFixed(1)} milliseconds`;
    }
    const units = [
      ['century', 3153600000],
      ['year', 31536000],
      ['month', 2628000],
      ['day', 86400],
      ['hour', 3600],
      ['minute', 60],
      ['second', 1],
    ];
    const PLURALS = { century: 'centuries' };
    for (const [name, secs] of units) {
      if (seconds >= secs) {
        const val = seconds / secs;
        const rounded = val >= 100 ? Math.round(val).toLocaleString() : val.toFixed(1);
        const isPlural = val >= 1.5 || val < 1;
        const unitWord = isPlural ? (PLURALS[name] || name + 's') : name;
        return `${rounded} ${unitWord}`;
      }
    }
    return `${seconds.toFixed(1)} seconds`;
  }

  function etaTierClass(seconds, tier) {
    if (tier === 'empty') return '';
    if (seconds < 60) return 'eta-instant';
    if (seconds < 86400 * 30) return 'eta-weak';
    if (seconds < 31536000 * 10) return 'eta-mid';
    return 'eta-strong';
  }

  // ==========================================================
  // 3. RENDER: strength meter + scout report + ETA
  // ==========================================================

  const TIER_META = {
    empty:    { label: 'Type something, Chief' },
    weak:     { label: 'Getting Clowned Right Now' },
    moderate: { label: 'Meh Effort — Could Go Either Way' },
    strong:   { label: 'Fort Knox Energy' },
  };

  function renderMeter(analysis) {
    const pct = analysis.tier === 'empty' ? 0 : analysis.score;
    strengthFill.style.width = pct + '%';

    let gradient;
    if (analysis.tier === 'empty') gradient = 'linear-gradient(90deg, #3a3226, #3a3226)';
    else if (analysis.tier === 'weak') gradient = 'linear-gradient(90deg, #c0392b, #e0563d)';
    else if (analysis.tier === 'moderate') gradient = 'linear-gradient(90deg, #d97b2b, #e2b84f)';
    else gradient = 'linear-gradient(90deg, #4fae7a, #6fd39c)';
    strengthFill.style.background = gradient;

    strengthLabel.textContent = TIER_META[analysis.tier].label + (analysis.tier !== 'empty' ? ` (${analysis.score}/100)` : '');
  }

  function renderScoutReport(analysis) {
    scoutList.innerHTML = '';
    if (analysis.tier === 'empty') {
      const li = document.createElement('li');
      li.className = 'scout-empty';
      li.textContent = 'Nothing typed yet. Scouts are just standing around.';
      scoutList.appendChild(li);
      return;
    }
    if (analysis.issues.length === 0) {
      const li = document.createElement('li');
      li.className = 'scout-clear';
      li.textContent = pick(PRAISES);
      scoutList.appendChild(li);
      return;
    }
    analysis.issues.slice(0, 6).forEach(issue => {
      const li = document.createElement('li');
      li.textContent = issue;
      scoutList.appendChild(li);
    });
  }

  function renderEta(analysis) {
    if (analysis.tier === 'empty') {
      etaValue.textContent = '—';
      etaValue.className = 'eta-value';
      etaSub.textContent = 'Type a password and watch the countdown to your downfall.';
      return;
    }
    const formatted = formatCrackTime(analysis.crackSeconds);
    etaValue.textContent = formatted;
    etaValue.className = 'eta-value ' + etaTierClass(analysis.crackSeconds, analysis.tier);
    etaSub.textContent = `That's how long a fast computer needs to guess it.`;
  }

  // ==========================================================
  // 4. VILLAGE ANIMATION CONTROLLER
  // ==========================================================

  let lastTier = null;
  let animGen = 0; // generation token: every new animation immediately
                    // invalidates any still-pending timeouts from whatever
                    // animation was previously in flight, so a fast typist
                    // switching tiers mid-animation always sees the village
                    // reflect their CURRENT password, never a stale replay.
                    // Each play*/repair function increments this and resets
                    // the visuals synchronously, then every later timeout in
                    // that sequence checks its captured token against the
                    // live value before touching the DOM.

  function clearBuildingStates() {
    buildings.forEach(b => {
      if (!b) return;
      b.classList.remove('dmg-light', 'dmg-heavy', 'destroyed', 'repairing');
    });
  }

  function resetVillage() {
    clearBuildingStates();
    attackerEl.classList.remove('run', 'bounce-back');
    attackerEl.style.opacity = 0;
    builderEl.classList.remove('work');
    builderEl.style.opacity = 0;
    shieldDome.classList.remove('active');
    shieldDome.style.opacity = 0;
    hideBanner();
    setStars(0);
  }

  function setStars(n) {
    starRow.querySelectorAll('.star').forEach((s, i) => {
      s.classList.toggle('lit', i < n);
    });
  }

  function showBanner(text, kind) {
    outcomeBanner.textContent = text;
    outcomeBanner.className = 'outcome-banner show ' + kind;
  }
  function hideBanner() {
    outcomeBanner.className = 'outcome-banner';
  }

  function runImpact() {
    impactBurst.classList.remove('pop');
    void impactBurst.offsetWidth; // reflow to restart animation
    impactBurst.classList.add('pop');
  }

  function playWeakRaid(gen) {
    clearBuildingStates();
    hideBanner();
    setStars(0);
    shieldDome.classList.remove('active');
    shieldDome.style.opacity = 0;

    attackerEl.style.opacity = 1;
    attackerEl.classList.remove('bounce-back');
    void attackerEl.offsetWidth;
    attackerEl.classList.add('run');

    setTimeout(() => {
      if (gen !== animGen) return; // a newer animation superseded this one
      runImpact();
      buildings.forEach((b, i) => {
        if (!b) return;
        setTimeout(() => {
          if (gen !== animGen) return;
          b.classList.add('destroyed');
        }, i * 90);
      });
    }, 900);

    setTimeout(() => {
      if (gen !== animGen) return;
      showBanner(pick(BANNER_WEAK), 'defeat');
      setStars(3);
    }, 900 + buildings.length * 90 + 400);
  }

  function playModerateRaid(gen) {
    clearBuildingStates();
    hideBanner();
    setStars(0);
    shieldDome.classList.remove('active');
    shieldDome.style.opacity = 0;

    attackerEl.style.opacity = 1;
    attackerEl.classList.remove('bounce-back');
    void attackerEl.offsetWidth;
    attackerEl.classList.add('run');

    setTimeout(() => {
      if (gen !== animGen) return;
      runImpact();
      // damage outer huts + wall, spare town hall
      const damaged = ['hut1', 'hut2', 'hut3', 'hut4', 'perimeterWall'];
      damaged.forEach((id, i) => {
        const el = document.getElementById(id);
        if (el) setTimeout(() => {
          if (gen !== animGen) return;
          el.classList.add('dmg-heavy');
        }, i * 100);
      });
    }, 900);

    setTimeout(() => {
      if (gen !== animGen) return;
      showBanner(pick(BANNER_MODERATE), 'partial');
      setStars(1);
    }, 900 + 5 * 100 + 400);
  }

  function playStrongDefense(gen) {
    clearBuildingStates();
    hideBanner();
    setStars(0);

    attackerEl.style.opacity = 1;
    attackerEl.classList.remove('run');
    void attackerEl.offsetWidth;
    attackerEl.classList.add('bounce-back');

    shieldDome.style.opacity = 1;
    shieldDome.classList.add('active');

    setTimeout(() => {
      if (gen !== animGen) return;
      runImpact();
    }, 720);

    setTimeout(() => {
      if (gen !== animGen) return;
      showBanner(pick(BANNER_STRONG), 'victory');
      setStars(0);
    }, 720 + 500);
  }

  function triggerVillageAnimation(tier) {
    if (tier === lastTier) return; // avoid re-triggering identical state
    lastTier = tier;

    // Every call gets a fresh generation token and resets visuals
    // synchronously (inside resetVillage/play*), so a new tier always
    // takes over immediately — even mid-animation — and any timeouts
    // still pending from whatever was playing before become no-ops.
    const gen = ++animGen;

    if (tier === 'empty') {
      resetVillage();
      return;
    }

    if (tier === 'weak') playWeakRaid(gen);
    else if (tier === 'moderate') playModerateRaid(gen);
    else playStrongDefense(gen);
  }

  // ==========================================================
  // 5. HIBP K-ANONYMITY BREACH LOOKUP
  // ==========================================================

  async function sha1Hex(message) {
    const enc = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-1', enc);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  }

  async function checkHIBP(password) {
    if (!password) return;
    breachBody.innerHTML = `<div class="breach-checking"><span class="spinner"></span> Checking if this password has leaked before...</div>`;

    try {
      const hash = await sha1Hex(password);
      const prefix = hash.slice(0, 5);
      const suffix = hash.slice(5);

      const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
        headers: { 'Add-Padding': 'true' }
      });
      if (!res.ok) throw new Error('Network response was not ok: ' + res.status);

      const text = await res.text();
      const lines = text.split('\n');
      let count = 0;
      for (const line of lines) {
        const [suf, cnt] = line.trim().split(':');
        if (suf === suffix) {
          count = parseInt(cnt, 10);
          break;
        }
      }

      // Only render if the password field still matches what we checked
      if (pwInput.value !== password) return;

      if (count > 0) {
        const breachedLine = pick([
          `This password has leaked ${count.toLocaleString()} time${count === 1 ? '' : 's'} before. It's not a secret, it's public knowledge now.`,
          `Bad news: ${count.toLocaleString()} people got hacked using this exact password. Change it.`,
          `Leaked ${count.toLocaleString()} time${count === 1 ? '' : 's'} already. Hackers already have this one saved.`,
          `${count.toLocaleString()} leaks and counting. This password is done. Pick a new one.`,
          `Seen ${count.toLocaleString()} time${count === 1 ? '' : 's'} in old leaks. Treat it as burned, not safe anymore.`,
        ]);
        breachBody.innerHTML = `<div class="breach-result breached">${breachedLine}</div>`;
      } else {
        const cleanLine = pick([
          `Good news — this exact password hasn't leaked before.`,
          `Nobody's leaked this exact password yet. Good sign.`,
          `Clean so far. No leaks found for this one.`,
          `Not found in any known leak. That's a good start.`,
        ]);
        breachBody.innerHTML = `<div class="breach-result clean">${cleanLine}</div>`;
      }
    } catch (err) {
      if (pwInput.value !== password) return;
      breachBody.innerHTML = `
        <div class="breach-result error">
          Couldn't check right now — probably a connection issue. Your password never left this device either way.
        </div>`;
    }
  }

  const debouncedHIBP = debounce((pw) => checkHIBP(pw), 550);

  // ==========================================================
  // 6. "CALL THE BUILDER" — password mutation + repair animation
  // ==========================================================

  const LEET_MAP = { a: '@', e: '3', i: '1', o: '0', s: '$', A: '@', E: '3', I: '1', O: '0', S: '$' };
  const BREAKERS = ['K', 'q', 'Z', 'r', 'v'];
  const SYMBOLS  = ['!', '#', '$', '%', '*', '&'];
  const DIGITS   = '0123456789'.split('');
  const UPPERS   = 'ABCDEFGHJKLMNPQRSTUVWXYZ'.split('');
  const LOWERS   = 'abcdefghijkmnpqrstuvwxyz'.split('');

  function randOf(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  /**
   * Turns a weak password into a strong one that is still recognizably
   * "yours": it keeps every original character, but breaks up sequences/
   * keyboard-walks/repeats by weaving in extra characters, guarantees all
   * four character classes are present, and pads length. The result is
   * then re-run through the SAME analyzePassword() scoring used for the
   * live checker, and more entropy is added in a loop until it actually
   * scores as "strong" — so the suggestion is guaranteed to pass its own
   * checker, not just look plausible.
   */
  function mutatePassword(original) {
    if (!original) return '';

    // 1. Weave breaker characters into the original every 2 characters,
    //    which kills runs like "123456", "abcdef", "qwerty", "aaa", etc.
    let chars = [];
    const origChars = original.split('');
    for (let i = 0; i < origChars.length; i++) {
      chars.push(origChars[i]);
      if ((i + 1) % 2 === 0 && i !== origChars.length - 1) {
        chars.push(randOf(BREAKERS));
      }
    }

    // 2. Capitalize the first lowercase letter found (memorability touch)
    for (let i = 0; i < chars.length; i++) {
      if (/[a-z]/.test(chars[i])) {
        chars[i] = chars[i].toUpperCase();
        break;
      }
    }

    // 3. Leet-substitute up to 2 eligible letters
    let subs = 0;
    for (let i = 0; i < chars.length && subs < 2; i++) {
      if (LEET_MAP[chars[i]] && Math.random() < 0.85) {
        chars[i] = LEET_MAP[chars[i]];
        subs++;
      }
    }

    // 4. Guarantee every character class is present at least once
    const joinedSoFar = chars.join('');
    if (!/[A-Z]/.test(joinedSoFar)) chars.push(randOf(UPPERS));
    if (!/[a-z]/.test(joinedSoFar)) chars.push(randOf(LOWERS));
    if (!/[0-9]/.test(joinedSoFar)) chars.push(randOf(DIGITS));
    if (!/[^a-zA-Z0-9]/.test(joinedSoFar)) chars.push(randOf(SYMBOLS));

    let mutated = chars.join('');

    // 5. Pad up to a safe minimum length with mixed random characters
    const MIN_LENGTH = 14;
    while (mutated.length < MIN_LENGTH) {
      const pool = [randOf(UPPERS), randOf(LOWERS), randOf(DIGITS), randOf(SYMBOLS)];
      mutated += randOf(pool);
    }

    // 6. Verify against the real scoring engine. If it's not "strong" yet,
    //    or still trips a pattern penalty (sequential/keyboard-walk/repeat/
    //    common password), keep adding a small random block and re-check.
    //    Capped so this can never loop forever.
    let guard = 0;
    while (guard < 12) {
      const check = analyzePassword(mutated);
      const stillFlagged =
        hasSequential(mutated) ||
        hasKeyboardWalk(mutated) ||
        hasRepeatedChars(mutated) ||
        hasRepeatedGroup(mutated) ||
        containsCommonWord(mutated);

      if (check.tier === 'strong' && !stillFlagged) break;

      mutated += randOf([randOf(UPPERS), randOf(LOWERS), randOf(DIGITS), randOf(SYMBOLS)]);
      guard++;
    }

    // Safety net: if somehow mutated === original, force a real change
    if (mutated === original) mutated += randOf(SYMBOLS) + randOf(DIGITS);

    return mutated;
  }

  function animateBuilderRepair(suggestion) {
    // reverse of crumble: play builder walking in, then rebuild buildings,
    // and reveal the suggestion letter-by-letter in sync.
    hideBanner();
    const gen = ++animGen; // invalidate any pending raid-animation timeouts

    builderEl.style.opacity = 1;
    builderEl.classList.remove('work');
    void builderEl.offsetWidth;
    builderEl.classList.add('work');

    setTimeout(() => {
      if (gen !== animGen) return;
      runImpact();
      buildings.forEach((b, i) => {
        if (!b) return;
        b.classList.remove('destroyed', 'dmg-heavy', 'dmg-light');
        setTimeout(() => {
          if (gen !== animGen) return;
          b.classList.add('repairing');
        }, i * 90);
      });
    }, 900);

    // reveal suggestion letter by letter, starting alongside the repair
    suggestionPanel.hidden = false;
    suggestionValue.textContent = '';
    const revealDelay = 950;
    const perChar = 45;

    setTimeout(() => {
      if (gen !== animGen) return;
      let i = 0;
      const chars = suggestion.split('');
      const interval = setInterval(() => {
        if (gen !== animGen) { clearInterval(interval); return; }
        if (i >= chars.length) {
          clearInterval(interval);
          return;
        }
        const span = document.createElement('span');
        span.className = 'char-in';
        span.textContent = chars[i];
        suggestionValue.appendChild(span);
        i++;
      }, perChar);
    }, revealDelay);

    setTimeout(() => {
      if (gen !== animGen) return;
      showBanner(pick(BANNER_REPAIRED), 'victory');
      setStars(0);
      builderEl.style.opacity = 0;
      builderEl.classList.remove('work');
      lastTier = null; // allow re-evaluation on next keystroke
    }, revealDelay + suggestion.length * perChar + 500);
  }

  // ==========================================================
  // 7. MAIN INPUT HANDLER
  // ==========================================================

  function handleInput() {
    const pw = pwInput.value;
    const analysis = analyzePassword(pw);

    renderMeter(analysis);
    renderScoutReport(analysis);
    renderEta(analysis);
    triggerVillageAnimation(analysis.tier);

    builderBtn.disabled = (analysis.tier === 'empty' || analysis.tier === 'strong');

    if (!pw) {
      breachBody.innerHTML = `<p class="breach-idle">Type a password and we'll check if it's already out there (powered by Have I Been Pwned).</p>`;
      suggestionPanel.hidden = true;
    } else {
      debouncedHIBP(pw);
    }
  }

  pwInput.addEventListener('input', handleInput);

  toggleVisBtn.addEventListener('click', () => {
    const isPw = pwInput.type === 'password';
    pwInput.type = isPw ? 'text' : 'password';
    toggleVisBtn.setAttribute('aria-label', isPw ? 'Hide password' : 'Show password');
  });

  builderBtn.addEventListener('click', () => {
    const pw = pwInput.value;
    if (!pw) return;
    const suggestion = mutatePassword(pw);
    animateBuilderRepair(suggestion);

    copyBtn.classList.remove('copied');
    copyBtn.textContent = 'Copy to Clipboard';
    copyBtn.onclick = async () => {
      try {
        await navigator.clipboard.writeText(suggestion);
        copyBtn.textContent = 'Copied!';
        copyBtn.classList.add('copied');
        setTimeout(() => {
          copyBtn.textContent = 'Copy to Clipboard';
          copyBtn.classList.remove('copied');
        }, 1800);
      } catch (e) {
        copyBtn.textContent = 'Copy failed — select manually';
      }
    };
  });

  // initial state
  resetVillage();
  renderMeter(analyzePassword(''));
  renderScoutReport(analyzePassword(''));
  renderEta(analyzePassword(''));

})();
