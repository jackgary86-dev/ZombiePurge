import type { Camera, Scene, WebGLRenderer } from 'three';
import { Vector2 } from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import type { PostFxConfig } from '../../data/types';

/** A subtle vignette plus a light contrast/saturation lift - the "colour grade" half of S6,
 *  applied as the composer's final pass after bloom. */
const vignetteGradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    darkness: { value: 0.35 },
    offset: { value: 0.55 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float darkness;
    uniform float offset;
    varying vec2 vUv;
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      // Mild contrast + saturation lift so the scene reads with more punch, not just darker
      // edges - a plain vignette alone looks like a filter slapped on top.
      color.rgb = (color.rgb - 0.5) * 1.06 + 0.5;
      float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));
      color.rgb = mix(vec3(luma), color.rgb, 1.08);
      vec2 uv = (vUv - 0.5) * offset;
      float vignette = 1.0 - dot(uv, uv);
      color.rgb *= mix(1.0 - darkness, 1.0, clamp(vignette, 0.0, 1.0));
      gl_FragColor = color;
    }
  `,
};

/**
 * S6: bloom + a subtle vignette/colour-grade pass layered on top of the existing per-map
 * day/night lighting presets (I8). `enabled` gates whether `render()` uses the composited
 * pipeline at all - when false the caller should fall back to a plain `renderer.render()`,
 * so 'low' graphics quality gets today's exact look with zero post-processing overhead rather
 * than a disabled-but-still-allocated composer doing extra work.
 */
export class PostFX {
  readonly composer: EffectComposer;
  private readonly bloomPass: UnrealBloomPass;
  private readonly gradePass: ShaderPass;
  enabled = false;

  constructor(
    renderer: WebGLRenderer,
    scene: Scene,
    camera: Camera,
    cfg: PostFxConfig,
    width: number,
    height: number
  ) {
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));
    this.bloomPass = new UnrealBloomPass(
      new Vector2(width, height),
      cfg.bloomStrength,
      cfg.bloomRadius,
      cfg.bloomThreshold
    );
    this.composer.addPass(this.bloomPass);
    this.gradePass = new ShaderPass(vignetteGradeShader);
    this.gradePass.uniforms.darkness.value = cfg.vignetteDarkness;
    this.gradePass.uniforms.offset.value = cfg.vignetteOffset;
    this.composer.addPass(this.gradePass);
  }

  setSize(width: number, height: number): void {
    this.composer.setSize(width, height);
    this.bloomPass.setSize(width, height);
  }

  render(): void {
    this.composer.render();
  }
}
