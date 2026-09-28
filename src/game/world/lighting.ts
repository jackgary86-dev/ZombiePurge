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
