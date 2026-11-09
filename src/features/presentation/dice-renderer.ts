import { Camera, Geometry, Mat4, Mesh, Program, Renderer, Texture, Vec3 } from "ogl";
import six from "./dice-assets/d6.json";
import twenty from "./dice-assets/d20.json";
import sixTexture from "./dice-assets/d6.webp";
import twentyTexture from "./dice-assets/d20.webp";

const vertex = `attribute vec3 position; attribute vec3 normal; attribute vec2 uv;
uniform mat4 modelViewMatrix, projectionMatrix; uniform mat3 normalMatrix;
varying vec2 vUv; varying vec3 vNormal;
void main(){vUv=uv;vNormal=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
const fragment = `precision highp float; uniform sampler2D map; varying vec2 vUv; varying vec3 vNormal;
void main(){vec3 n=normalize(vNormal); float light=.66+.34*max(0.,dot(n,normalize(vec3(-.5,.8,1.))));
vec3 color=texture2D(map,vUv).rgb; float shine=pow(max(0.,dot(n,normalize(vec3(.3,.6,1.)))),28.);
gl_FragColor=vec4(color*light+vec3(.13)*shine,1.);}`;

/** Visual motion lands on the committed face; it never generates a game result. */
export function renderDie(
  canvas: HTMLCanvasElement,
  sides: 6 | 20,
  value: number,
  animate: boolean,
  settled: () => void,
) {
  const data = sides === 6 ? six : twenty;
  const renderer = new Renderer({
    canvas,
    alpha: true,
    antialias: true,
    dpr: Math.min(2, devicePixelRatio || 1),
    width: 112,
    height: 112,
  });
  const gl = renderer.gl;
  const camera = new Camera(gl, { fov: 32, aspect: 1 });
  camera.position.z = 4.5;
  const geometry = new Geometry(gl, {
    position: { size: 3, data: new Float32Array(data.position) },
    normal: { size: 3, data: new Float32Array(data.normal) },
    uv: { size: 2, data: new Float32Array(data.uv) },
  });
  const texture = new Texture(gl);
  const program = new Program(gl, { vertex, fragment, uniforms: { map: { value: texture } } });
  const mesh = new Mesh(gl, { geometry, program });
  mesh.matrixAutoUpdate = false;
  const pose = data.poses.find((pose) => pose.value === value);
  if (!pose) throw new Error("Unknown die face");
  const landing = new Mat4().fromArray(pose.matrix);
  let frame = 0;
  let disposed = false;
  let finished = false;
  let loadingTimer: ReturnType<typeof setTimeout> | undefined;
  const finish = () => {
    clearTimeout(loadingTimer);
    if (!finished && !disposed) {
      finished = true;
      settled();
    }
  };
  const image = new Image();
  image.onload = () => {
    if (disposed || finished) return;
    clearTimeout(loadingTimer);
    texture.image = image;
    const start = performance.now();
    const draw = (now: number) => {
      if (disposed) return;
      const progress = animate ? Math.min(1, (now - start) / 850) : 1;
      const spin = Math.pow(1 - progress, 2);
      mesh.matrix
        .identity()
        .translate(new Vec3(0, Math.sin(progress * Math.PI * 3) * spin * 0.3, 0))
        .rotate(-0.35 + spin * Math.PI * 6, new Vec3(1, 0, 0))
        .rotate(0.42 + spin * Math.PI * 8, new Vec3(0, 1, 0))
        .multiply(landing);
      mesh.worldMatrixNeedsUpdate = true;
      renderer.render({ scene: mesh, camera });
      if (progress < 1) frame = requestAnimationFrame(draw);
      else finish();
    };
    frame = requestAnimationFrame(draw);
  };
  image.onerror = finish;
  loadingTimer = setTimeout(finish, 5000);
  image.src = sides === 6 ? sixTexture : twentyTexture;
  const lost = (event: Event) => {
    event.preventDefault();
    cancelAnimationFrame(frame);
    finish();
  };
  canvas.addEventListener("webglcontextlost", lost);
  return () => {
    disposed = true;
    clearTimeout(loadingTimer);
    cancelAnimationFrame(frame);
    canvas.removeEventListener("webglcontextlost", lost);
    image.onload = image.onerror = null;
    image.src = "";
    geometry.remove();
    program.remove();
    gl.deleteTexture(texture.texture);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  };
}
