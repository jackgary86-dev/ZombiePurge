import type { PickupKind } from '../data/types';

export interface MinimapInput {
  carX: number;
  carZ: number;
  /** Car heading (yaw about +Y, 0 = facing +Z). */
  heading: number;
  radarRange: number;
  /** Half-size of the square the minimap shows, in metres. */
  viewRange: number;
  zombies: Iterable<{ x: number; z: number; alive: boolean; state: string }>;
  roads: Iterable<{ x1: number; z1: number; x2: number; z2: number }>;
  pickups: Iterable<{ kind: PickupKind; x: number; z: number; taken?: boolean }>;
  objective?: { x: number; z: number } | null;
  mapSize: number;
}

export interface MinimapPoint {
  /** Minimap-local metres: +x right, +y up (ahead of the car). */
  x: number;
  y: number;
}

export interface MinimapFrame {
  blips: (MinimapPoint & { alerted: boolean })[];
  roads: { a: MinimapPoint; b: MinimapPoint }[];
  pickups: (MinimapPoint & { kind: PickupKind })[];
  objective: MinimapPoint | null;
  /** Map edges as a rotated square (4 corners) in minimap-local metres. */
  bounds: MinimapPoint[];
  radarRange: number;
  viewRange: number;
}

/** World -> minimap-local: translate to the car, rotate so the car's heading points up. */
export function toLocal(
  x: number,
  z: number,
  carX: number,
  carZ: number,
  heading: number
): MinimapPoint {
  const dx = x - carX;
  const dz = z - carZ;
  const c = Math.cos(-heading);
  const s = Math.sin(-heading);
  // Rotate about +Y by -heading: forward (+Z) becomes up (+y); right (-X) becomes +x.
  const rx = dx * c + dz * s;
  const rz = -dx * s + dz * c;
  return { x: -rx, y: rz };
}

/** E3: everything the minimap draws this frame, in car-relative metres. Pure; unit-tested. */
export function computeMinimapFrame(input: MinimapInput): MinimapFrame {
  const { carX, carZ, heading } = input;
  const local = (x: number, z: number) => toLocal(x, z, carX, carZ, heading);
  const inView = (p: MinimapPoint, margin = 0) =>
    Math.abs(p.x) <= input.viewRange + margin && Math.abs(p.y) <= input.viewRange + margin;

  const blips: MinimapFrame['blips'] = [];
  const r2 = input.radarRange * input.radarRange;
  for (const z of input.zombies) {
    if (!z.alive) continue;
    const dx = z.x - carX;
    const dz = z.z - carZ;
    if (dx * dx + dz * dz > r2) continue;
    blips.push({
      ...local(z.x, z.z),
      alerted: z.state === 'alerted' || z.state === 'chase' || z.state === 'attack',
    });
  }

  const roads: MinimapFrame['roads'] = [];
  for (const road of input.roads) {
    const a = local(road.x1, road.z1);
    const b = local(road.x2, road.z2);
    // Keep segments with any part near the view (cheap box test on the segment's bounding box).
    const minX = Math.min(a.x, b.x);
    const maxX = Math.max(a.x, b.x);
    const minY = Math.min(a.y, b.y);
    const maxY = Math.max(a.y, b.y);
    const v = input.viewRange * 1.5;
    if (maxX < -v || minX > v || maxY < -v || minY > v) continue;
    roads.push({ a, b });
  }

  const pickups: MinimapFrame['pickups'] = [];
  for (const p of input.pickups) {
    if (p.taken) continue;
    const l = local(p.x, p.z);
    if (inView(l, 10)) pickups.push({ ...l, kind: p.kind });
  }

  const half = input.mapSize / 2;
  const bounds = [local(-half, -half), local(half, -half), local(half, half), local(-half, half)];

  return {
    blips,
    roads,
    pickups,
    objective: input.objective ? local(input.objective.x, input.objective.z) : null,
    bounds,
    radarRange: input.radarRange,
    viewRange: input.viewRange,
  };
}

const PICKUP_COLORS: Record<PickupKind, string> = {
  gas: '#ffb347',
  repair: '#7fd77f',
  coins: '#ffd84a',
  ammo: '#9ecbff',
};

/** Canvas minimap in the bottom-left corner. */
export class Minimap {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D | null;

  constructor(parent: HTMLElement = document.body, size = 200) {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'minimap';
    this.canvas.width = size * 2;
    this.canvas.height = size * 2;
    this.canvas.style.width = `${size}px`;
    this.canvas.style.height = `${size}px`;
    parent.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
  }

  setVisible(visible: boolean): void {
    this.canvas.hidden = !visible;
  }

  draw(frame: MinimapFrame): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const W = this.canvas.width;
    const c = W / 2;
    const scale = c / frame.viewRange; // px per metre
    const px = (p: MinimapPoint) => [c + p.x * scale, c - p.y * scale] as const;

    ctx.clearRect(0, 0, W, W);
    ctx.save();
    ctx.beginPath();
    ctx.arc(c, c, c - 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = 'rgba(10, 14, 12, 0.8)';
    ctx.fillRect(0, 0, W, W);

    // Map bounds.
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    frame.bounds.forEach((b, i) => {
      const [x, y] = px(b);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.stroke();

    // Roads.
    ctx.strokeStyle = 'rgba(200,200,210,0.55)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (const r of frame.roads) {
      const [ax, ay] = px(r.a);
      const [bx, by] = px(r.b);
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
    }
    ctx.stroke();

    // Radar range ring.
    ctx.strokeStyle = 'rgba(120,220,140,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(c, c, frame.radarRange * scale, 0, Math.PI * 2);
    ctx.stroke();

    // Pickups and objective.
    for (const p of frame.pickups) {
      const [x, y] = px(p);
      ctx.fillStyle = PICKUP_COLORS[p.kind];
      ctx.fillRect(x - 5, y - 5, 10, 10);
    }
    if (frame.objective) {
      const [x, y] = px(frame.objective);
      ctx.strokeStyle = '#ffd84a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, 9, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Zombie blips.
    for (const b of frame.blips) {
      const [x, y] = px(b);
      ctx.fillStyle = b.alerted ? '#ff5a4a' : '#9cff3a';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Player arrow (always centred, pointing up).
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(c, c - 12);
    ctx.lineTo(c - 8, c + 8);
    ctx.lineTo(c, c + 3);
    ctx.lineTo(c + 8, c + 8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(c, c, c - 2, 0, Math.PI * 2);
    ctx.stroke();
  }
}
