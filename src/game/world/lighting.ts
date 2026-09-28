import {
  AmbientLight,
  Color,
  DirectionalLight,
  Fog,
  HemisphereLight,
  Scene,
  SpotLight,
} from 'three';

export interface LightingPreset {
  sky: number;
  fog: number;
  hemisphereSky: number;
  hemisphereGround: number;
  hemisphereIntensity: number;
  ambient: number;
  sunColor: number;
  sunIntensity: number;
  sunPosition: [number, number, number];
  /** Fog start/end as fractions of the map's view distance. */
  fogNear: number;
  fogFar: number;
}

/** I8: one preset per map for day and night; palettes match docs/ART_PROMPT.md. */
export const LIGHTING: Record<string, { day: LightingPreset; night: LightingPreset }> = {
  greybox: {
    day: {
      sky: 0x8fa3b8,
      fog: 0x8fa3b8,
      hemisphereSky: 0xbfd4ff,
      hemisphereGround: 0x3a2f28,
      hemisphereIntensity: 0.9,
      ambient: 0.15,
      sunColor: 0xfff2dd,
      sunIntensity: 1.6,
      sunPosition: [80, 120, 40],
      fogNear: 0.6,
      fogFar: 1,
    },
    night: {
      sky: 0x0b1020,
      fog: 0x0b1020,
      hemisphereSky: 0x223355,
      hemisphereGround: 0x0a0a0a,
      hemisphereIntensity: 0.35,
      ambient: 0.05,
      sunColor: 0x8fa8ff,
      sunIntensity: 0.25,
      sunPosition: [-60, 90, -40],
      fogNear: 0.25,
      fogFar: 0.6,
    },
  },
  openfield: {
    day: {
      sky: 0xa9c4d9,
      fog: 0xa9c4d9,
      hemisphereSky: 0xcfe0ff,
      hemisphereGround: 0x4a5a3a,
      hemisphereIntensity: 0.9,
      ambient: 0.12,
      sunColor: 0xffe9c8,
      sunIntensity: 1.7,
      sunPosition: [100, 110, 60],
      fogNear: 0.55,
      fogFar: 1,
    },
    night: {
      sky: 0x1c2740,
      fog: 0x1c2740,
      hemisphereSky: 0x2f4a7a,
      hemisphereGround: 0x0c1208,
      hemisphereIntensity: 0.4,
      ambient: 0.06,
      sunColor: 0x9fb8ff,
      sunIntensity: 0.3,
      sunPosition: [-80, 100, -30],
      fogNear: 0.2,
      fogFar: 0.55,
    },
  },
  suburbs: {
    day: {
      sky: 0xbfe0ff,
      fog: 0xbfe0ff,
      hemisphereSky: 0xdcefff,
      hemisphereGround: 0x5a6a3a,
      hemisphereIntensity: 1,
      ambient: 0.18,
      sunColor: 0xfff6dd,
      sunIntensity: 1.8,
      sunPosition: [70, 100, 50],
      fogNear: 0.65,
      fogFar: 1,
    },
    night: {
      sky: 0x141c30,
      fog: 0x141c30,
      hemisphereSky: 0x2a3a5a,
      hemisphereGround: 0x0d0d0a,
      hemisphereIntensity: 0.35,
      ambient: 0.06,
      sunColor: 0x8fa8ff,
      sunIntensity: 0.25,
      sunPosition: [-60, 90, 40],
      fogNear: 0.25,
      fogFar: 0.6,
    },
  },
  desertHighway: {
    day: {
      sky: 0xf0d9a8,
      fog: 0xf0d9a8,
      hemisphereSky: 0xffe9c0,
      hemisphereGround: 0x8a6a3a,
      hemisphereIntensity: 1.1,
      ambient: 0.2,
      sunColor: 0xfff0d0,
      sunIntensity: 2,
      sunPosition: [90, 110, 30],
      fogNear: 0.7,
      fogFar: 1,
    },
    night: {
      sky: 0x1a2438,
      fog: 0x1a2438,
      hemisphereSky: 0x2a3550,
      hemisphereGround: 0x1a1408,
      hemisphereIntensity: 0.35,
      ambient: 0.07,
      sunColor: 0x9fb0ff,
      sunIntensity: 0.22,
      sunPosition: [-70, 90, 20],
      fogNear: 0.3,
      fogFar: 0.65,
    },
  },
  industrialCity: {
    day: {
      sky: 0x9a9488,
      fog: 0x9a9488,
      hemisphereSky: 0xb8b0a0,
      hemisphereGround: 0x3a3630,
      hemisphereIntensity: 0.8,
      ambient: 0.2,
      sunColor: 0xe8dcc0,
      sunIntensity: 1.3,
      sunPosition: [50, 90, 60],
      fogNear: 0.5,
      fogFar: 0.9,
    },
    night: {
      sky: 0x0c0e12,
      fog: 0x0c0e12,
      hemisphereSky: 0x181c22,
      hemisphereGround: 0x050505,
      hemisphereIntensity: 0.3,
      ambient: 0.05,
      sunColor: 0xffaa66,
      sunIntensity: 0.3,
      sunPosition: [-40, 80, -30],
      fogNear: 0.2,
      fogFar: 0.5,
    },
  },
  frozenForest: {
    day: {
      sky: 0xdbe9f5,
      fog: 0xdbe9f5,
      hemisphereSky: 0xffffff,
      hemisphereGround: 0x8a9aa0,
      hemisphereIntensity: 1.2,
      ambient: 0.25,
      sunColor: 0xffffff,
      sunIntensity: 1.6,
      sunPosition: [60, 120, 40],
      fogNear: 0.6,
      fogFar: 1,
    },
    night: {
      sky: 0x0a1220,
      fog: 0x0a1220,
      hemisphereSky: 0x1a2a4a,
      hemisphereGround: 0x080a10,
      hemisphereIntensity: 0.4,
      ambient: 0.09,
      sunColor: 0x8fc8ff,
      sunIntensity: 0.3,
      sunPosition: [40, 100, -60],
      fogNear: 0.2,
      fogFar: 0.5,
    },
  },
  quarantineLab: {
    day: {
      sky: 0xd8e4e0,
      fog: 0xd8e4e0,
      hemisphereSky: 0xe8f0e8,
      hemisphereGround: 0x4a5a50,
      hemisphereIntensity: 0.9,
      ambient: 0.3,
      sunColor: 0xf0fff0,
      sunIntensity: 1.2,
      sunPosition: [40, 100, 40],
      fogNear: 0.55,
      fogFar: 0.95,
    },
    night: {
      sky: 0x0a1210,
      fog: 0x0a1210,
      hemisphereSky: 0x1a3a2a,
      hemisphereGround: 0x050a06,
      hemisphereIntensity: 0.35,
      ambient: 0.08,
      sunColor: 0x6affaa,
      sunIntensity: 0.2,
      sunPosition: [-30, 90, 40],
      fogNear: 0.2,
      fogFar: 0.5,
    },
  },
};

export function presetFor(mapId: string, night: boolean): LightingPreset {
  const set = LIGHTING[mapId] ?? LIGHTING.openfield;
  return night ? set.night : set.day;
}

export interface SceneLights {
  hemisphere: HemisphereLight;
  ambient: AmbientLight;
  sun: DirectionalLight;
}

export function createLights(scene: Scene): SceneLights {
  const hemisphere = new HemisphereLight(0xffffff, 0x000000, 1);
  const ambient = new AmbientLight(0xffffff, 0.1);
  const sun = new DirectionalLight(0xffffff, 1);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = sun.shadow.camera.bottom = -80;
  sun.shadow.camera.right = sun.shadow.camera.top = 80;
  sun.shadow.camera.far = 400;
  scene.add(hemisphere, ambient, sun);
  return { hemisphere, ambient, sun };
}

/** Applies a preset to the scene; `viewDistance` is the map fog distance (scaled by settings). */
export function applyLighting(
  scene: Scene,
  lights: SceneLights,
  preset: LightingPreset,
  viewDistance: number
): void {
  scene.background = new Color(preset.sky);
  scene.fog = new Fog(preset.fog, viewDistance * preset.fogNear, viewDistance * preset.fogFar);
  lights.hemisphere.color.set(preset.hemisphereSky);
  lights.hemisphere.groundColor.set(preset.hemisphereGround);
  lights.hemisphere.intensity = preset.hemisphereIntensity;
  lights.ambient.intensity = preset.ambient;
  lights.sun.color.set(preset.sunColor);
  lights.sun.intensity = preset.sunIntensity;
  lights.sun.position.set(...preset.sunPosition);
}

/** Two headlight spots on the car; range comes from the headlight upgrade (D13). */
export function createHeadlights(baseRange: number): {
  lights: SpotLight[];
  setRange: (range: number) => void;
  setOn: (on: boolean) => void;
} {
  const lights = [-0.6, 0.6].map((x) => {
    const spot = new SpotLight(0xfff2c0, 40, baseRange, Math.PI / 7, 0.4, 1);
    spot.position.set(x, 0.3, 2.0);
    spot.target.position.set(x, -0.2, 2.0 + 20);
    spot.castShadow = false;
    spot.visible = false;
    return spot;
  });
  return {
    lights,
    setRange: (range) => lights.forEach((l) => (l.distance = Math.max(10, range))),
    setOn: (on) => lights.forEach((l) => (l.visible = on)),
  };
}
