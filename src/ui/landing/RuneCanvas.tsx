/**
 * WebGL shader background for the title screen.
 * Renders an atmospheric scene with drifting runic light,
 * aurora-like bands, and noise-driven mist — all in the Bok palette.
 */

import { useEffect, useRef } from "react";

const VERT = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAG = `
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;

// --- noise helpers ---
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

// --- rune glyph SDF (stylized angular strokes) ---
float runeLine(vec2 p, vec2 a, vec2 b, float w) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return smoothstep(w, w * 0.3, length(pa - ba * h));
}

float runeGlyph(vec2 p, float idx) {
  float r = 0.0;
  float id = floor(mod(idx, 4.0));
  // Vertical stroke (common to all)
  r += runeLine(p, vec2(0.0, -0.4), vec2(0.0, 0.4), 0.04);
  if (id < 1.0) {
    // Fehu-like: two angled strokes
    r += runeLine(p, vec2(0.0, 0.3), vec2(0.25, 0.15), 0.035);
    r += runeLine(p, vec2(0.0, 0.05), vec2(0.25, -0.1), 0.035);
  } else if (id < 2.0) {
    // Algiz-like: Y fork
    r += runeLine(p, vec2(0.0, 0.1), vec2(0.2, 0.35), 0.035);
    r += runeLine(p, vec2(0.0, 0.1), vec2(-0.2, 0.35), 0.035);
  } else if (id < 3.0) {
    // Kenaz-like: < shape
    r += runeLine(p, vec2(0.0, 0.3), vec2(0.2, 0.0), 0.035);
    r += runeLine(p, vec2(0.2, 0.0), vec2(0.0, -0.3), 0.035);
  } else {
    // Dagaz-like: X with horizontal
    r += runeLine(p, vec2(-0.15, 0.3), vec2(0.15, -0.3), 0.03);
    r += runeLine(p, vec2(-0.15, -0.3), vec2(0.15, 0.3), 0.03);
  }
  return clamp(r, 0.0, 1.0);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
  vec2 p = uv * aspect;
  float t = u_time * 0.08;

  // Bok palette
  vec3 ink    = vec3(0.102, 0.102, 0.18);   // #1a1a2e
  vec3 night  = vec3(0.02, 0.02, 0.063);    // #050510
  vec3 gold   = vec3(0.788, 0.659, 0.298);  // #c9a84c
  vec3 ember  = vec3(0.639, 0.271, 0.165);  // #a3452a
  vec3 moss   = vec3(0.227, 0.353, 0.251);  // #3a5a40

  // Base: dark gradient with subtle noise
  float n = fbm(p * 2.0 + vec2(t * 0.5, t * 0.3));
  vec3 bg = mix(night, ink, uv.y * 0.6 + n * 0.15);

  // Aurora-like bands (horizontal waves of color)
  float aurora1 = smoothstep(0.35, 0.5, fbm(vec2(p.x * 1.5 + t, p.y * 3.0 + t * 0.7)));
  float aurora2 = smoothstep(0.4, 0.55, fbm(vec2(p.x * 2.0 - t * 0.8, p.y * 2.5 + 1.0)));
  vec3 auroraColor = mix(moss, gold, aurora1) * 0.2;
  bg += auroraColor * aurora1 * (0.6 + 0.4 * sin(t * 2.0));
  bg += ember * 0.08 * aurora2;

  // Drifting mist at bottom
  float mist = fbm(vec2(p.x * 3.0 + t * 0.4, p.y * 5.0 - t * 0.2));
  float mistMask = smoothstep(0.35, 0.0, uv.y);
  bg += vec3(0.15, 0.12, 0.08) * mist * mistMask * 0.3;

  // Runic glyphs — fading in and out at scattered positions
  float runeGlow = 0.0;
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    vec2 pos = vec2(
      hash(vec2(fi, 0.0)) * aspect.x,
      hash(vec2(0.0, fi)) * 0.8 + 0.1
    );
    float phase = t * 0.5 + fi * 1.3;
    float fade = pow(sin(phase) * 0.5 + 0.5, 3.0);
    vec2 rp = (p - pos) * 3.0;
    float g = runeGlyph(rp, fi + floor(t * 0.2));
    runeGlow += g * fade * 0.4;
  }
  bg += gold * runeGlow;

  // Vignette
  float vig = 1.0 - length((uv - 0.5) * 1.4);
  vig = smoothstep(0.0, 0.7, vig);
  bg *= vig;

  // Subtle grain
  float grain = hash(uv * u_time * 100.0) * 0.03;
  bg += grain;

  gl_FragColor = vec4(bg, 1.0);
}
`;

export function RuneCanvas() {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const gl = canvas.getContext("webgl", { alpha: false, antialias: false });
		if (!gl) return;

		// Compile shaders
		const vs = gl.createShader(gl.VERTEX_SHADER);
		if (!vs) return;
		gl.shaderSource(vs, VERT);
		gl.compileShader(vs);

		const fs = gl.createShader(gl.FRAGMENT_SHADER);
		if (!fs) return;
		gl.shaderSource(fs, FRAG);
		gl.compileShader(fs);

		const prog = gl.createProgram();
		if (!prog) return;
		gl.attachShader(prog, vs);
		gl.attachShader(prog, fs);
		gl.linkProgram(prog);
		// biome-ignore lint/correctness/useHookAtTopLevel: gl.useProgram is WebGL, not a React hook
		gl.useProgram(prog);

		// Full-screen quad
		const buf = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, buf);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
		const aPos = gl.getAttribLocation(prog, "a_position");
		gl.enableVertexAttribArray(aPos);
		gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

		const uTime = gl.getUniformLocation(prog, "u_time");
		const uRes = gl.getUniformLocation(prog, "u_resolution");

		let raf = 0;
		const t0 = performance.now();
		const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

		const resize = () => {
			canvas.width = canvas.clientWidth * Math.min(devicePixelRatio, 2);
			canvas.height = canvas.clientHeight * Math.min(devicePixelRatio, 2);
			gl.viewport(0, 0, canvas.width, canvas.height);
		};

		const draw = () => {
			resize();
			// Use a frozen time for reduced-motion users (static frame)
			const elapsed = prefersReducedMotion ? 0 : (performance.now() - t0) / 1000;
			gl.uniform1f(uTime, elapsed);
			gl.uniform2f(uRes, canvas.width, canvas.height);
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
			if (prefersReducedMotion) return; // Single static frame
			raf = requestAnimationFrame(draw);
		};

		raf = requestAnimationFrame(draw);

		return () => {
			cancelAnimationFrame(raf);
			gl.deleteProgram(prog);
			gl.deleteShader(vs);
			gl.deleteShader(fs);
			gl.deleteBuffer(buf);
		};
	}, []);

	return (
		<canvas
			ref={canvasRef}
			className="absolute inset-0 w-full h-full"
			style={{ zIndex: 0 }}
			tabIndex={-1}
			aria-hidden="true"
		/>
	);
}
