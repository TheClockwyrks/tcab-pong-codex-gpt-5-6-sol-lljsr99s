# Carom

Carom is a top-down paddle duel built for the browser. Curve the ball by striking it while your paddle is moving, then use two swaying, rotating obstacles to turn each rally into a bank-shot puzzle. Play solo against the circuit or share the keyboard for local versus play. A match is first to 11, win by two.

## Run it

```bash
npm ci
npm run dev
```

Vite prints the local development URL. To make the self-contained production site:

```bash
npm run build
```

The finished site is written to `dist/`. `npm run preview` serves that build locally.

## Controls

- Player one: `W` / `S`
- Player two: `↑` / `↓` (these also move player one in Solo)
- Confirm: `Enter` or `Space`
- Pause/resume: `P` or `Escape`
- Mute: `M`
- Menus: either player's movement keys, mouse, or touch

The backtick key opens the engine diagnostics overlay.
