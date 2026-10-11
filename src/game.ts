import type {
  Game,
  InitApi,
  RenderApi,
  UpdateApi,
} from "@clockwyrks/simple-2d";
import type { DeepReadonly } from "ts-essentials";
import * as K from "./constants";

export type Screen =
  "title" | "howto" | "countdown" | "playing" | "paused" | "matchover";
export type Mode = "solo" | "versus";
export type Side = "left" | "right";
export interface PaddleState {
  readonly cy: number;
  readonly vy: number;
  readonly driven: boolean;
  readonly drivenVy: number;
}
export interface AiState {
  readonly tracking: boolean;
  readonly movement: boolean;
}
export interface TrailSample {
  readonly x: number;
  readonly y: number;
  readonly t: number;
}
export interface BallState {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly spin: number;
  readonly held: boolean;
  readonly holdTimer: number;
  readonly serveSign: 1 | -1;
  readonly trail: readonly TrailSample[];
}
export interface ObstacleState {
  readonly index: number;
  readonly cx: number;
  readonly cy: number;
  readonly theta: number;
}
export interface CaromState {
  readonly screen: Screen;
  readonly mode: Mode;
  readonly menuIndex: number;
  readonly titleIndex: number;
  readonly resumeScreen: "countdown" | "playing";
  readonly score: { readonly p1: number; readonly p2: number };
  readonly winner: Side | null;
  readonly paddles: { readonly left: PaddleState; readonly right: PaddleState };
  readonly ai: AiState;
  readonly receiver: Side;
  readonly ball: BallState | null;
  readonly obstacles: readonly ObstacleState[];
  readonly obstacleClock: number;
  readonly obstacleClockRunning: boolean;
  readonly simTime: number;
  readonly muted: boolean;
}
type RO = DeepReadonly<CaromState>;
type Pose = (s: RO) => CaromState;
export interface CaromDebugApi {
  readonly version: number;
  clearWorld: Pose;
  spawnBall: Pose;
  spawnObstacle: (s: RO, i: number) => CaromState;
  reset: Pose;
  reconcile: Pose;
  setScreen: (s: RO, v: Screen) => CaromState;
  setMode: (s: RO, v: Mode) => CaromState;
  setMenuIndex: (s: RO, v: number) => CaromState;
  setTitleIndex: (s: RO, v: number) => CaromState;
  setResumeScreen: (s: RO, v: "countdown" | "playing") => CaromState;
  setScore: (s: RO, a: number, b: number) => CaromState;
  setWinner: (s: RO, v: Side | null) => CaromState;
  setReceiver: (s: RO, v: Side) => CaromState;
  setPaddleCy: (s: RO, v: Side, n: number) => CaromState;
  setPaddleVy: (s: RO, v: Side, n: number) => CaromState;
  setPaddleDriven: (s: RO, v: Side, n: boolean) => CaromState;
  setBallPosition: (s: RO, x: number, y: number) => CaromState;
  setBallVelocity: (s: RO, x: number, y: number) => CaromState;
  setBallSpin: (s: RO, v: number) => CaromState;
  setBallHeld: (s: RO, v: boolean) => CaromState;
  setBallHoldTimer: (s: RO, v: number) => CaromState;
  setBallServeSign: (s: RO, v: 1 | -1) => CaromState;
  drawBallServeSign: Pose;
  setAiTracking: (s: RO, v: boolean) => CaromState;
  setAiMovement: (s: RO, v: boolean) => CaromState;
  setMuted: (s: RO, v: boolean) => CaromState;
  setObstacleClock: (s: RO, v: number) => CaromState;
  setObstacleClockRunning: (s: RO, v: boolean) => CaromState;
  snapshot: (s: RO) => unknown;
  menuItemRect: (s: RO, i: number) => Rect | null;
}
interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
interface Ev {
  wall: boolean;
  paddle: boolean;
  obstacle: boolean;
}
export const BACKGROUND = "#07111f";
const TAU = Math.PI * 2;
const cl = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const sign = (): 1 | -1 => (Math.random() < 0.5 ? -1 : 1);
const cp = (s: RO): CaromState => ({
  ...s,
  score: { ...s.score },
  paddles: { left: { ...s.paddles.left }, right: { ...s.paddles.right } },
  ai: { ...s.ai },
  ball: s.ball
    ? { ...s.ball, trail: s.ball.trail.map((p) => ({ ...p })) }
    : null,
  obstacles: s.obstacles.map((o) => ({ ...o })),
});
const obstacle = (i: number, t: number): ObstacleState => {
  if (i !== 0 && i !== 1)
    throw Error(`Carom: obstacle index ${i} does not exist`);
  const p = K.OBSTACLE_CENTERS[i],
    q = K.OBSTACLE_SWAY_AMP * Math.sin((TAU * t) / K.OBSTACLE_SWAY_PERIOD);
  return {
    index: i,
    cx: p.x,
    cy: p.y + (i ? -q : q),
    theta: K.OBSTACLE_SPIN_RATE * t,
  };
};
const ball = (): BallState => ({
  x: K.FIELD_CX,
  y: K.FIELD_CY,
  vx: 0,
  vy: 0,
  spin: 0,
  held: true,
  holdTimer: K.HOLD_TIME,
  serveSign: sign(),
  trail: [],
});
const initial = (muted: boolean, titleIndex = 0, simTime = 0): CaromState => ({
  screen: "title",
  mode: "solo",
  menuIndex: titleIndex,
  titleIndex,
  resumeScreen: "playing",
  score: { p1: 0, p2: 0 },
  winner: null,
  paddles: {
    left: { cy: K.FIELD_CY, vy: 0, driven: false, drivenVy: 0 },
    right: { cy: K.FIELD_CY, vy: 0, driven: false, drivenVy: 0 },
  },
  ai: { tracking: true, movement: true },
  receiver: "left",
  ball: ball(),
  obstacles: [obstacle(0, 0), obstacle(1, 0)],
  obstacleClock: 0,
  obstacleClockRunning: true,
  simTime,
  muted,
});
const need = (s: RO) => {
  if (!s.ball) throw Error("Carom: no ball is present");
  return s.ball;
};
const wb = (
  s: RO,
  f: (b: DeepReadonly<BallState>) => BallState,
): CaromState => ({ ...cp(s), ball: f(need(s)) });
const wp = (s: RO, z: Side, p: Partial<PaddleState>): CaromState => ({
  ...cp(s),
  paddles: { ...s.paddles, [z]: { ...s.paddles[z], ...p } },
});
const count = (x: Screen) =>
  x === "title"
    ? 3
    : x === "howto"
      ? 1
      : x === "paused"
        ? 3
        : x === "matchover"
          ? 2
          : 0;
const rect = (x: Screen, i: number): Rect | null => {
  if (i < 0 || i >= count(x) || !Number.isInteger(i)) return null;
  const w = x === "howto" ? 250 : 360,
    h = 58,
    y =
      (x === "title" ? 360 : x === "howto" ? 585 : x === "paused" ? 330 : 400) +
      i * 72;
  return { x: K.FIELD_CX - w / 2, y, w, h };
};
export const debug: CaromDebugApi = {
  version: K.CAROM_DEBUG_VERSION,
  clearWorld: (s) => ({ ...cp(s), ball: null, obstacles: [] }),
  spawnBall: (s) => ({ ...cp(s), ball: ball() }),
  spawnObstacle: (s, i) => ({
    ...cp(s),
    obstacles: [
      ...s.obstacles.filter((o) => o.index !== i).map((o) => ({ ...o })),
      obstacle(i, s.obstacleClock),
    ].sort((a, b) => a.index - b.index),
  }),
  reset: (s) => initial(s.muted),
  reconcile: (s) => ({
    ...cp(s),
    obstacles: s.obstacles.map((o) => obstacle(o.index, s.obstacleClock)),
  }),
  setScreen: (s, screen) => ({ ...cp(s), screen }),
  setMode: (s, mode) => ({ ...cp(s), mode }),
  setMenuIndex: (s, menuIndex) => ({ ...cp(s), menuIndex }),
  setTitleIndex: (s, titleIndex) => ({ ...cp(s), titleIndex }),
  setResumeScreen: (s, resumeScreen) => ({ ...cp(s), resumeScreen }),
  setScore: (s, p1, p2) => ({ ...cp(s), score: { p1, p2 } }),
  setWinner: (s, winner) => ({ ...cp(s), winner }),
  setReceiver: (s, receiver) => ({ ...cp(s), receiver }),
  setPaddleCy: (s, z, cy) => wp(s, z, { cy }),
  setPaddleVy: (s, z, drivenVy) => wp(s, z, { drivenVy }),
  setPaddleDriven: (s, z, driven) => wp(s, z, { driven }),
  setBallPosition: (s, x, y) =>
    wb(s, (b) => ({ ...b, x, y, trail: [...b.trail] })),
  setBallVelocity: (s, vx, vy) =>
    wb(s, (b) => ({ ...b, vx, vy, trail: [...b.trail] })),
  setBallSpin: (s, spin) => wb(s, (b) => ({ ...b, spin, trail: [...b.trail] })),
  setBallHeld: (s, held) => wb(s, (b) => ({ ...b, held, trail: [...b.trail] })),
  setBallHoldTimer: (s, holdTimer) =>
    wb(s, (b) => ({ ...b, holdTimer, trail: [...b.trail] })),
  setBallServeSign: (s, serveSign) =>
    wb(s, (b) => ({ ...b, serveSign, trail: [...b.trail] })),
  drawBallServeSign: (s) =>
    wb(s, (b) => ({ ...b, serveSign: sign(), trail: [...b.trail] })),
  setAiTracking: (s, tracking) => ({ ...cp(s), ai: { ...s.ai, tracking } }),
  setAiMovement: (s, movement) => ({ ...cp(s), ai: { ...s.ai, movement } }),
  setMuted: (s, muted) => ({ ...cp(s), muted }),
  setObstacleClock: (s, obstacleClock) => ({
    ...cp(s),
    obstacleClock,
    obstacles: s.obstacles.map((o) => obstacle(o.index, obstacleClock)),
  }),
  setObstacleClockRunning: (s, obstacleClockRunning) => ({
    ...cp(s),
    obstacleClockRunning,
  }),
  snapshot: (s) => ({
    ...cp(s),
    version: K.CAROM_DEBUG_VERSION,
    ball: s.ball
      ? {
          ...s.ball,
          trail: s.ball.trail.map((p) => ({ ...p })),
          speed: Math.hypot(s.ball.vx, s.ball.vy),
        }
      : null,
  }),
  menuItemRect: (s, i) => rect(s.screen, i),
};
const title = (s: RO) => ({
  ...initial(s.muted, s.titleIndex, s.simTime),
  menuIndex: s.titleIndex,
});
const start = (s: RO, mode: Mode): CaromState => ({
  ...cp(s),
  screen: "countdown",
  mode,
  menuIndex: 0,
  resumeScreen: "playing",
  score: { p1: 0, p2: 0 },
  winner: null,
  receiver: "left",
  ball: ball(),
  paddles: {
    left: { ...s.paddles.left, cy: K.FIELD_CY, vy: 0 },
    right: { ...s.paddles.right, cy: K.FIELD_CY, vy: 0 },
  },
  obstacleClock: 0,
  obstacleClockRunning: true,
  obstacles: s.obstacles.map((o) => obstacle(o.index, 0)),
});
const confirm = (s: RO): CaromState => {
  if (s.screen === "title") {
    const n = { ...cp(s), titleIndex: s.menuIndex };
    return s.menuIndex === 0
      ? start(n, "solo")
      : s.menuIndex === 1
        ? start(n, "versus")
        : { ...n, screen: "howto", menuIndex: 0 };
  }
  if (s.screen === "howto") return title(s);
  if (s.screen === "paused")
    return s.menuIndex === 0
      ? { ...cp(s), screen: s.resumeScreen }
      : s.menuIndex === 1
        ? start(s, s.mode)
        : title(s);
  if (s.screen === "matchover")
    return s.menuIndex === 0 ? start(s, s.mode) : title(s);
  return cp(s);
};
function input(s: RO, a: UpdateApi): CaromState {
  let n = cp(s);
  if (a.input.pressed("mute")) {
    a.audio.setMuted(!a.audio.muted());
    n = { ...n, muted: a.audio.muted() };
  }
  const up = a.input.pressed("p1-up") || a.input.pressed("p2-up"),
    down = a.input.pressed("p1-down") || a.input.pressed("p2-down"),
    ok = a.input.pressed("confirm"),
    pause = a.input.pressed("pause"),
    back = a.input.pressed("back");
  if ((s.screen === "countdown" || s.screen === "playing") && pause)
    return { ...n, resumeScreen: s.screen, screen: "paused", menuIndex: 0 };
  if (s.screen === "paused" && (pause || back))
    return { ...n, screen: s.resumeScreen };
  if (s.screen === "howto" && (ok || back)) return title(n);
  if (s.screen === "matchover" && back) return title(n);
  const c = count(s.screen);
  if (c && s.screen !== "howto") {
    if (up) n = { ...n, menuIndex: (n.menuIndex + c - 1) % c };
    else if (down) n = { ...n, menuIndex: (n.menuIndex + 1) % c };
    else if (ok) return confirm(n);
  }
  const p = a.input.pointer();
  for (let i = 0; i < c; i++) {
    const r = rect(s.screen, i)!;
    if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) {
      n = { ...n, menuIndex: i };
      if (a.input.pointerReleased()) return confirm(n);
    }
  }
  return n;
}
const ip = (
  p: DeepReadonly<PaddleState>,
  vy: number,
  dt: number,
): PaddleState => {
  const cy = cl(p.cy + vy * dt, K.PADDLE_MIN_CY, K.PADDLE_MAX_CY);
  return { ...p, cy, vy: dt > 0 ? (cy - p.cy) / dt : vy };
};
function paddles(s: RO, a: UpdateApi, dt: number): CaromState {
  const ax = (d: string, u: string) => a.input.value(d) - a.input.value(u);
  const lv = s.paddles.left.driven
    ? s.paddles.left.drivenVy
    : K.PADDLE_SPEED *
      (s.mode === "solo"
        ? cl(ax("p1-down", "p1-up") + ax("p2-down", "p2-up"), -1, 1)
        : ax("p1-down", "p1-up"));
  let rv = s.paddles.right.driven
    ? s.paddles.right.drivenVy
    : K.PADDLE_SPEED * ax("p2-down", "p2-up");
  if (s.mode === "solo" && !s.paddles.right.driven) {
    let target = K.AI_HOME_Y,
      dz = K.AI_HOME_DEADZONE;
    if (s.ai.tracking && s.screen === "playing" && s.ball && s.ball.vx > 0) {
      target = s.ball.y - s.ball.vy * K.AI_REACT;
      dz = K.AI_DEADZONE;
    }
    const d = target - s.paddles.right.cy;
    rv =
      !s.ai.movement || Math.abs(d) <= dz
        ? 0
        : Math.sign(d) *
          Math.min(K.AI_SPEED, dt ? Math.abs(d) / dt : K.AI_SPEED);
  }
  return {
    ...cp(s),
    paddles: {
      left: ip(s.paddles.left, lv, dt),
      right: ip(s.paddles.right, rv, dt),
    },
  };
}
function paddleHit(
  b: BallState,
  p: DeepReadonly<PaddleState>,
  x0: number,
  x1: number,
  left: boolean,
  e: Ev,
): BallState {
  const y0 = p.cy - K.PADDLE_HALF,
    y1 = p.cy + K.PADDLE_HALF;
  if (!(
    b.x > x0 - K.BALL_R &&
    b.x < x1 + K.BALL_R &&
    b.y > y0 - K.BALL_R &&
    b.y < y1 + K.BALL_R
  ))
    return b;
  const d = [
      b.x - x0 + K.BALL_R,
      x1 + K.BALL_R - b.x,
      b.y - y0 + K.BALL_R,
      y1 + K.BALL_R - b.y,
    ],
    f = d.indexOf(Math.min(...d));
  if (f > 1) {
    e.wall = true;
    const top = f === 2;
    return {
      ...b,
      y: top ? y0 - K.BALL_R : y1 + K.BALL_R,
      vy: (top ? b.vy > 0 : b.vy < 0) ? -b.vy : b.vy,
    };
  }
  if (!(left ? b.vx < 0 : b.vx > 0)) return b;
  const speed = Math.min(Math.hypot(b.vx, b.vy) * K.SPEED_MULT, K.SPEED_CAP),
    ang = cl((b.y - p.cy) / K.PADDLE_HALF, -1, 1) * K.MAX_BOUNCE_ANGLE;
  e.paddle = true;
  return {
    ...b,
    x: left ? K.P1_X1 + K.BALL_R : K.P2_X0 - K.BALL_R,
    vx: (left ? 1 : -1) * speed * Math.cos(ang),
    vy: speed * Math.sin(ang),
    spin: cl(b.spin + p.vy * K.SPIN_FROM_PADDLE, -K.SPIN_CLAMP, K.SPIN_CLAMP),
  };
}
function obsHit(
  b: BallState,
  o: DeepReadonly<ObstacleState>,
  e: Ev,
): BallState {
  const c = Math.cos(o.theta),
    s = Math.sin(o.theta),
    dx = b.x - o.cx,
    dy = b.y - o.cy,
    lx = dx * c + dy * s,
    ly = -dx * s + dy * c,
    qx = cl(lx, -K.OBSTACLE_HW, K.OBSTACLE_HW),
    qy = cl(ly, -K.OBSTACLE_HH, K.OBSTACLE_HH);
  let nx = lx - qx,
    ny = ly - qy,
    pen;
  const z = Math.hypot(nx, ny);
  if (z >= K.BALL_R) return b;
  if (z) {
    nx /= z;
    ny /= z;
    pen = K.BALL_R - z;
  } else {
    const ds = [
        lx + K.OBSTACLE_HW,
        K.OBSTACLE_HW - lx,
        ly + K.OBSTACLE_HH,
        K.OBSTACLE_HH - ly,
      ],
      f = ds.indexOf(Math.min(...ds));
    nx = f === 0 ? -1 : f === 1 ? 1 : 0;
    ny = f === 2 ? -1 : f === 3 ? 1 : 0;
    pen = K.BALL_R + ds[f];
  }
  const wx = nx * c - ny * s,
    wy = nx * s + ny * c,
    dot = b.vx * wx + b.vy * wy;
  e.obstacle = true;
  return {
    ...b,
    x: b.x + wx * pen,
    y: b.y + wy * pen,
    vx: dot < 0 ? b.vx - 2 * dot * wx : b.vx,
    vy: dot < 0 ? b.vy - 2 * dot * wy : b.vy,
  };
}
function fly(s: RO, dt: number, a: UpdateApi): CaromState {
  if (!s.ball) return cp(s);
  let b: BallState = { ...s.ball, trail: [...s.ball.trail] };
  const e = { wall: false, paddle: false, obstacle: false },
    n = Math.max(1, Math.ceil((Math.hypot(b.vx, b.vy) * dt) / K.MAX_SUBSTEP)),
    h = dt / n;
  for (let i = 0; i < n; i++) {
    const speed = Math.hypot(b.vx, b.vy);
    if (speed) {
      const q = (b.spin / speed) * h,
        c = Math.cos(q),
        z = Math.sin(q),
        vx = b.vx * c - b.vy * z,
        vy = b.vx * z + b.vy * c;
      b = { ...b, vx, vy };
    }
    b = {
      ...b,
      spin: b.spin * 0.5 ** (h / K.SPIN_HALFLIFE),
      x: b.x + b.vx * h,
      y: b.y + b.vy * h,
    };
    if (b.y - K.BALL_R < 0 && b.vy < 0) {
      b = { ...b, y: K.BALL_R, vy: -b.vy };
      e.wall = true;
    } else if (b.y + K.BALL_R > K.FIELD_H && b.vy > 0) {
      b = { ...b, y: K.FIELD_H - K.BALL_R, vy: -b.vy };
      e.wall = true;
    }
    b = paddleHit(b, s.paddles.left, K.P1_X0, K.P1_X1, true, e);
    b = paddleHit(b, s.paddles.right, K.P2_X0, K.P2_X1, false, e);
    for (const o of s.obstacles) b = obsHit(b, o, e);
  }
  if (e.wall) a.audio.play(K.CUES.wallBounce);
  if (e.paddle) a.audio.play(K.CUES.paddleHit);
  if (e.obstacle) a.audio.play(K.CUES.obstacleBounce);
  if (b.x - K.BALL_R > K.FIELD_W || b.x + K.BALL_R < 0) {
    const left = b.x > K.FIELD_W,
      score = {
        p1: s.score.p1 + (left ? 1 : 0),
        p2: s.score.p2 + (left ? 0 : 1),
      },
      winner: Side = left ? "left" : "right",
      won = left
        ? score.p1 >= K.WIN_SCORE && score.p1 - score.p2 >= K.WIN_LEAD
        : score.p2 >= K.WIN_SCORE && score.p2 - score.p1 >= K.WIN_LEAD;
    a.audio.play(K.CUES.score);
    return won
      ? { ...cp(s), ball: b, score, winner, screen: "matchover", menuIndex: 0 }
      : {
          ...cp(s),
          ball: ball(),
          score,
          receiver: left ? "right" : "left",
          screen: "countdown",
        };
  }
  return { ...cp(s), ball: b };
}
function advance(s: RO, a: UpdateApi, dt: number): CaromState {
  let n = paddles(s, a, dt);
  if (n.screen === "countdown" && n.ball) {
    const t = n.ball.holdTimer - dt;
    if (t <= 0) {
      const d = n.receiver === "left" ? -1 : 1;
      n = {
        ...n,
        screen: "playing",
        ball: {
          ...n.ball,
          held: false,
          holdTimer: 0,
          trail: [],
          vx: d * K.SERVE_SPEED * Math.cos(K.SERVE_ANGLE),
          vy: n.ball.serveSign * K.SERVE_SPEED * Math.sin(K.SERVE_ANGLE),
        },
      };
    } else n = { ...n, ball: { ...n.ball, holdTimer: t } };
  } else if (n.screen === "playing") n = fly(n, dt, a);
  if (
    (n.screen === "countdown" || n.screen === "playing") &&
    n.obstacleClockRunning
  ) {
    const t = n.obstacleClock + dt;
    n = {
      ...n,
      obstacleClock: t,
      obstacles: n.obstacles.map((o) => obstacle(o.index, t)),
    };
  }
  if ((n.screen === "countdown" || n.screen === "playing") && n.ball)
    n = {
      ...n,
      ball: {
        ...n.ball,
        trail: [
          ...n.ball.trail.filter((p) => p.t >= n.simTime - K.TRAIL_TIME),
          { x: n.ball.x, y: n.ball.y, t: n.simTime },
        ],
      },
    };
  return n;
}
const txt = (
  c: CanvasRenderingContext2D,
  v: string,
  x: number,
  y: number,
  z: number,
  col = "#d9f5ff",
) => {
  c.fillStyle = col;
  c.font = `700 ${z}px system-ui`;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText(v, x, y);
};
function draw(s: RO, c: CanvasRenderingContext2D) {
  c.strokeStyle = "#29465a";
  c.strokeRect(20, 20, K.FIELD_W - 40, K.FIELD_H - 40);
  c.setLineDash([10, 18]);
  c.beginPath();
  c.moveTo(K.NET_X, 40);
  c.lineTo(K.NET_X, K.FIELD_H - 40);
  c.stroke();
  c.setLineDash([]);
  for (const o of s.obstacles) {
    c.save();
    c.translate(o.cx, o.cy);
    c.rotate(o.theta);
    c.fillStyle = "#ffd166";
    c.fillRect(
      -K.OBSTACLE_HW,
      -K.OBSTACLE_HH,
      K.OBSTACLE_HW * 2,
      K.OBSTACLE_HH * 2,
    );
    c.restore();
  }
  c.fillStyle = "#35e8ff";
  c.fillRect(
    K.P1_X0,
    s.paddles.left.cy - K.PADDLE_HALF,
    K.PADDLE_W,
    K.PADDLE_H,
  );
  c.fillStyle = "#ff5b76";
  c.fillRect(
    K.P2_X0,
    s.paddles.right.cy - K.PADDLE_HALF,
    K.PADDLE_W,
    K.PADDLE_H,
  );
  if (s.ball) {
    for (let i = 0; i < s.ball.trail.length; i++) {
      const p = s.ball.trail[i];
      c.globalAlpha = ((i + 1) / s.ball.trail.length) * 0.3;
      c.beginPath();
      c.arc(p.x, p.y, K.BALL_R * 0.7, 0, TAU);
      c.fillStyle = "#fff";
      c.fill();
    }
    c.globalAlpha = 1;
    c.beginPath();
    c.arc(s.ball.x, s.ball.y, K.BALL_R, 0, TAU);
    c.fillStyle = "#fff";
    c.fill();
  }
  if (s.screen !== "title" && s.screen !== "howto") {
    txt(c, String(s.score.p1), 525, 70, 52, "#35e8ff");
    txt(c, String(s.score.p2), 755, 70, 52, "#ff5b76");
    txt(
      c,
      s.mode === "solo" ? "SOLO // HUMAN vs CIRCUIT" : "VERSUS // LOCAL DUEL",
      K.FIELD_CX,
      30,
      15,
    );
  }
  if (s.screen === "title") {
    c.fillStyle = "rgba(7,17,31,.7)";
    c.fillRect(250, 90, 780, 560);
    txt(c, K.TITLE_TEXT, K.FIELD_CX, 175, 100);
    txt(c, "BEND THE ANGLE", K.FIELD_CX, 250, 18, "#ffd166");
    menu(c, s.screen, K.TITLE_ITEMS, s.menuIndex);
  } else if (s.screen === "howto") {
    c.fillStyle = "rgba(7,17,31,.9)";
    c.fillRect(180, 55, 920, 620);
    txt(c, "HOW TO PLAY", K.FIELD_CX, 110, 48, "#35e8ff");
    txt(c, "W / S and arrow keys move the paddles", K.FIELD_CX, 220, 22);
    txt(
      c,
      "Strike while moving to curve the ball with spin.",
      K.FIELD_CX,
      330,
      25,
      "#ffd166",
    );
    txt(
      c,
      "Bank off the rotating bars. First to 11, win by 2.",
      K.FIELD_CX,
      380,
      19,
    );
    txt(
      c,
      "P / ESC pauses  •  M toggles sound",
      K.FIELD_CX,
      480,
      18,
      "#ff5b76",
    );
    menu(c, s.screen, ["BACK"], 0);
  } else if (s.screen === "countdown" && s.ball) {
    txt(
      c,
      String(Math.max(1, Math.ceil(s.ball.holdTimer))),
      K.FIELD_CX,
      260,
      70,
      "#ffd166",
    );
  } else if (s.screen === "paused") {
    c.fillStyle = "rgba(3,9,17,.82)";
    c.fillRect(0, 0, K.FIELD_W, K.FIELD_H);
    txt(c, "PAUSED", K.FIELD_CX, 235, 52);
    menu(c, s.screen, K.PAUSE_ITEMS, s.menuIndex);
  } else if (s.screen === "matchover") {
    c.fillStyle = "rgba(3,9,17,.82)";
    c.fillRect(0, 0, K.FIELD_W, K.FIELD_H);
    txt(
      c,
      s.winner === "left"
        ? "PLAYER ONE WINS"
        : s.mode === "solo"
          ? "CIRCUIT WINS"
          : "PLAYER TWO WINS",
      K.FIELD_CX,
      215,
      48,
      s.winner === "left" ? "#35e8ff" : "#ff5b76",
    );
    txt(c, `${s.score.p1} — ${s.score.p2}`, K.FIELD_CX, 285, 32);
    menu(c, s.screen, K.MATCHOVER_ITEMS, s.menuIndex);
  }
}
function menu(
  c: CanvasRenderingContext2D,
  x: Screen,
  a: readonly string[],
  sel: number,
) {
  a.forEach((v, i) => {
    const r = rect(x, i)!;
    c.fillStyle = i === sel ? "#123f52" : "#0a1d2d";
    c.fillRect(r.x, r.y, r.w, r.h);
    txt(c, v, K.FIELD_CX, r.y + r.h / 2, 21, i === sel ? "#35e8ff" : "#d9f5ff");
  });
}
export const game: Game<CaromState, CaromDebugApi> = {
  initialize(a: InitApi<CaromState>) {
    for (const x of K.ACTIONS)
      a.input.register(x, { keys: [...K.BINDINGS[x]] });
    a.audio.define(K.CUES.paddleHit, {
      wave: "square",
      freq: 300,
      freqTo: 520,
      durationMs: 60,
    });
    a.audio.define(K.CUES.wallBounce, {
      freq: 230,
      freqTo: 170,
      durationMs: 50,
    });
    a.audio.define(K.CUES.obstacleBounce, {
      wave: "triangle",
      freq: 620,
      freqTo: 350,
      durationMs: 75,
    });
    a.audio.define(K.CUES.score, {
      wave: "sawtooth",
      freq: 180,
      freqTo: 720,
      durationMs: 180,
    });
    a.diagnostics.register("screen", (s) => s.screen);
    a.diagnostics.register("mode", (s) => s.mode);
    a.diagnostics.register("score", (s) => `${s.score.p1}:${s.score.p2}`);
    a.diagnostics.register("ball pos", (s) =>
      s.ball ? `${s.ball.x.toFixed(1)}, ${s.ball.y.toFixed(1)}` : "none",
    );
    a.diagnostics.register("ball vel", (s) =>
      s.ball ? `${s.ball.vx.toFixed(1)}, ${s.ball.vy.toFixed(1)}` : "none",
    );
    a.diagnostics.register("ball speed", (s) =>
      s.ball ? Math.hypot(s.ball.vx, s.ball.vy) : 0,
    );
    a.diagnostics.register("ball spin", (s) => s.ball?.spin ?? 0);
    a.diagnostics.register(
      "left paddle",
      (s) => `${s.paddles.left.cy}, ${s.paddles.left.vy}`,
    );
    a.diagnostics.register(
      "right paddle",
      (s) => `${s.paddles.right.cy}, ${s.paddles.right.vy}`,
    );
    return [initial(false), debug];
  },
  update(s, a, dt) {
    if (s.muted !== a.audio.muted()) a.audio.setMuted(s.muted);
    const old = s.screen;
    let n = input(s, a);
    n = { ...n, simTime: s.simTime + dt, muted: a.audio.muted() };
    return n.screen === old && (old === "countdown" || old === "playing")
      ? advance(n, a, dt)
      : n;
  },
  render(s, a: RenderApi) {
    draw(s, a.ctx);
  },
};
