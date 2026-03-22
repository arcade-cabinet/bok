import * as THREE from 'three';

const WATER_VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying float vWaveHeight;

  void main() {
    vUv = uv;

    // Additive sine waves at different frequencies for organic ripple
    float wave1 = sin(position.x * 1.5 + uTime * 1.2) * 0.15;
    float wave2 = sin(position.z * 2.0 + uTime * 0.8) * 0.10;
    float wave3 = sin((position.x + position.z) * 0.8 + uTime * 1.6) * 0.08;
    float displacement = wave1 + wave2 + wave3;

    vWaveHeight = displacement;

    vec3 displaced = position;
    displaced.y += displacement;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;

const WATER_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform vec3 uDeepColor;
  uniform vec3 uShallowColor;
  uniform float uOpacity;
  varying vec2 vUv;
  varying float vWaveHeight;

  void main() {
    // Blend between deep and shallow blue based on wave height
    float blend = smoothstep(-0.2, 0.2, vWaveHeight);
    vec3 color = mix(uDeepColor, uShallowColor, blend);

    // Subtle shimmer from UV distortion
    float shimmer = sin(vUv.x * 20.0 + uTime * 2.0) * sin(vUv.y * 20.0 + uTime * 1.5);
    color += vec3(shimmer * 0.03);

    gl_FragColor = vec4(color, uOpacity);
  }
`;

/**
 * Animated water surface using PlaneGeometry with a custom ShaderMaterial.
 * Vertex shader displaces Y with sine waves; fragment shader blends blue
 * colors with transparency.
 */
export class WaterRenderer {
  readonly #planes: THREE.Mesh[] = [];

  /**
   * Create an animated water plane.
   * @param width - Plane width in world units
   * @param depth - Plane depth in world units
   * @param waterLevel - Y position of the water surface
   * @returns The Three.js mesh to add to the scene
   */
  createWaterPlane(width: number, depth: number, waterLevel: number): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(width, depth, 32, 32);
    geometry.rotateX(-Math.PI / 2); // Lay flat

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uDeepColor: { value: new THREE.Color(0x1a4c7a) },
        uShallowColor: { value: new THREE.Color(0x4a9bd9) },
        uOpacity: { value: 0.75 },
      },
      vertexShader: WATER_VERTEX_SHADER,
      fragmentShader: WATER_FRAGMENT_SHADER,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = waterLevel;
    this.#planes.push(mesh);
    return mesh;
  }

  /** Advance time uniform on all water planes. */
  update(dt: number): void {
    for (const mesh of this.#planes) {
      const mat = mesh.material as THREE.ShaderMaterial;
      mat.uniforms.uTime.value += dt;
    }
  }

  /** Remove a water plane from tracking. */
  remove(mesh: THREE.Mesh): void {
    const idx = this.#planes.indexOf(mesh);
    if (idx >= 0) {
      this.#planes.splice(idx, 1);
    }
  }

  /** Remove all tracked water planes. */
  clear(): void {
    this.#planes.length = 0;
  }
}
