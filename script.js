import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

/* =========================================================
1. STORY DATA — edit this array to add real chapters.
Only chapter 0 matches the supplied reference image;
the rest are placeholders so navigation has something
to demonstrate.
========================================================= */
const chapters = [
{
eyebrow: "01. Our story begins",
headline: "Just another<br/>workday&hellip;",
body: "I thought I was just going to fix a laptop problem.",
cta: "Go to SCB Office",
locked: false,
},
{
eyebrow: "02. First meeting",
headline: "And then I<br/>met you.",
body: "For some reason… you scared me a little at first. \u{1F605}",
cta: "Next",
locked: false,
},
{
eyebrow: "03. Kept coming back",
headline: "Somehow,<br/>I kept coming back.",
body: "At first I came because of work. Somewhere along the way, I started finding reasons to see you.",
cta: "See the reason",
locked: false,
},
{
eyebrow: "04. The H&M moment",
headline: "H&amp;M Surprise",
body: "She saw them. Loved them. But didn't buy them. What happened next is one of my favorite memories. \u2764\uFE0F",
cta: "Watch closely",
locked: false,
},
{
eyebrow: "05. The surprise",
headline: "The day I saw<br/>this smile\u2026",
body: "The secret purchase. The perfect timing. The happiness I'll never forget. \u{1F60A}\u2764\uFE0F",
cta: "Open the memory",
locked: false,
},
  {
    eyebrow: "06. You already knew",
    headline: "You already<br/>knew, didn't you?",
    body: "My one side love wasn't a secret forever. \u{1F605}",
    cta: "Continue",
    locked: false,
  },
  {
    eyebrow: "07. Two families",
    headline: "Two families.<br/>One future.",
    body: "You introduced me to your world, I did the same. Together, we started talking about our future. \u{1F91D}\u2764\uFE0F",
    cta: "Our future",
    locked: false,
  },
  {
    eyebrow: "08. Not always perfect",
    headline: "We fight.<br/>A lot. \u{1F602}",
    body: "Different opinions, attitude, mood swings\u2026 But love is louder than our ego.",
    cta: "What happens next?",
    locked: false,
  },
  {
    eyebrow: "09. Night rides",
    headline: "Whenever it<br/>ends this way\u2026",
    body: "I take the long ride just to see you. One hug. One kiss. And everything feels right again. \u2764\uFE0F",
    cta: "Take the ride",
    locked: false,
  },
  {
    eyebrow: "10. Growing together",
    headline: "We chose<br/>each other.",
    body: "Through every high and low, every fight and every fix\u2026 We are still here. Stronger. Better. Us. \u2764\uFE0F",
    cta: "Tell me about me",
    locked: false,
  },
  {
    eyebrow: "11. Your perspective",
    headline: "Now I want to<br/>know about me.",
    body: "Help me become a better person for you. Your honest suggestions should make me even better. \u{1F30D}\u2764\uFE0F",
    cta: "Continue",
    locked: false,
  },
  {
    eyebrow: "12. Thank you & I love you",
    headline: "Thank you.<br/>I love you.",
    body: "For your love, care, efforts, support and for never giving up on us. And I'd still make that secret H&M purchase every single time. \u{1F98A}\u{1F996}\u2764\uFE0F",
    cta: "I love you forever",
    locked: false,
  },
  {
    eyebrow: "13. Our future together",
    headline: "South Indian<br/>Wedding.",
    body: "Different traditions, same values. Two families blessing our union. \u2764\uFE0F",
    cta: "Hindu Wedding",
    locked: false,
  },
  {
    eyebrow: "14. Our future together",
    headline: "Two cultures.<br/>One heart.",
    body: "Different traditions, same values. Two families blessing our union. \u2764\uFE0F",
    cta: "Christian Wedding",
    locked: false,
  },
];
// Pad remaining slots up to 12 as locked placeholders (matches "01/12" counter).
while (chapters.length < 14) {
const n = chapters.length + 1;
chapters.push({
eyebrow: `${String(n).padStart(2, "0")}. Coming soon`,
headline: "More of the<br/>story soon&hellip;",
body: "This chapter hasn't been written yet.",
cta: "Locked",
locked: true,
});
}

let currentChapter = 0;

/* =========================================================
2. THREE.JS SCENE
========================================================= */
const canvas = document.getElementById("scene");
const sceneFallback = document.getElementById("sceneFallback");
let renderer;
try {
renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
} catch (error) {
console.error("Unable to start the 3D scene:", error);
document.body.classList.add("no-webgl");
renderer = {
setPixelRatio() {},
setSize() {},
render() {},
capabilities: { getMaxAnisotropy: () => 1 },
shadowMap: { enabled: false, type: null, autoUpdate: false },
};
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
// The scene is near-static (idle breathing/sway only, no moving light sources),
// so recomputing the shadow map every single frame is wasted GPU work. Render
// it once after the model loads, then freeze it — a meaningful perf win on
// mid-range laptops and phones, not just a micro-optimisation.
renderer.shadowMap.autoUpdate = false;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x05060a, 0.028);

const camera = new THREE.PerspectiveCamera(
32,
window.innerWidth / window.innerHeight,
0.1,
100
);
const baseCamPos = new THREE.Vector3(0.35, 1.55, 4.6);
const lookTarget = new THREE.Vector3(0.15, 1.15, 0);

// Every chapter frames its camera by fitting BOTH the subject's height and
// width into view (dist = max(heightFitDist, widthFitDist)), so nothing
// gets cropped. That's a "contain" fit — fine on a wide desktop screen,
// but on a narrow/portrait phone the horizontal FOV is much tighter, so
// the width-fit distance balloons and wins the max(), pulling the camera
// way back. The subject ends up small and distant instead of the close
// "sitting at the desk" shot seen on a laptop. This caps how much further
// than the height-fit distance the width-fit is allowed to push the
// camera, trading a bit of side cropping on very narrow screens for
// keeping the same close, laptop-like framing everywhere.
function coverBiasedDist(distForHeight, distForWidth, maxPullbackMult = 1.35) {
  return Math.min(Math.max(distForHeight, distForWidth), distForHeight * maxPullbackMult);
}
// True once the viewport matches the compact mobile layout (see the
// max-width:860px / max-height:560px breakpoint in style.css) — used to
// decide whether the subject needs to be shifted right to clear a
// left-side text panel (desktop) or can stay centered (mobile, where the
// text panel moves to the bottom of the screen instead).
function isCompactViewport() {
  return window.innerWidth <= 860 || window.innerHeight <= 560;
}
camera.position.copy(baseCamPos);
camera.lookAt(lookTarget);

/* ---- Lighting rig: key / fill / rim, matching the moody office look ---- */
const keyLight = new THREE.SpotLight(0xfff2e0, 3.4, 12, Math.PI / 5, 0.6, 1.4);
keyLight.position.set(1.6, 3.2, 2.4);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
keyLight.shadow.bias = -0.0025;
scene.add(keyLight);

const rimLight = new THREE.PointLight(0x37d6ff, 2.1, 8, 2);
rimLight.position.set(-1.4, 2.0, -1.6);
scene.add(rimLight);

const fillLight = new THREE.PointLight(0xff4fa3, 0.95, 8, 2);
fillLight.position.set(-1.8, 0.8, 1.6);
scene.add(fillLight);

const screenGlow = new THREE.PointLight(0x8fe6ff, 1.25, 3, 2);
screenGlow.position.set(0.15, 1.05, 0.75);
scene.add(screenGlow);

const ambient = new THREE.AmbientLight(0x3d4a63, 1.05);
scene.add(ambient);

/* ---- Ground / desk shadow catcher ---- */
const shadowGround = new THREE.Mesh(
new THREE.PlaneGeometry(16, 16),
new THREE.ShadowMaterial({ opacity: 0.35 })
);
shadowGround.rotation.x = -Math.PI / 2;
shadowGround.position.y = 0;
shadowGround.receiveShadow = true;
scene.add(shadowGround);

/* ---- Floating dust / bokeh particles in 3D for parallax depth ---- */
function makeParticleSprite(color) {
const c = document.createElement("canvas");
c.width = c.height = 64;
const ctx = c.getContext("2d");
const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
g.addColorStop(0, color);
g.addColorStop(1, "rgba(0,0,0,0)");
ctx.fillStyle = g;
ctx.fillRect(0, 0, 64, 64);
return new THREE.CanvasTexture(c);
}
const particleGeo = new THREE.BufferGeometry();
const particleCount = 140;
const positions = new Float32Array(particleCount * 3);
for (let i = 0; i < particleCount; i++) {
positions[i * 3] = (Math.random() - 0.5) * 10;
positions[i * 3 + 1] = Math.random() * 4.5;
positions[i * 3 + 2] = (Math.random() - 0.5) * 8 - 1;
}
particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
const particleMat = new THREE.PointsMaterial({
size: 0.045,
map: makeParticleSprite("rgba(143,230,255,0.9)"),
transparent: true,
depthWrite: false,
opacity: 0.55,
blending: THREE.AdditiveBlending,
});
const particles = new THREE.Points(particleGeo, particleMat);
scene.add(particles);

/* ---- Office background: the reference photo you provided, used as an
actual background plane (not recreated abstractly) with a slow ambient
zoom and mouse-parallax drift for motion. A left-side gradient overlay
keeps the text panel readable against it. */
const bgTextureLoader = new THREE.TextureLoader();
const officeBgTexture = bgTextureLoader.load("assets/backgrounds/office-bg.jpg");
officeBgTexture.colorSpace = THREE.SRGBColorSpace;

const bgAspect = 1360 / 768;
const bgPlaneHeight = 11;
const bgPlaneWidth = bgPlaneHeight * bgAspect;
const officeBgMat = new THREE.MeshBasicMaterial({
map: officeBgTexture,
transparent: true,
opacity: 0.82,
fog: false,
});
const officeBgPlane = new THREE.Mesh(
new THREE.PlaneGeometry(bgPlaneWidth, bgPlaneHeight),
officeBgMat
);
officeBgPlane.position.set(1.6, 2.0, -9);
scene.add(officeBgPlane);

// Left-side gradient scrim (dark → transparent) so the photo doesn't
// compete with the text panel, drawn as its own plane just in front of it.
function makeSideScrimTexture() {
const w = 512, h = 512;
const c = document.createElement("canvas");
c.width = w;
c.height = h;
const ctx = c.getContext("2d");
const g = ctx.createLinearGradient(0, 0, w, 0);
g.addColorStop(0, "rgba(3,4,7,0.95)");
g.addColorStop(0.45, "rgba(3,4,7,0.6)");
g.addColorStop(0.75, "rgba(3,4,7,0.15)");
g.addColorStop(1, "rgba(3,4,7,0)");
ctx.fillStyle = g;
ctx.fillRect(0, 0, w, h);
return new THREE.CanvasTexture(c);
}
const scrimMat = new THREE.MeshBasicMaterial({
map: makeSideScrimTexture(),
transparent: true,
fog: false,
});
const scrimPlane = new THREE.Mesh(
new THREE.PlaneGeometry(bgPlaneWidth, bgPlaneHeight),
scrimMat
);
scrimPlane.position.set(1.6, 2.0, -8.9);
scene.add(scrimPlane);

/* ---- Chapter 2 background: the SCB office photo you provided, used as a
real background plane (same approach as chapter 1's office-bg.jpg) with
the same slow ambient zoom + mouse-parallax drift. */
const chapter2BgTexture = bgTextureLoader.load("assets/backgrounds/office-bg-2.jpg");
chapter2BgTexture.colorSpace = THREE.SRGBColorSpace;
const chapter2BgMat = new THREE.MeshBasicMaterial({
map: chapter2BgTexture,
transparent: true,
opacity: 0.92,
fog: false,
});
const chapter2BgPlane = new THREE.Mesh(
new THREE.PlaneGeometry(bgPlaneWidth, bgPlaneHeight),
chapter2BgMat
);
chapter2BgPlane.position.set(0, 2.0, -9);
chapter2BgPlane.visible = false;
scene.add(chapter2BgPlane);

// Left-side scrim for chapter 2 as well, so the text panel stays readable
// against the photo (mirrors chapter 1's scrimPlane).
const scrim2Mat = new THREE.MeshBasicMaterial({
map: makeSideScrimTexture(),
transparent: true,
fog: false,
});
const scrim2Plane = new THREE.Mesh(
new THREE.PlaneGeometry(bgPlaneWidth, bgPlaneHeight),
scrim2Mat
);
scrim2Plane.position.set(0, 2.0, -8.9);
scrim2Plane.visible = false;
scene.add(scrim2Plane);

// Chapter 2 lighting preset — brighter and warmer than chapter 1's moody
// neon-office mood, applied to the SAME light objects (color + intensity
// swapped) rather than adding a second set of lights, so the two chapters
// never both light the scene at once.
const lightPresetChapter1 = {
keyColor: 0xfff2e0, keyIntensity: 3.4,
rimColor: 0x37d6ff, rimIntensity: 2.1,
fillColor: 0xff4fa3, fillIntensity: 0.95,
ambientColor: 0x3d4a63, ambientIntensity: 1.05,
fogColor: 0x05060a, fogDensity: 0.028,
};
const lightPresetChapter2 = {
// Tuned to the SCB office photo: warm amber key (the pendant lamps),
// cool blue rim (the window/city light), moody rather than daylight.
keyColor: 0xffe2b8, keyIntensity: 3.6,
rimColor: 0x7fb4ff, rimIntensity: 2.0,
fillColor: 0xff9a6a, fillIntensity: 1.0,
ambientColor: 0x4a4657, ambientIntensity: 1.15,
fogColor: 0x1a1620, fogDensity: 0.024,
};
function applyLightPreset(preset) {
keyLight.color.setHex(preset.keyColor);
keyLight.intensity = preset.keyIntensity;
rimLight.color.setHex(preset.rimColor);
rimLight.intensity = preset.rimIntensity;
fillLight.color.setHex(preset.fillColor);
fillLight.intensity = preset.fillIntensity;
ambient.color.setHex(preset.ambientColor);
ambient.intensity = preset.ambientIntensity;
scene.fog.color.setHex(preset.fogColor);
scene.fog.density = preset.fogDensity;
}

// Applies the correct 3D scene (model, background, lighting, camera framing)
// for whichever chapter index is passed in. Called both at the transition
// midpoint AND every frame thereafter (see the reconciliation check in
// animate()) so that if chapter 2's background load is still in progress
// when the user first navigates there, the visuals self-correct the moment
// it finishes — instead of staying stuck on the wrong scene until another
// click.
let lastAppliedIsChapter2 = null;
let lastAppliedExtra = null;
function applyChapterVisuals(chapterIndex) {
// Chapters 3-5 are handled by their own lazy-loaded scene system.
if (chapterScenes[chapterIndex]) {
loadChapterScene(chapterIndex); // no-op if already loaded
if (loadedScenes[chapterIndex]) {
if (lastAppliedExtra === chapterIndex) return;
lastAppliedExtra = chapterIndex;
lastAppliedIsChapter2 = null;
if (character) character.visible = false;
if (chapter2PersonA) chapter2PersonA.visible = false;
if (chapter2PersonB) chapter2PersonB.visible = false;
officeBgPlane.visible = false; scrimPlane.visible = false;
chapter2BgPlane.visible = false; scrim2Plane.visible = false;
if (faceSprites.pivot) updateFaceSprites(0, false, false);
hideAllExtraChapters(chapterIndex);
applyExtraChapter(chapterIndex);
}
return; // still loading -> keep current view
}
lastAppliedExtra = null;
hideAllExtraChapters(null);

const isChapter2 = chapterIndex === 1 && chapter2Loaded;
if (isChapter2 === lastAppliedIsChapter2) return; // already correct, nothing to do
lastAppliedIsChapter2 = isChapter2;

if (character) character.visible = !isChapter2;
if (chapter2PersonA) chapter2PersonA.visible = isChapter2;
if (chapter2PersonB) chapter2PersonB.visible = isChapter2;
officeBgPlane.visible = !isChapter2;
scrimPlane.visible = !isChapter2;
chapter2BgPlane.visible = isChapter2;
scrim2Plane.visible = isChapter2;
if (!isChapter2 && faceSprites.pivot) updateFaceSprites(0, false, false);
applyLightPreset(isChapter2 ? lightPresetChapter2 : lightPresetChapter1);
const targetFraming = isChapter2 ? chapter2Framing : chapter1Framing;
baseCamPos.copy(targetFraming.camPos);
lookTarget.copy(targetFraming.lookTarget);
// Only snap the live camera position if we're not in the middle of the
// swoop transition — that has its own lerp already driving the camera,
// and stomping on it here would cause a visible jump mid-swoop.
if (!transitionActive) {
camera.position.copy(targetFraming.camPos);
}
}

/* =========================================================
3. LOAD CHARACTER MODEL
========================================================= */
const loaderEl = document.getElementById("loader");
const loaderPct = document.getElementById("loaderPct");

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("vendor/three/examples/jsm/libs/draco/");

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);
gltfLoader.setMeshoptDecoder(MeshoptDecoder);

let character = null;
let characterBaseRotationY = 0;
let eyelidLeft = null;
let eyelidRight = null;
let handsMeshRef = null;
const clock = new THREE.Clock();

// ---- Chapter 2 scene state (the two-character "first meeting" model) ----
let chapter2Loaded = false;
let chapter2GirlIsB = true; // set at load time by screen-space check
let chapter2PersonA = null; // pivot Group, independently posable
let chapter2PersonB = null;
const chapter1Framing = { camPos: new THREE.Vector3(), lookTarget: new THREE.Vector3() };
const chapter2Framing = { camPos: new THREE.Vector3(), lookTarget: new THREE.Vector3() };
const blinkStateA = { eyelidLeft: null, eyelidRight: null, nextBlinkAt: 1.5 + Math.random() * 2, blinkStart: null };
const blinkStateB = { eyelidLeft: null, eyelidRight: null, nextBlinkAt: 2.2 + Math.random() * 2, blinkStart: null };
const mouthStateB = { mesh: null };
const handStateA = { mesh: null, baseY: 0, baseRotZ: 0 };
const handStateB = { mesh: null, baseY: 0, baseRotZ: 0 };

// Turn-taking conversation timeline: alternates which person is "speaking"
// (more animated lean/gesture) vs "listening" (mostly still).
let speakerTurn = 0; // 0 = person A, 1 = person B
let turnStart = 0;
const turnDuration = 2.9; // seconds per turn

gltfLoader.load(
"assets/models/character.glb",
(gltf) => {
character = gltf.scene;

// Normalize scale/position: fit into a consistent frame regardless of
// the source model's original units.
const box = new THREE.Box3().setFromObject(character);
const size = new THREE.Vector3();
box.getSize(size);
const center = new THREE.Vector3();
box.getCenter(center);

const targetHeight = 1.85;
const scale = targetHeight / (size.y || 1);
character.scale.setScalar(scale);

// Recompute box after scaling to re-center on floor.
const box2 = new THREE.Box3().setFromObject(character);
const size2 = new THREE.Vector3();
box2.getSize(size2);
const center2 = new THREE.Vector3();
box2.getCenter(center2);

character.position.x -= center2.x;
character.position.z -= center2.z;
character.position.y -= box2.min.y; // sit on the ground plane

character.traverse((node) => {
if (node.isMesh) {
node.castShadow = true;
node.receiveShadow = true;
if (node.material) {
node.material.envMapIntensity = 1.1;
// The source asset ships metallicFactor=1 with no environment map,
// which turns flat surfaces into mirror-like hotspots under direct
// lighting. Clamp metalness/roughness so the material reads as a
// soft stylised render instead of blown-out chrome.
if (node.material.metalness !== undefined) {
node.material.metalness = Math.min(node.material.metalness, 0.2);
}
if (node.material.roughness !== undefined) {
node.material.roughness = Math.max(node.material.roughness, 0.6);
}
// Sharpen textures viewed at an angle (matters more now that the
// character sits turned to the side instead of facing dead-on).
const maxAniso = renderer.capabilities.getMaxAnisotropy();
["map", "normalMap", "roughnessMap", "metalnessMap"].forEach((slot) => {
if (node.material[slot]) {
node.material[slot].anisotropy = maxAniso;
node.material[slot].needsUpdate = true;
}
});
}
}
});

scene.add(character);

// Turn the character partway to the side instead of sitting square to
// the camera, matching the reference image's more dynamic 3/4 angle.
const baseRotationY = THREE.MathUtils.degToRad(-24);
character.rotation.y = baseRotationY;

// Recompute the bounding box AFTER the position shift AND rotation above —
// framing (and re-centering) must use the mesh's actual final world
// position, not an earlier, now-stale box. A pure Y-axis rotation doesn't
// change vertical extent, but it does shift the X/Z center, so re-center
// horizontally here.
let finalBox = new THREE.Box3().setFromObject(character);
let finalCenter = new THREE.Vector3();
finalBox.getCenter(finalCenter);
character.position.x -= finalCenter.x;
character.position.z -= finalCenter.z;

finalBox = new THREE.Box3().setFromObject(character);
const finalSize = new THREE.Vector3();
finalBox.getSize(finalSize);
finalCenter = new THREE.Vector3();
finalBox.getCenter(finalCenter);

// Frame the camera on the model: fit full height with margin, keep the
// subject slightly right-of-center so the left side stays clear for the
// text panel, matching the reference composition — but only when there
// IS a left-side text panel (desktop). On mobile the text panel moves to
// the bottom of the screen (see style.css), so the subject stays centered
// instead of shifting right for no reason.
const fovRad = (camera.fov * Math.PI) / 180;
const margin = 1.32; // headroom + footroom
const hFovRad = 2 * Math.atan(Math.tan(fovRad / 2) * camera.aspect);
const distForHeight = (finalSize.y * margin) / (2 * Math.tan(fovRad / 2));
const distForWidth = (finalSize.x * 1.15) / (2 * Math.tan(hFovRad / 2));
const dist = coverBiasedDist(distForHeight, distForWidth);
const eyeHeight = finalBox.min.y + finalSize.y * 0.5;
const compact = isCompactViewport();
const camXShift = compact ? 0 : finalSize.x * 0.15;
const lookXShift = compact ? 0 : finalSize.x * 0.08;

camera.position.set(finalCenter.x + camXShift, eyeHeight, finalBox.max.z + dist);
camera.lookAt(finalCenter.x + lookXShift, eyeHeight, finalCenter.z);
baseCamPos.copy(camera.position); // keep idle bob/parallax centered on the framed shot
lookTarget.set(finalCenter.x + lookXShift, eyeHeight, finalCenter.z);
characterBaseRotationY = baseRotationY;

// ---- Fake blink: two small skin-tone "eyelid" planes parented to the
// character so they inherit its position/rotation/sway automatically.
// The source mesh has no separate eyelid geometry or blend shapes, so
// this overlay is the practical way to get a blink without a rig.
// Depth is found by raycasting onto the actual face surface (rather than
// guessing a fraction of the bounding box) so the lids sit exactly on
// the skin instead of floating in front of or buried inside the head.
character.updateMatrixWorld(true);
const eyeWorldY = finalBox.max.y - finalSize.y * 0.14;
const lateralDir = new THREE.Vector3(1, 0, 0).applyQuaternion(character.quaternion);
const eyeOffsetMag = finalSize.x * 0.035;
const raycaster = new THREE.Raycaster();
const rayOriginZ = finalBox.max.z + 2;

function findFaceSurfacePoint(xSign) {
const worldX = finalCenter.x + lateralDir.x * eyeOffsetMag * xSign;
const worldZGuess = finalCenter.z + lateralDir.z * eyeOffsetMag * xSign;
raycaster.set(
new THREE.Vector3(worldX, eyeWorldY, rayOriginZ),
new THREE.Vector3(0, 0, -1)
);
const hits = raycaster.intersectObject(character, true);
if (hits.length > 0) {
const hit = hits[0];
const normal = hit.face.normal.clone().transformDirection(character.matrixWorld);
return hit.point.clone().addScaledVector(normal, 0.016);
}
// Fallback if the ray happens to miss geometry entirely.
return new THREE.Vector3(worldX, eyeWorldY, worldZGuess);
}

const lidGeo = new THREE.PlaneGeometry(finalSize.x * 0.036, finalSize.y * 0.026);
const lidMat = new THREE.MeshStandardMaterial({
color: 0xf3caa6,
roughness: 0.85,
metalness: 0,
side: THREE.DoubleSide,
});
function makeEyelid(xSign) {
const worldPos = findFaceSurfacePoint(xSign);

// Lock the eyelid to a stable local face offset instead of re-deriving it
// every frame from the camera. That keeps the lid from drifting or shaking
// as the character breathes and rotates.
const dummy = new THREE.Object3D();
dummy.position.copy(worldPos);
dummy.lookAt(camera.position);
const worldQuat = dummy.quaternion.clone();
const parentWorldQuat = character.getWorldQuaternion(new THREE.Quaternion());
const localQuat = parentWorldQuat.clone().invert().multiply(worldQuat);
const localPos = character.worldToLocal(worldPos.clone());

const mesh = new THREE.Mesh(lidGeo, lidMat.clone());
mesh.userData.baseLocalPos = localPos.clone();
mesh.userData.baseLocalQuat = localQuat.clone();
mesh.position.copy(mesh.userData.baseLocalPos);
mesh.quaternion.copy(mesh.userData.baseLocalQuat);
mesh.scale.y = 0.001;
mesh.renderOrder = 10;
character.add(mesh);
return mesh;
}
eyelidLeft = makeEyelid(-1);
eyelidRight = makeEyelid(1);

// ---- Split the hands/wrists away from the rest of the merged mesh so
// they can move independently. The source GLB is one solid, unrigged
// mesh (confirmed earlier: no skeleton, no joints, no bones), so a real
// typing animation isn't possible without rigging it — this is the
// practical alternative: geometrically separate a small region into its
// own mesh and animate it with a small vertical bob to suggest hands
// moving on the keys.
//
// A spatial bounding box alone isn't enough here: the hands rest
// directly on the keyboard, so a box loose enough to catch the hands
// also catches keyboard/laptop-deck triangles right next to them —
// that showed up as the laptop visibly cracking and shaking instead of
// the hands moving. To fix it, every candidate triangle is ALSO checked
// against the actual texture color at its UV coordinates, and only kept
// if it's a skin tone — so keyboard (dark/grey) and laptop-deck
// (light/neutral) triangles get correctly excluded even when they're
// spatially right next to a hand.
let meshNode = null;
character.traverse((n) => {
if (n.isMesh && n.geometry && n.geometry.attributes.position) {
if (!meshNode || n.geometry.attributes.position.count > meshNode.geometry.attributes.position.count) {
meshNode = n;
}
}
});

function buildSkinSampler(material) {
if (!material || !material.map || !material.map.image) return null;
const img = material.map.image;
const w = img.width, h = img.height;
if (!w || !h) return null;
const canvas = document.createElement("canvas");
canvas.width = w;
canvas.height = h;
const ctx = canvas.getContext("2d");
ctx.drawImage(img, 0, 0, w, h);
const data = ctx.getImageData(0, 0, w, h).data;
return function sample(u, v) {
let x = Math.floor((((u % 1) + 1) % 1) * w);
let y = Math.floor((1 - (((v % 1) + 1) % 1)) * h);
x = Math.min(w - 1, Math.max(0, x));
y = Math.min(h - 1, Math.max(0, y));
const idx = (y * w + x) * 4;
return [data[idx], data[idx + 1], data[idx + 2]];
};
}
function isSkinTone(r, g, b) {
if (r < 120) return false; // too dark — hair, keyboard keys, clothing
if (!(r > g && g > b)) return false; // skin reads as a warm r>g>b ramp
if (r - b < 15) return false; // needs real warmth, not neutral grey/white
if (r > 248 && g > 240 && b > 232) return false; // avoid near-white desk/laptop highlights
return true;
}

if (meshNode) {
// Anchor the search region on the actual hand surface via raycasting
// (same reliable technique used for the eyes) instead of guessing a
// bounding-box fraction — a guessed box reached too high and clipped
// into the laptop screen, which is what caused the "crack".
const handAnchorY = finalBox.min.y + finalSize.y * 0.535;
const handRayOriginZ = finalBox.max.z + 2;
const handRaycaster = new THREE.Raycaster();
handRaycaster.set(
new THREE.Vector3(finalCenter.x, handAnchorY, handRayOriginZ),
new THREE.Vector3(0, 0, -1)
);
const handHits = handRaycaster.intersectObject(character, true);
const handAnchor = handHits.length > 0
? handHits[0].point.clone()
: new THREE.Vector3(finalCenter.x, handAnchorY, finalCenter.z + finalSize.z * 0.3);

// Small box around that anchor point — tight enough to avoid the
// keyboard deck below and the screen above, wide enough to cover
// both hands (they're close together on a laptop keyboard).
const halfX = finalSize.x * 0.22;
const halfY = finalSize.y * 0.042;
const halfZ = finalSize.z * 0.14;
const handRegionMinWorld = new THREE.Vector3(
handAnchor.x - halfX, handAnchor.y - halfY, handAnchor.z - halfZ
);
const handRegionMaxWorld = new THREE.Vector3(
handAnchor.x + halfX, handAnchor.y + halfY, handAnchor.z + halfZ
);

meshNode.updateMatrixWorld(true);
const invMat = meshNode.matrixWorld.clone().invert();
const rMin = handRegionMinWorld.clone().applyMatrix4(invMat);
const rMax = handRegionMaxWorld.clone().applyMatrix4(invMat);
const localMin = new THREE.Vector3(
Math.min(rMin.x, rMax.x),
Math.min(rMin.y, rMax.y),
Math.min(rMin.z, rMax.z)
);
const localMax = new THREE.Vector3(
Math.max(rMin.x, rMax.x),
Math.max(rMin.y, rMax.y),
Math.max(rMin.z, rMax.z)
);

const posAttr = meshNode.geometry.attributes.position;
const uvAttr = meshNode.geometry.attributes.uv;
const skinSampler = buildSkinSampler(meshNode.material);
const srcIndex = meshNode.geometry.index.array;
const handIndices = [];
const bodyIndices = [];
for (let i = 0; i < srcIndex.length; i += 3) {
const a = srcIndex[i], b = srcIndex[i + 1], c = srcIndex[i + 2];
const cx = (posAttr.getX(a) + posAttr.getX(b) + posAttr.getX(c)) / 3;
const cy = (posAttr.getY(a) + posAttr.getY(b) + posAttr.getY(c)) / 3;
const cz = (posAttr.getZ(a) + posAttr.getZ(b) + posAttr.getZ(c)) / 3;
const inSpatialRegion =
cx >= localMin.x && cx <= localMax.x &&
cy >= localMin.y && cy <= localMax.y &&
cz >= localMin.z && cz <= localMax.z;

let matchesHand = false;
if (inSpatialRegion) {
if (skinSampler && uvAttr) {
const u = (uvAttr.getX(a) + uvAttr.getX(b) + uvAttr.getX(c)) / 3;
const v = (uvAttr.getY(a) + uvAttr.getY(b) + uvAttr.getY(c)) / 3;
const [r, g, bl] = skinSampler(u, v);
matchesHand = isSkinTone(r, g, bl);
} else {
// No texture/UV available to classify by color — fall back to
// spatial-only selection rather than skipping the effect entirely.
matchesHand = true;
}
}

if (matchesHand) {
handIndices.push(a, b, c);
} else {
bodyIndices.push(a, b, c);
}
}

if (handIndices.length > 0) {
const bodyGeo = meshNode.geometry.clone();
bodyGeo.setIndex(bodyIndices);
const handGeo = meshNode.geometry.clone();
handGeo.setIndex(handIndices);

const bodyMesh = new THREE.Mesh(bodyGeo, meshNode.material);
const handsMesh = new THREE.Mesh(handGeo, meshNode.material);
[bodyMesh, handsMesh].forEach((m) => {
m.position.copy(meshNode.position);
m.rotation.copy(meshNode.rotation);
m.scale.copy(meshNode.scale);
m.castShadow = true;
m.receiveShadow = true;
});

meshNode.parent.add(bodyMesh);
meshNode.parent.add(handsMesh);
meshNode.parent.remove(meshNode);
handsMeshRef = handsMesh;
}
}

chapter1Framing.camPos.copy(camera.position);
chapter1Framing.lookTarget.copy(lookTarget);
loadChapter2Model();

finishLoad();
},
(xhr) => {
if (xhr.total) {
// Cap the visible number at 95% until the mesh is actually decoded and
// added to the scene — download finishes well before decode/parse does.
const pct = Math.min(95, Math.round((xhr.loaded / xhr.total) * 100));
loaderPct.textContent = pct + "%";
if (pct >= 95) {
document.querySelector(".loader-text").firstChild.textContent = "Preparing scene ";
}
}
},
(err) => {
console.error("Model failed to load:", err);
loaderPct.textContent = "!";
// Still reveal the UI even if the model fails, so the page isn't stuck.
finishLoad();
}
);

/* =========================================================
3b. LOAD CHAPTER 2 MODEL — the two-character "first meeting" scene.
The source mesh is a single solid unrigged object containing both
people fused together (confirmed: no skeleton, no morph targets, no
animations — same limitation as the chapter 1 model). Real lip-sync
and finger articulation aren't possible without a proper rig, so this
splits the mesh into two independently-posable halves (one per person)
by an X-position plane, which is enough for believable body-language
motion — lean, turn, gesture — even without individual bone control.
========================================================= */
function makeSkinToneOverlaySampler(material) {
if (!material || !material.map || !material.map.image) return null;
const img = material.map.image;
const w = img.width, h = img.height;
if (!w || !h) return null;
const canvas = document.createElement("canvas");
canvas.width = w;
canvas.height = h;
const ctx = canvas.getContext("2d");
ctx.drawImage(img, 0, 0, w, h);
return ctx.getImageData(0, 0, w, h).data;
}

function setupBlinkForPerson(pivot, personMesh, blinkState, eyeHeightFrac, eyeOffsetFrac, xSign) {
pivot.updateMatrixWorld(true);
const box = new THREE.Box3().setFromObject(personMesh);
const size = new THREE.Vector3();
box.getSize(size);
const center = new THREE.Vector3();
box.getCenter(center);

const eyeWorldY = box.max.y - size.y * eyeHeightFrac;
const eyeOffsetMag = size.y * eyeOffsetFrac;
const raycaster = new THREE.Raycaster();
const rayOriginZ = box.max.z + 2;

function findSurfacePoint(sign) {
const worldX = center.x + eyeOffsetMag * sign;
raycaster.set(new THREE.Vector3(worldX, eyeWorldY, rayOriginZ), new THREE.Vector3(0, 0, -1));
const hits = raycaster.intersectObject(personMesh, true);
if (hits.length > 0) {
const hit = hits[0];
const normal = hit.face.normal.clone().transformDirection(personMesh.matrixWorld);
return hit.point.clone().addScaledVector(normal, 0.014);
}
return new THREE.Vector3(worldX, eyeWorldY, center.z + size.z * 0.3);
}

const lidGeo = new THREE.PlaneGeometry(size.y * 0.02, size.y * 0.014);
const lidMat = new THREE.MeshStandardMaterial({
color: 0xf3caa6,
roughness: 0.85,
metalness: 0,
side: THREE.DoubleSide,
});
function makeLid(sign) {
const worldPos = findSurfacePoint(sign);
const dummy = new THREE.Object3D();
dummy.position.copy(worldPos);
dummy.lookAt(camera.position);
const worldQuat = dummy.quaternion.clone();
const parentWorldQuat = pivot.getWorldQuaternion(new THREE.Quaternion());
const localQuat = parentWorldQuat.clone().invert().multiply(worldQuat);
const localPos = pivot.worldToLocal(worldPos.clone());
const mesh = new THREE.Mesh(lidGeo, lidMat.clone());
mesh.position.copy(localPos);
mesh.quaternion.copy(localQuat);
// The source mesh node carries its own embedded scale (separate from
// the overall height-normalization applied to the group), which body
// meshes inherit automatically by copying personMesh.scale — this
// overlay needs the same factor, or it renders ~16x too large (this is
// exactly what caused the floating oversized-rectangle bug).
mesh.scale.copy(personMesh.scale);
mesh.scale.y *= 0.001;
mesh.userData.baseScaleY = personMesh.scale.y; // animation multiplies by this, not overwrites
mesh.renderOrder = 10;
pivot.add(mesh);
return mesh;
}
blinkState.eyelidLeft = makeLid(-1 * xSign);
blinkState.eyelidRight = makeLid(1 * xSign);
}

// Mouth movement while "speaking": a small overlay near the mouth (same
// raycast-onto-surface technique as the blink lids) that opens/closes a
// little during that person's speaking turn. It's a crude stand-in for
// real lip-sync — there are no separate lip shapes or blend targets on
// this mesh to animate — but a rhythmic mouth-area movement synced to
// their turn reads as "talking" at normal viewing size.
function setupMouthForPerson(pivot, personMesh, mouthState, mouthHeightFrac) {
pivot.updateMatrixWorld(true);
const box = new THREE.Box3().setFromObject(personMesh);
const size = new THREE.Vector3();
box.getSize(size);
const center = new THREE.Vector3();
box.getCenter(center);

const mouthWorldY = box.max.y - size.y * mouthHeightFrac;
const raycaster = new THREE.Raycaster();
const rayOriginZ = box.max.z + 2;
raycaster.set(new THREE.Vector3(center.x, mouthWorldY, rayOriginZ), new THREE.Vector3(0, 0, -1));
const hits = raycaster.intersectObject(personMesh, true);
let worldPos;
if (hits.length > 0) {
const hit = hits[0];
const normal = hit.face.normal.clone().transformDirection(personMesh.matrixWorld);
worldPos = hit.point.clone().addScaledVector(normal, 0.014);
} else {
worldPos = new THREE.Vector3(center.x, mouthWorldY, center.z + size.z * 0.3);
}

const dummy = new THREE.Object3D();
dummy.position.copy(worldPos);
dummy.lookAt(camera.position);
const worldQuat = dummy.quaternion.clone();
const parentWorldQuat = pivot.getWorldQuaternion(new THREE.Quaternion());
const localQuat = parentWorldQuat.clone().invert().multiply(worldQuat);
const localPos = pivot.worldToLocal(worldPos.clone());

const geo = new THREE.PlaneGeometry(size.y * 0.016, size.y * 0.01);
const mat = new THREE.MeshStandardMaterial({
color: 0xc97e6b,
roughness: 0.75,
metalness: 0,
side: THREE.DoubleSide,
});
const mesh = new THREE.Mesh(geo, mat);
mesh.position.copy(localPos);
mesh.quaternion.copy(localQuat);
// Same fix as the eyelids: compensate for the source mesh node's own
// embedded scale, which this overlay doesn't inherit automatically the
// way body meshes do.
mesh.scale.copy(personMesh.scale);
mesh.scale.y *= 0.001;
mesh.userData.baseScaleY = personMesh.scale.y; // animation multiplies by this, not overwrites
mesh.renderOrder = 10;
pivot.add(mesh);
mouthState.mesh = mesh;
}

// Hand/arm gesture: same principle as the chapter-1 typing-hands split —
// find the actual hand surface by raycasting, then pull out nearby
// skin-toned triangles into their own mesh so it can move independently.
// Motion here is a slow gesture arc rather than a typing tap, timed to
// that person's speaking turn.
function setupHandGestureForPerson(pivot, personMesh, handState, handAnchorFrac, lateralSign) {
pivot.updateMatrixWorld(true);
const box = new THREE.Box3().setFromObject(personMesh);
const size = new THREE.Vector3();
box.getSize(size);
const center = new THREE.Vector3();
box.getCenter(center);

const handWorldY = box.min.y + size.y * handAnchorFrac;
const raycaster = new THREE.Raycaster();
const rayOriginZ = box.max.z + 2;
const worldX = center.x + size.x * 0.16 * lateralSign;
raycaster.set(new THREE.Vector3(worldX, handWorldY, rayOriginZ), new THREE.Vector3(0, 0, -1));
const hits = raycaster.intersectObject(personMesh, true);
const anchor = hits.length > 0
? hits[0].point.clone()
: new THREE.Vector3(worldX, handWorldY, center.z + size.z * 0.25);

const halfX = size.x * 0.13;
const halfY = size.y * 0.032;
// Asymmetric depth range: hands are held in FRONT of the body (larger Z,
// toward camera), while the thigh sits further back — a symmetric range
// around the anchor point was pulling in a stray patch of thigh/skirt-hem
// triangles along with the hands. Biasing forward avoids that.
const backZ = size.z * 0.05;
const fwdZ = size.z * 0.22;
const regionMin = new THREE.Vector3(anchor.x - halfX, anchor.y - halfY, anchor.z - backZ);
const regionMax = new THREE.Vector3(anchor.x + halfX, anchor.y + halfY, anchor.z + fwdZ);

personMesh.updateMatrixWorld(true);
const invMat = personMesh.matrixWorld.clone().invert();
const rMin = regionMin.clone().applyMatrix4(invMat);
const rMax = regionMax.clone().applyMatrix4(invMat);
const localMin = new THREE.Vector3(Math.min(rMin.x, rMax.x), Math.min(rMin.y, rMax.y), Math.min(rMin.z, rMax.z));
const localMax = new THREE.Vector3(Math.max(rMin.x, rMax.x), Math.max(rMin.y, rMax.y), Math.max(rMin.z, rMax.z));

const posAttr = personMesh.geometry.attributes.position;
const uvAttr = personMesh.geometry.attributes.uv;
const material = personMesh.material;
let skinData = null, imgW = 0, imgH = 0;
if (material && material.map && material.map.image && material.map.image.width) {
const img = material.map.image;
imgW = img.width;
imgH = img.height;
const cnv = document.createElement("canvas");
cnv.width = imgW;
cnv.height = imgH;
const ctx = cnv.getContext("2d");
ctx.drawImage(img, 0, 0, imgW, imgH);
skinData = ctx.getImageData(0, 0, imgW, imgH).data;
}
function sampleIsSkin(u, v) {
if (!skinData) return true; // no texture to check — fall back to spatial-only
let x = Math.floor((((u % 1) + 1) % 1) * imgW);
let y = Math.floor((1 - (((v % 1) + 1) % 1)) * imgH);
x = Math.min(imgW - 1, Math.max(0, x));
y = Math.min(imgH - 1, Math.max(0, y));
const idx = (y * imgW + x) * 4;
const r = skinData[idx], g = skinData[idx + 1], b = skinData[idx + 2];
if (r < 120) return false;
if (!(r > g && g > b)) return false;
if (r - b < 15) return false;
if (r > 248 && g > 240 && b > 232) return false;
return true;
}

const srcIndex = personMesh.geometry.index.array;
const handIndices = [];
const restIndices = [];
for (let i = 0; i < srcIndex.length; i += 3) {
const a = srcIndex[i], b = srcIndex[i + 1], c = srcIndex[i + 2];
const cx = (posAttr.getX(a) + posAttr.getX(b) + posAttr.getX(c)) / 3;
const cy = (posAttr.getY(a) + posAttr.getY(b) + posAttr.getY(c)) / 3;
const cz = (posAttr.getZ(a) + posAttr.getZ(b) + posAttr.getZ(c)) / 3;
const inRegion = cx >= localMin.x && cx <= localMax.x && cy >= localMin.y && cy <= localMax.y && cz >= localMin.z && cz <= localMax.z;
let matches = false;
if (inRegion) {
if (uvAttr) {
const u = (uvAttr.getX(a) + uvAttr.getX(b) + uvAttr.getX(c)) / 3;
const v = (uvAttr.getY(a) + uvAttr.getY(b) + uvAttr.getY(c)) / 3;
matches = sampleIsSkin(u, v);
} else {
matches = true;
}
}
if (matches) handIndices.push(a, b, c);
else restIndices.push(a, b, c);
}

if (handIndices.length === 0) return; // nothing matched — leave the mesh untouched

const restGeo = personMesh.geometry.clone();
restGeo.setIndex(restIndices);
const handGeo = personMesh.geometry.clone();
handGeo.setIndex(handIndices);
const restMesh = new THREE.Mesh(restGeo, personMesh.material);
const handMesh = new THREE.Mesh(handGeo, personMesh.material);
[restMesh, handMesh].forEach((m) => {
m.position.copy(personMesh.position);
m.rotation.copy(personMesh.rotation);
m.scale.copy(personMesh.scale);
m.castShadow = true;
m.receiveShadow = true;
});
const parent = personMesh.parent;
parent.remove(personMesh);
parent.add(restMesh);
parent.add(handMesh);
handState.mesh = handMesh;
handState.baseY = handMesh.position.y;
handState.baseRotZ = handMesh.rotation.z;
}

/* ---- Face sprites (blink + speaking mouth) for the chapter-2 girl.
Earlier attempts parented small planes to the character pivot; because the
source mesh node carries its own large embedded scale, those overlays came
out either enormous or invisible no matter how the scale was compensated.
These sprites are added directly to the SCENE instead — so their size is in
plain world units with no inherited scaling — and their position is
recomputed each frame from a stored local offset on the character pivot, so
they still follow her head as she turns and leans. Sprites also always face
the camera, which removes the edge-on-invisibility problem too. */
/* ---- Live face-position tuning ----------------------------------------
Placing the eye/mouth sprites automatically has repeatedly landed them in
the wrong spot, because the source mesh gives no landmark data to aim at.
Rather than keep guessing blind, these values are adjustable on screen:
press the "D" key while chapter 2 is showing to open a slider panel, drag
until the mouth and eyes sit correctly, then copy the printed values into
the faceTune defaults below to make them permanent. */
const faceTune = {
faceX: 0.0, // move whole face rig left/right
faceY: 0.02, // move whole face rig up/down
faceZ: 0.02, // move toward / away from viewer
eyeDX: 0.0, // extra spacing between the two eyes
eyeY: 0.02, // eyes up/down independently
mouthY: 0.03, // mouth up/down independently
eyeScale: 1.15, // eye size
mouthScale: 1.1, // mouth size
};

let faceTunePanelBuilt = false;
function buildFaceTunePanel() {
if (faceTunePanelBuilt) return;
faceTunePanelBuilt = true;

const panel = document.createElement("div");
panel.id = "faceTunePanel";
panel.style.cssText =
"position:fixed;right:16px;top:80px;z-index:99999;background:rgba(10,12,18,.92);" +
"border:1px solid rgba(255,255,255,.15);border-radius:12px;padding:14px 16px;" +
"font:12px/1.5 monospace;color:#cfe6ff;width:260px;display:none;backdrop-filter:blur(8px)";

const rows = [
["faceX", -0.30, 0.30, 0.002],
["faceY", -0.30, 0.30, 0.002],
["faceZ", -0.20, 0.20, 0.002],
["eyeDX", -0.10, 0.10, 0.001],
["eyeY", -0.15, 0.15, 0.001],
["mouthY", -0.15, 0.15, 0.001],
["eyeScale", 0.2, 3, 0.05],
["mouthScale", 0.2, 3, 0.05],
];

let html = "<b>Face position tuning</b><br>" +
"<span style='opacity:.7'>Drag until the mouth/eyes sit right, then copy the values below.</span><br><br>";
rows.forEach(([k, mn, mx, st]) => {
html += `<label>${k} <span id="v_${k}">${faceTune[k]}</span><br>` +
`<input id="s_${k}" type="range" min="${mn}" max="${mx}" step="${st}" value="${faceTune[k]}" style="width:100%"></label>`;
});
html += `<br><textarea id="faceTuneOut" readonly style="width:100%;height:78px;background:#05070c;color:#8fe6ff;border:1px solid rgba(255,255,255,.15);border-radius:6px;font:11px monospace"></textarea>`;
panel.innerHTML = html;
document.body.appendChild(panel);

function refreshOut() {
const out = document.getElementById("faceTuneOut");
if (out) {
out.value = "faceX: " + faceTune.faceX + ", faceY: " + faceTune.faceY +
", faceZ: " + faceTune.faceZ + ",\neyeDX: " + faceTune.eyeDX +
", eyeY: " + faceTune.eyeY + ", mouthY: " + faceTune.mouthY +
",\neyeScale: " + faceTune.eyeScale + ", mouthScale: " + faceTune.mouthScale;
}
}
rows.forEach(([k]) => {
const el = document.getElementById("s_" + k);
el.addEventListener("input", () => {
faceTune[k] = parseFloat(el.value);
document.getElementById("v_" + k).textContent = faceTune[k];
refreshOut();
});
});
refreshOut();

window.addEventListener("keydown", (e) => {
if (e.key === "d" || e.key === "D") {
panel.style.display = panel.style.display === "none" ? "block" : "none";
}
});
}

const faceSprites = { eyeL: null, eyeR: null, mouth: null, pivot: null,
offL: null, offR: null, offM: null };

function makeFaceSpriteTexture(color) {
const c = document.createElement("canvas");
c.width = 64; c.height = 64;
const ctx = c.getContext("2d");
ctx.fillStyle = color;
// Rounded blob so edges blend into the face rather than showing a hard box.
ctx.beginPath();
ctx.ellipse(32, 32, 30, 22, 0, 0, Math.PI * 2);
ctx.fill();
return new THREE.CanvasTexture(c);
}

function setupFaceSprites(pivot, personMesh) {
pivot.updateMatrixWorld(true);
personMesh.updateMatrixWorld(true);
const box = new THREE.Box3().setFromObject(personMesh);
const size = new THREE.Vector3(); box.getSize(size);
const center = new THREE.Vector3(); box.getCenter(center);

const ray = new THREE.Raycaster();
// Cast FROM THE CAMERA toward the target point rather than along a fixed
// axis: the characters are rotated, so a fixed -Z ray can graze past the
// face or hit the back of the head. Camera-relative casting always finds
// the surface the viewer actually sees.
function surfaceAt(xOff, yFrac) {
const y = box.max.y - size.y * yFrac;
const target = new THREE.Vector3(center.x + xOff, y, center.z);
const dir = target.clone().sub(camera.position).normalize();
ray.set(camera.position.clone(), dir);
const hits = ray.intersectObject(personMesh, true);
let best = null;
for (const hit of hits) {
const p = hit.point.clone();
const dx = Math.abs(p.x - target.x);
const dy = Math.abs(p.y - target.y);
const dz = Math.abs(p.z - target.z);
if (dx < size.x * 0.18 && dy < size.y * 0.22 && dz < size.z * 0.38) {
if (!best || hit.distance < best.distance) best = hit;
}
}
if (best) {
// Offset slightly back toward the camera so the sprite sits just in
// front of the skin instead of z-fighting with it.
return best.point.clone().addScaledVector(dir, -0.012);
}
return target;
}

const eyeDX = size.x * 0.10;
const wEyeL = surfaceAt(-eyeDX, 0.19);
const wEyeR = surfaceAt(eyeDX, 0.19);
const wMouth = surfaceAt(0, 0.31);

const skinTex = makeFaceSpriteTexture("rgb(238,197,167)");
const mouthTex = makeFaceSpriteTexture("rgb(92,38,40)");

function mkSprite(tex, wWorld, hWorld) {
const sp = new THREE.Sprite(new THREE.SpriteMaterial({
map: tex, transparent: true, depthTest: true, depthWrite: false,
}));
sp.scale.set(wWorld, hWorld, 1);
sp.renderOrder = 20;
sp.userData.baseW = wWorld;
sp.userData.baseH = hWorld;
sp.visible = false;
scene.add(sp);
return sp;
}

// Sized relative to her actual head size so it stays proportionate.
const eyeW = size.x * 0.11, eyeH = size.y * 0.018;
const mouthW = size.x * 0.16, mouthH = size.y * 0.018;

faceSprites.eyeL = mkSprite(skinTex, eyeW, eyeH);
faceSprites.eyeR = mkSprite(skinTex, eyeW, eyeH);
faceSprites.mouth = mkSprite(mouthTex, mouthW, mouthH);
faceSprites.pivot = pivot;
faceSprites.offL = pivot.worldToLocal(wEyeL.clone());
faceSprites.offR = pivot.worldToLocal(wEyeR.clone());
faceSprites.offM = pivot.worldToLocal(wMouth.clone());
// Unit used by the on-screen tuning sliders, so nudges are proportional
// to her actual size rather than raw scene units.
faceSprites.unit = size.y;
buildFaceTunePanel();
}

// Called every frame while chapter 2 is on screen: keeps the sprites glued to
// her face as she moves, and drives blink + mouth opening.
function updateFaceSprites(t, speaking, visible) {
if (!faceSprites.pivot) return;
const { eyeL, eyeR, mouth, pivot } = faceSprites;
[eyeL, eyeR, mouth].forEach((s) => { s.visible = visible; });
if (!visible) return;

pivot.updateMatrixWorld(true);
const u = faceSprites.unit || 1;
const T = faceTune;
// Tuning deltas are applied in the pivot's local space, then converted to
// world space — so they stay glued to her head as she turns.
const dL = faceSprites.offL.clone().add(new THREE.Vector3((T.eyeDX + T.faceX) * u, (T.eyeY + T.faceY) * u, T.faceZ * u));
const dR = faceSprites.offR.clone().add(new THREE.Vector3((-T.eyeDX + T.faceX) * u, (T.eyeY + T.faceY) * u, T.faceZ * u));
const dM = faceSprites.offM.clone().add(new THREE.Vector3(T.faceX * u, (T.mouthY + T.faceY) * u, T.faceZ * u));
eyeL.position.copy(pivot.localToWorld(dL));
eyeR.position.copy(pivot.localToWorld(dR));
mouth.position.copy(pivot.localToWorld(dM));
// Live size tuning
eyeL.scale.x = eyeL.userData.baseW * T.eyeScale;
eyeR.scale.x = eyeR.userData.baseW * T.eyeScale;
mouth.scale.x = mouth.userData.baseW * T.mouthScale;

// Blink: eyelid sprites are flat (invisible) most of the time and snap to
// full height for the brief moment of a blink.
if (t > faceBlink.next && faceBlink.start === null) faceBlink.start = t;
let lidAmt = 0;
if (faceBlink.start !== null) {
const bt = t - faceBlink.start;
const half = 0.09;
if (bt < half) lidAmt = bt / half;
else if (bt < half * 2) lidAmt = 1 - (bt - half) / half;
else { lidAmt = 0; faceBlink.start = null; faceBlink.next = t + 2.2 + Math.random() * 3.0; }
}
eyeL.scale.y = eyeL.userData.baseH * T.eyeScale * Math.max(0.001, lidAmt);
eyeR.scale.y = eyeR.userData.baseH * T.eyeScale * Math.max(0.001, lidAmt);

// Mouth: opens and closes rapidly while she is the one speaking.
const openAmt = speaking
? 0.25 + Math.abs(Math.sin(t * 7.5)) * 0.75
: 0.02;
mouth.scale.y = mouth.userData.baseH * T.mouthScale * openAmt;
}

const faceBlink = { next: 1.5 + Math.random() * 2, start: null };

/* =========================================================
CHAPTERS 3-5 — generalized scene system
Each of these chapters is its own GLB + background photo + lighting mood
+ a per-chapter motion behaviour. They load lazily the first time you
navigate to them, so the initial page load stays fast.

IMPORTANT LIMITATION: like every model in this project, these GLBs are
single fused meshes with no skeleton. Legs and arms cannot bend, so the
"walking" in chapter 3 is the pair gliding forward with a gait-like bob
and sway — it reads as walking at this distance, but the legs do not
actually stride. Real stepping would need a rigged character.
========================================================= */
const chapterScenes = {
2: { // index 2 = chapter 03
glb: "assets/models/chapter3.glb",
bg: "assets/backgrounds/office-bg-3.jpg",
mode: "walk",
zoom: 1, panX: 0, panY: 0, // camera: see notes in loadChapterScene
light: { keyColor: 0xffe6c8, keyIntensity: 2.9, rimColor: 0x9db8ff, rimIntensity: 2.4,
fillColor: 0xc08cff, fillIntensity: 1.2, ambientColor: 0x3b3a58, ambientIntensity: 1.25,
fogColor: 0x14121f, fogDensity: 0.022 },
},
3: { // index 3 = chapter 04
glb: "assets/models/chapter4.glb",
// NOTE: chapter4_1.glb is intentionally NOT loaded. It turned out to
// contain a complete miniature copy of the scene (girl + toys), not just
// the plush toys — loading it placed a tiny duplicate girl standing on
// the table. The toys are already part of chapter4.glb, so the extra
// file isn't needed.
bg: "assets/backgrounds/office-bg-4.jpg",
mode: "nostalgia",
zoom: 1, panX: 0, panY: 0,
light: { keyColor: 0xffdCb0, keyIntensity: 3.4, rimColor: 0xffc98f, rimIntensity: 1.5,
fillColor: 0xffb37a, fillIntensity: 1.3, ambientColor: 0x5a4a42, ambientIntensity: 1.5,
fogColor: 0x2a211c, fogDensity: 0.02 },
},
4: { // index 4 = chapter 05
glb: "assets/models/chapter5.glb",
bg: "assets/backgrounds/office-bg-5.jpg",
mode: "surprise",
zoom: 1, panX: 0, panY: 0,
light: { keyColor: 0xffe0bb, keyIntensity: 3.5, rimColor: 0xffb98a, rimIntensity: 1.7,
fillColor: 0xff9f6b, fillIntensity: 1.2, ambientColor: 0x53423a, ambientIntensity: 1.45,
fogColor: 0x241b16, fogDensity: 0.02 },
},
  5: { // index 5 = chapter 06 — rainy street, umbrella, magical rain
    glb: "assets/models/ch_6.glb",
    bg: "assets/backgrounds/bg-6.jpg",
    mode: "rain",
    rain: true,
    zoom: 1, panX: 0, panY: 0,
    light: { keyColor: 0xdCe8ff, keyIntensity: 2.6, rimColor: 0x88b6ff, rimIntensity: 2.6,
             fillColor: 0xffc98f, fillIntensity: 1.1, ambientColor: 0x33405c, ambientIntensity: 1.2,
             fogColor: 0x141c2b, fogDensity: 0.026 },
  },
  6: { // index 6 = chapter 07 — couple centre, a floating rock either side
    parts: [
      { file: "assets/models/ch_7_2.glb", role: "center" },
      { file: "assets/models/ch_7_1.glb", role: "leftRock" },
      { file: "assets/models/ch_7_3.glb", role: "rightRock" },
    ],
    bg: "assets/backgrounds/bg-7.jpg",
    mode: "float",
    zoom: 1, panX: 0, panY: 0,
    light: { keyColor: 0xffd9f0, keyIntensity: 3.0, rimColor: 0xc79cff, rimIntensity: 2.6,
             fillColor: 0xff9ad2, fillIntensity: 1.5, ambientColor: 0x5b4470, ambientIntensity: 1.7,
             fogColor: 0x2a1c3a, fogDensity: 0.018 },
  },
  7: { // index 7 = chapter 08 — sofa with the pair on it, thunder overhead
    parts: [
      { file: "assets/models/ch_8_2.glb", role: "sofa" },
      { file: "assets/models/ch_8_1.glb", role: "couple" },
      { file: "assets/models/ch_8_3.glb", role: "clouds" },
    ],
    bg: "assets/backgrounds/bg-8.jpg",
    mode: "thunder",
    thunder: true,
    zoom: 1, panX: 0, panY: 0,
    light: { keyColor: 0xffe6c0, keyIntensity: 2.6, rimColor: 0x9fb8ff, rimIntensity: 1.6,
             fillColor: 0xffb98a, fillIntensity: 1.1, ambientColor: 0x4a4250, ambientIntensity: 1.25,
             fogColor: 0x201a24, fogDensity: 0.022 },
  },
  8: { // index 8 = chapter 09 — split screen: bike ride above, couple below
    parts: [
      { file: "assets/models/ch_9_1.glb", role: "bike" },
      { file: "assets/models/ch_9_2.glb", role: "couple" },
    ],
    bg: "assets/backgrounds/bg-9b.jpg",     // lower half still image
    video: "assets/video/ch9.mp4",           // upper half looping video
    mode: "split",
    zoom: 1.25, panX: 0, panY: 0,
    // Chapter 09 was rendering far too dark, especially the lower band —
    // key/fill/ambient all raised sharply and fog cut right back.
    light: { keyColor: 0xeef4ff, keyIntensity: 5.0, rimColor: 0xbcd4ff, rimIntensity: 3.2,
             fillColor: 0xffd8b0, fillIntensity: 3.0, ambientColor: 0x8a94ad, ambientIntensity: 3.4,
             fogColor: 0x121a2a, fogDensity: 0.004 },
  },
  9: { // index 9 = chapter 10 — under the tree, rain, couple + toys
    parts: [
      { file: "assets/models/ch_10_1.glb", role: "couple" },
      { file: "assets/models/ch_10_2.glb", role: "toys" },
    ],
    bg: "assets/backgrounds/bg-10.jpg",
    mode: "meadowRain",
    rain: true,
    zoom: 1, panX: 0, panY: 0,
    light: { keyColor: 0xffe0bb, keyIntensity: 4.2, rimColor: 0xc8b0ff, rimIntensity: 2.4,
             fillColor: 0xffc79a, fillIntensity: 2.2, ambientColor: 0x6e6280, ambientIntensity: 2.6,
             fogColor: 0x261e2e, fogDensity: 0.008 },
  },
  10: { // index 10 = chapter 11 — cliff at night, couple looking out
    glb: "assets/models/ch_11.glb",
    bg: "assets/backgrounds/bg-11.jpg",
    mode: "stargaze",
    zoom: 1, panX: 0, panY: 0,
    light: { keyColor: 0xcfe0ff, keyIntensity: 3.2, rimColor: 0x9fc0ff, rimIntensity: 2.8,
             fillColor: 0xffd0a8, fillIntensity: 1.6, ambientColor: 0x5a6a8c, ambientIntensity: 2.4,
             fogColor: 0x101a2e, fogDensity: 0.008 },
  },
  11: { // index 11 = chapter 12 — lantern sky, video background
    glb: "assets/models/ch_12.glb",
    video: "assets/video/ch12.mp4",
    videoFull: true,                       // video fills the screen, not a band
    mode: "lanterns",
    zoom: 1, panX: 0, panY: 0,
    light: { keyColor: 0xffd6b0, keyIntensity: 3.6, rimColor: 0xffb98f, rimIntensity: 2.6,
             fillColor: 0xffc08a, fillIntensity: 2.0, ambientColor: 0x6b5a70, ambientIntensity: 2.6,
             fogColor: 0x241c30, fogDensity: 0.006 },
  },
  12: { // index 12 = chapter 13 — South Indian wedding
    glb: "assets/models/ch_13.glb",
    bg: "assets/backgrounds/bg-13.jpg",
    mode: "wedding",
    zoom: 1, panX: 0, panY: 0,
    light: { keyColor: 0xffe2b0, keyIntensity: 4.4, rimColor: 0xffc98f, rimIntensity: 2.2,
             fillColor: 0xffb87a, fillIntensity: 2.4, ambientColor: 0x7a6450, ambientIntensity: 3.0,
             fogColor: 0x2e2218, fogDensity: 0.006 },
  },
  13: { // index 13 = chapter 14 — church wedding
    glb: "assets/models/ch_14.glb",
    bg: "assets/backgrounds/bg-14.jpg",
    mode: "wedding",
    zoom: 1, panX: 0, panY: 0,
    light: { keyColor: 0xfff0d8, keyIntensity: 4.2, rimColor: 0xffd9b8, rimIntensity: 2.0,
             fillColor: 0xffd0a0, fillIntensity: 2.2, ambientColor: 0x8a7868, ambientIntensity: 3.2,
             fogColor: 0x2e2620, fogDensity: 0.005 },
  },
};
const loadedScenes = {}; // index -> { group, bgPlane, scrim, framing, ready }
const loadingScenes = {};
window.__loadedScenes = loadedScenes;

/* =========================================================
   CHAPTERS 6-9 SUPPORT — multi-part scenes, rain, thunder, split-screen
   video, and rotating bike wheels.

   Same hard limitation as every other model here: these GLBs are single
   fused meshes with no skeleton. Nothing can bend or articulate. Where the
   brief asked for motion (spinning wheels), it's done by geometrically
   isolating that region of the mesh and rotating it — the same technique
   used for the typing hands in chapter 1.
========================================================= */

// ---- Magical rain ------------------------------------------------------
// Falling streaks plus a few glowing motes, so it reads as "magical rain"
// rather than plain weather. Built once, shown only on chapter 6.
let rainSystem = null;
let splitFillLight = null;
function buildRain() {
  if (rainSystem) return rainSystem;
  const count = 900;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const spd = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i*3]   = (Math.random() - 0.5) * 14;
    pos[i*3+1] = Math.random() * 9;
    pos[i*3+2] = (Math.random() - 0.5) * 10 - 1;
    spd[i] = 2.6 + Math.random() * 3.4;
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.05, map: makeParticleSprite("rgba(200,225,255,0.9)"),
    transparent: true, depthWrite: false, opacity: 0.55,
    blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.visible = false;
  scene.add(pts);

  // Slow glowing motes drifting upward — the "magical" half of the effect.
  const mCount = 70;
  const mGeo = new THREE.BufferGeometry();
  const mPos = new Float32Array(mCount * 3);
  for (let i = 0; i < mCount; i++) {
    mPos[i*3] = (Math.random()-0.5)*10;
    mPos[i*3+1] = Math.random()*5;
    mPos[i*3+2] = (Math.random()-0.5)*7 - 1;
  }
  mGeo.setAttribute("position", new THREE.BufferAttribute(mPos, 3));
  const mMat = new THREE.PointsMaterial({
    size: 0.09, map: makeParticleSprite("rgba(255,225,190,0.95)"),
    transparent: true, depthWrite: false, opacity: 0.7,
    blending: THREE.AdditiveBlending,
  });
  const motes = new THREE.Points(mGeo, mMat);
  motes.frustumCulled = false;
  motes.visible = false;
  scene.add(motes);

  rainSystem = { pts, geo, spd, count, motes, mGeo, mCount };
  return rainSystem;
}
function updateRain(t, dt, visible) {
  const r = buildRain();
  r.pts.visible = visible;
  r.motes.visible = visible;
  if (!visible) return;
  const a = r.geo.attributes.position.array;
  for (let i = 0; i < r.count; i++) {
    a[i*3+1] -= r.spd[i] * dt;
    if (a[i*3+1] < -0.5) {
      a[i*3+1] = 8 + Math.random() * 2;
      a[i*3] = (Math.random() - 0.5) * 14;
    }
  }
  r.geo.attributes.position.needsUpdate = true;
  const m = r.mGeo.attributes.position.array;
  for (let i = 0; i < r.mCount; i++) {
    m[i*3+1] += 0.22 * dt;
    m[i*3] += Math.sin(t * 0.6 + i) * 0.0016;
    if (m[i*3+1] > 5.5) m[i*3+1] = 0;
  }
  r.mGeo.attributes.position.needsUpdate = true;
}

// ---- Thunder -----------------------------------------------------------
// Two overhead flash lights plus a screen flash, fired on an irregular
// schedule with a double-strike so it feels like real lightning.
let thunderLight = null;
const thunderState = { next: 2.0, phase: -1 };
function buildThunder() {
  if (thunderLight) return thunderLight;
  thunderLight = new THREE.PointLight(0xcfe0ff, 0, 24, 2);
  thunderLight.position.set(0.4, 5.2, 2.2);
  scene.add(thunderLight);
  return thunderLight;
}
function updateThunder(t, visible) {
  const L = buildThunder();
  if (!visible) { L.intensity = 0; return; }
  if (thunderState.phase < 0 && t > thunderState.next) {
    thunderState.phase = t;
  }
  if (thunderState.phase >= 0) {
    const e = t - thunderState.phase;
    // strike, brief dark, second brighter strike, then decay
    let v = 0;
    if (e < 0.07) v = e / 0.07;
    else if (e < 0.16) v = 1 - (e - 0.07) / 0.09;
    else if (e < 0.24) v = (e - 0.16) / 0.08 * 1.35;
    else if (e < 0.75) v = Math.max(0, 1.35 - (e - 0.24) / 0.51 * 1.35);
    else { v = 0; thunderState.phase = -1; thunderState.next = t + 3.5 + Math.random() * 5.0; }
    L.intensity = v * 9;
  }
}

// ---- Bike wheels -------------------------------------------------------
// Isolate the two wheel regions out of the fused bike mesh so they can
// actually spin. Wheels are found as the lowest, most circular clusters at
// the front and back of the bike's bounding box.
function extractWheels(group) {
  let mesh = null;
  group.traverse((n) => {
    if (n.isMesh && n.geometry && n.geometry.index) {
      if (!mesh || n.geometry.attributes.position.count > mesh.geometry.attributes.position.count) mesh = n;
    }
  });
  if (!mesh) return null;
  mesh.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(mesh);
  const size = new THREE.Vector3(); box.getSize(size);
  const inv = mesh.matrixWorld.clone().invert();

  // Two candidate wheel centres: lower third, front and rear along X.
  const wheelY = box.min.y + size.y * 0.16;
  const centres = [
    new THREE.Vector3(box.min.x + size.x * 0.20, wheelY, box.min.z + size.z * 0.5),
    new THREE.Vector3(box.min.x + size.x * 0.80, wheelY, box.min.z + size.z * 0.5),
  ].map((v) => v.applyMatrix4(inv));
  const radius = (size.y * 0.17);
  const rLocal = radius / mesh.getWorldScale(new THREE.Vector3()).y;

  const posAttr = mesh.geometry.attributes.position;
  const src = mesh.geometry.index.array;
  const groups = [[], [], []]; // wheel0, wheel1, rest
  const v = new THREE.Vector3();
  for (let i = 0; i < src.length; i += 3) {
    const a = src[i], b = src[i+1], c = src[i+2];
    v.set((posAttr.getX(a)+posAttr.getX(b)+posAttr.getX(c))/3,
          (posAttr.getY(a)+posAttr.getY(b)+posAttr.getY(c))/3,
          (posAttr.getZ(a)+posAttr.getZ(b)+posAttr.getZ(c))/3);
    let which = 2;
    if (v.distanceTo(centres[0]) < rLocal) which = 0;
    else if (v.distanceTo(centres[1]) < rLocal) which = 1;
    groups[which].push(a, b, c);
  }
  if (groups[0].length === 0 && groups[1].length === 0) return null;

  const parent = mesh.parent;
  const made = [];
  [0, 1].forEach((k) => {
    if (groups[k].length === 0) { made.push(null); return; }
    const g = mesh.geometry.clone();
    g.setIndex(groups[k]);
    // Re-centre the wheel geometry on its own hub so rotation spins in
    // place instead of orbiting the bike.
    g.computeBoundingBox();
    const bb = g.boundingBox;
    const hub = new THREE.Vector3();
    bb.getCenter(hub);
    g.translate(-hub.x, -hub.y, -hub.z);
    const wm = new THREE.Mesh(g, mesh.material);
    wm.position.copy(mesh.position).add(hub.clone().multiply(mesh.scale));
    wm.rotation.copy(mesh.rotation);
    wm.scale.copy(mesh.scale);
    parent.add(wm);
    made.push(wm);
  });
  const restGeo = mesh.geometry.clone();
  restGeo.setIndex(groups[2]);
  const restMesh = new THREE.Mesh(restGeo, mesh.material);
  restMesh.position.copy(mesh.position);
  restMesh.rotation.copy(mesh.rotation);
  restMesh.scale.copy(mesh.scale);
  parent.add(restMesh);
  parent.remove(mesh);
  return made.filter(Boolean);
}

// Loads a chapter made of several GLB files and arranges them relative to
// each other (couple + floating rocks, sofa + two people, bike + couple).
// Each part's placement is tunable via partTune below.
const partTune = {
// chapterIndex: { role: { x, y, z, s, rotY } }
// x/y/z shift the model, s scales it, rotY turns it (radians).
// Adjust live with the P key panel, then paste the printed values here.
6: {
center:    { x: 0,    y: 0,    z: 0, s: 1,    rotY: 0 },
leftRock:  { x: -1, y: 0.95, z: 0.80, s: 1.05, rotY: 1.4 },
rightRock: { x: 1.4,  y: 0.95, z: 0.80, s: 1.05, rotY: -1.8 },
},
7: {
sofa:   { x: 0.35, y: 0,    z: 0,    s: 1,    rotY: 0 },
couple: { x: 0.35, y: 0.42, z: 0.30, s: 0.85, rotY: 0 },
clouds: { x: 0.35, y: 1.15, z: -0.1, s: 0.45, rotY: 0 },
},
9: {
couple: { x: 0,    y: 0, z: 0,   s: 1,   rotY: 0 },
toys:   { x: 0.55, y: 0, z: 0.2, s: 0.5, rotY: 0 },
},
8: {
// Chapter 09 models are scaled up hard: each one should fill most of its
// own 60/40 band, as in the reference. Vertical position is driven by the
// band layout each frame, so y here is only a nudge within the band.
bike:   { x: -0.15, y: 0,    z: 0, s: 2.6, rotY: 0.35 },
couple: { x: 0.10,  y: 1,    z: 1, s: 3, rotY: 1.6 },
},
};
function getPartRoleTune(idx, role) {
if (!partTune[idx]) partTune[idx] = {};
if (!partTune[idx][role]) partTune[idx][role] = { x: 0, y: 0, z: 0, s: 1, rotY: 0 };
return partTune[idx][role];
}
function getPartTune(i) { return partTune[i] || {}; }

// Scales a background plane so it always covers the whole viewport at its
// depth, regardless of window aspect. Without this the photo sat smaller
// than the screen and left black bars down the sides.
function coverScaleForPlane(planeZ, planeW, planeH) {
const camZ = baseCamPos.z !== undefined ? baseCamPos.z : camera.position.z;
const dist = Math.abs(camZ - planeZ) || 12;
const vh = 2 * Math.tan((camera.fov * Math.PI / 180) / 2) * dist;
const vw = vh * camera.aspect;
return Math.max(vw / planeW, vh / planeH) * 1.06; // small margin
}

function loadMultiPartScene(idx, cfg) {
  // Background: still image, plus an optional looping video for chapter 09.
  // Chapter 12 uses a looping video as its whole background rather than a
  // still photo, so build a VideoTexture in that case.
  let bgVideoEl = null, bgMap;
  if (cfg.videoFull && cfg.video) {
    bgVideoEl = document.createElement("video");
    bgVideoEl.src = cfg.video;
    bgVideoEl.loop = true;
    bgVideoEl.muted = true;        // required for autoplay
    bgVideoEl.playsInline = true;
    bgVideoEl.autoplay = true;
    bgVideoEl.play().catch(() => {});
    bgMap = new THREE.VideoTexture(bgVideoEl);
    bgMap.colorSpace = THREE.SRGBColorSpace;
  } else {
    bgMap = bgTextureLoader.load(cfg.bg);
    bgMap.colorSpace = THREE.SRGBColorSpace;
  }
  const bgPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(bgPlaneWidth, bgPlaneHeight),
    new THREE.MeshBasicMaterial({ map: bgMap, transparent: true, opacity: 0.95, fog: false })
  );
  bgPlane.position.set(0, 2.0, -9);
  bgPlane.visible = false;
  scene.add(bgPlane);

  const scrim = new THREE.Mesh(
    new THREE.PlaneGeometry(bgPlaneWidth, bgPlaneHeight),
    new THREE.MeshBasicMaterial({ map: makeSideScrimTexture(), transparent: true, fog: false })
  );
  scrim.position.set(0, 2.0, -8.9);
  scrim.visible = false;
  scene.add(scrim);

  let videoPlane = null, videoEl = null;
  if (cfg.video) {
    videoEl = document.createElement("video");
    videoEl.src = cfg.video;
    videoEl.loop = true;
    videoEl.muted = true;          // muted is required for autoplay to be allowed
    videoEl.playsInline = true;
    videoEl.autoplay = true;
    videoEl.play().catch(() => {});
    const vTex = new THREE.VideoTexture(videoEl);
    vTex.colorSpace = THREE.SRGBColorSpace;
    videoPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(bgPlaneWidth, bgPlaneHeight * 0.52),
      new THREE.MeshBasicMaterial({ map: vTex, fog: false })
    );
    videoPlane.visible = false;
    scene.add(videoPlane);
    // Split layout: video occupies the upper band, the still image the lower.
    videoPlane.position.set(0, 4.4, -8.95);
    bgPlane.position.set(0, -1.4, -9);
  }

  const group = new THREE.Group();
  scene.add(group);
  group.visible = false;

  let pending = cfg.parts.length;
  const loadedParts = {};
  const T = getPartTune(idx);

  cfg.parts.forEach((part) => {
    gltfLoader.load(part.file, (gltf) => {
      const o = new THREE.Group();
      o.add(gltf.scene);
      o.traverse((n) => {
        if (n.isMesh) {
          n.castShadow = true; n.receiveShadow = true;
          if (n.material) {
            if (n.material.metalness !== undefined) n.material.metalness = Math.min(n.material.metalness, 0.25);
            if (n.material.roughness !== undefined) n.material.roughness = Math.max(n.material.roughness, 0.55);
          }
        }
      });
      loadedParts[part.role] = o;
      group.add(o);
      if (--pending === 0) arrangeParts(idx, cfg, group, loadedParts, bgPlane, scrim, videoPlane, videoEl, T);
    }, undefined, (e) => {
      console.error("[chapter" + idx + "] part failed:", part.file, e);
      if (--pending === 0) arrangeParts(idx, cfg, group, loadedParts, bgPlane, scrim, videoPlane, videoEl, T);
    });
  });
}

// Applies the per-role tuning (position / scale / rotation) on top of each
// part's stored base placement. Called on load and every frame, so the P
// panel sliders take effect immediately.
function applyPartTunes(idx, parts) {
if (!parts) return;
Object.keys(parts).forEach((role) => {
const o = parts[role];
if (!o || o.userData.baseX === undefined) return;
const T = getPartRoleTune(idx, role);
o.position.set(
o.userData.baseX + (T.x || 0),
o.userData.baseY + (T.y || 0),
o.userData.baseZ + (T.z || 0)
);
const sc = (o.userData.baseScale || 1) * (T.s === undefined ? 1 : T.s);
o.scale.setScalar(sc);
o.rotation.y = (T.rotY || 0);
});
}

function arrangeParts(idx, cfg, group, parts, bgPlane, scrim, videoPlane, videoEl, T) {
  // Normalise every part to a sensible height first, then place by role.
  function fit(o, targetH) {
    const b = new THREE.Box3().setFromObject(o);
    const sz = new THREE.Vector3(); b.getSize(sz);
    if (sz.y > 0) o.scale.setScalar(targetH / sz.y);
    const b2 = new THREE.Box3().setFromObject(o);
    const c2 = new THREE.Vector3(); b2.getCenter(c2);
    o.position.x -= c2.x; o.position.z -= c2.z;
    o.position.y -= b2.min.y;
    return new THREE.Box3().setFromObject(o);
  }

  // Fit each part to a sensible height, remember that as its BASE placement,
// then let the per-role tuning offset it. Storing the base separately means
// the sliders can move a part without accumulating drift each frame.
const roles = Object.keys(parts);
roles.forEach((role) => {
const o = parts[role];
if (!o) return;
let targetH = 1.7;
if (cfg.mode === "float") targetH = (role === "center") ? 1.75 : 1.3;
else if (cfg.mode === "thunder") {
targetH = role === "sofa" ? 1.25 : (role === "clouds" ? 1.0 : 1.15);
}
else if (cfg.mode === "split") targetH = 1.7;
else if (cfg.mode === "meadowRain") targetH = (role === "toys") ? 0.55 : 1.7;
fit(o, targetH);
o.userData.baseX = o.position.x;
o.userData.baseY = o.position.y;
o.userData.baseZ = o.position.z;
o.userData.baseScale = o.scale.x;
o.userData.role = role;
o.userData.floatPhase = Math.random() * 6.28;
});
applyPartTunes(idx, parts);

// Frame the camera on everything that ended up in the group.
  const box = new THREE.Box3().setFromObject(group);
  const size = new THREE.Vector3(); box.getSize(size);
  const c = new THREE.Vector3(); box.getCenter(c);
  const fovRad = (camera.fov * Math.PI) / 180;
  const hFov = 2 * Math.atan(Math.tan(fovRad / 2) * camera.aspect);
  const zoom = cfg.zoom !== undefined ? cfg.zoom : 1;
  const dH = (size.y * 1.5 * zoom) / (2 * Math.tan(fovRad / 2));
  const dW = (size.x * 1.45 * zoom) / (2 * Math.tan(hFov / 2));
  const dist = coverBiasedDist(dH, dW);
  const eyeY = box.min.y + size.y * (0.55 + (cfg.panY || 0));
  const framing = {
    camPos: new THREE.Vector3(c.x + size.x * (0.10 + (cfg.panX || 0)), eyeY, box.max.z + dist),
    lookTarget: new THREE.Vector3(c.x + size.x * (0.05 + (cfg.panX || 0)), eyeY, c.z),
  };

  group.userData.baseX = group.position.x;
  group.userData.baseY = group.position.y;
  group.userData.baseZ = group.position.z;
  group.userData.baseRotY = group.rotation.y;
  group.userData.parts = parts;

  loadedScenes[idx] = {
    group, bgPlane, scrim, framing, ready: true, extra: null, blink: null,
    videoPlane, videoEl,
  };
}

function loadChapterScene(idx) {
const cfg = chapterScenes[idx];
if (!cfg || loadedScenes[idx] || loadingScenes[idx]) return;
loadingScenes[idx] = true;

// Multi-part chapters (07/08/09) load several GLBs and arrange them.
if (cfg.parts) { loadMultiPartScene(idx, cfg); return; }

// Background plane + left scrim (same treatment as chapters 1-2).
// Chapter 12 uses its looping video as the full-screen background.
let bgVideoEl = null;
let bgMap;
if (cfg.videoFull && cfg.video) {
bgVideoEl = document.createElement("video");
bgVideoEl.src = cfg.video;
bgVideoEl.loop = true;
bgVideoEl.muted = true;
bgVideoEl.playsInline = true;
bgVideoEl.autoplay = true;
bgVideoEl.load();
bgMap = new THREE.VideoTexture(bgVideoEl);
bgMap.colorSpace = THREE.SRGBColorSpace;
} else {
const tex = bgTextureLoader.load(cfg.bg);
tex.colorSpace = THREE.SRGBColorSpace;
bgMap = tex;
}
const bgPlane = new THREE.Mesh(
new THREE.PlaneGeometry(bgPlaneWidth, bgPlaneHeight),
new THREE.MeshBasicMaterial({ map: bgMap, transparent: true, opacity: 0.95, fog: false })
);
bgPlane.position.set(0, 2.0, -9);
bgPlane.visible = false;
scene.add(bgPlane);

const scrim = new THREE.Mesh(
new THREE.PlaneGeometry(bgPlaneWidth, bgPlaneHeight),
new THREE.MeshBasicMaterial({ map: makeSideScrimTexture(), transparent: true, fog: false })
);
scrim.position.set(0, 2.0, -8.9);
scrim.visible = false;
scene.add(scrim);

gltfLoader.load(cfg.glb, (gltf) => {
const group = new THREE.Group();
group.add(gltf.scene);
scene.add(group);

// Normalize height and stand on the floor.
let box = new THREE.Box3().setFromObject(group);
let size = new THREE.Vector3(); box.getSize(size);
const targetH = cfg.mode === "walk" ? 1.9 : 1.75;
group.scale.setScalar(targetH / (size.y || 1));

box = new THREE.Box3().setFromObject(group);
box.getSize(size);
let c = new THREE.Vector3(); box.getCenter(c);
group.position.x -= c.x;
group.position.z -= c.z;
group.position.y -= box.min.y;

group.traverse((n) => {
if (n.isMesh) {
n.castShadow = true; n.receiveShadow = true;
if (n.material) {
if (n.material.metalness !== undefined) n.material.metalness = Math.min(n.material.metalness, 0.2);
if (n.material.roughness !== undefined) n.material.roughness = Math.max(n.material.roughness, 0.6);
const aniso = renderer.capabilities.getMaxAnisotropy();
["map","normalMap","roughnessMap"].forEach((k)=>{ if(n.material[k]){ n.material[k].anisotropy=aniso; n.material[k].needsUpdate=true; }});
}
}
});

// Frame the camera so the whole group fits with margin.
box = new THREE.Box3().setFromObject(group);
box.getSize(size); box.getCenter(c);
const fovRad = (camera.fov * Math.PI) / 180;
const hFov = 2 * Math.atan(Math.tan(fovRad / 2) * camera.aspect);
// Per-chapter camera tuning, read from the chapterScenes config:
// zoom > 1 = further away (see more), < 1 = closer in
// panX + = subject moves toward one side, - = the other
// panY + = subject sits higher in frame, - = lower
const zoom = cfg.zoom !== undefined ? cfg.zoom : 1;
const panX = cfg.panX !== undefined ? cfg.panX : 0;
const panY = cfg.panY !== undefined ? cfg.panY : 0;

const dH = (size.y * 1.5 * zoom) / (2 * Math.tan(fovRad / 2));
const dW = (size.x * 1.45 * zoom) / (2 * Math.tan(hFov / 2));
const dist = coverBiasedDist(dH, dW);
const eyeY = box.min.y + size.y * (0.55 + panY);
const framing = {
camPos: new THREE.Vector3(c.x + size.x * (0.10 + panX), eyeY, box.max.z + dist),
lookTarget: new THREE.Vector3(c.x + size.x * (0.05 + panX), eyeY, c.z),
};

group.visible = false;
group.userData.baseX = group.position.x;
group.userData.baseY = group.position.y;
group.userData.baseZ = group.position.z;
group.userData.baseRotY = group.rotation.y;
group.userData.rightOffset = cfg.mode === "walk" ? size.x * 0.12 : 0;

loadedScenes[idx] = { group, bgPlane, scrim, framing, ready: true, extra: null, blink: null, videoEl: null, bgVideoEl };
loadedScenes[idx].blink = setupChapterBlink(idx, group, framing);

// Chapter 4 also loads the toys as a second object.
if (cfg.extraGlb) {
gltfLoader.load(cfg.extraGlb, (g2) => {
const toys = new THREE.Group();
toys.add(g2.scene);
scene.add(toys);
let tb = new THREE.Box3().setFromObject(toys);
const tsize = new THREE.Vector3(); tb.getSize(tsize);
// Scale the toys relative to the girl so they read as plush toys on
// the table rather than arriving at some unrelated scale.
toys.scale.setScalar((size.y * 0.22) / (tsize.y || 1));
tb = new THREE.Box3().setFromObject(toys);
const tc = new THREE.Vector3(); tb.getCenter(tc);
tb.getSize(tsize);
// Place on the table in front of her, slightly to her side.
toys.position.x += (c.x - tc.x) - size.x * 0.16;
toys.position.z += (c.z - tc.z) + size.z * 0.30;
toys.position.y += (box.min.y + size.y * 0.46) - tb.min.y;
toys.traverse((n)=>{ if(n.isMesh){ n.castShadow=true; n.receiveShadow=true; }});
toys.visible = false;
toys.userData.baseY = toys.position.y;
loadedScenes[idx].extra = toys;
}, undefined, (e) => console.error("[chapter" + idx + "] toys failed:", e));
}
}, undefined, (e) => console.error("[chapter" + idx + "] model failed:", e));
}

/* ---- Blinking eyes for chapters 3-5 ------------------------------------
Same sprite technique proven on the chapter-2 girl: two small skin-toned
sprites sit just in front of the eyes and snap to full height for a
fraction of a second to read as a blink. Sprites are added to the SCENE
(not parented to the model) so no inherited mesh scale can distort them,
and they always face the camera. Position is found by raycasting from the
camera onto the face, then stored as a local offset so the sprites follow
the model as it moves.

Placement can never be perfect automatically (these meshes carry no
landmark data), so every chapter has eyeX / eyeY / eyeScale sliders in the
camera panel — press C, drag until the blink lands on her eyes, then copy
the values into eyeTune below. */
const eyeTune = {
2: { eyeX: 0, eyeY: 0, eyeGap: 1, eyeScale: 1 },
3: { eyeX: 0.02, eyeY: 0.0, eyeGap: 1.35, eyeScale: 1.8 },
4: { eyeX: 0.04, eyeY: 0.02, eyeGap: 1.2, eyeScale: 1.7 },
};
function getEyeTune(i) {
if (!eyeTune[i]) eyeTune[i] = { eyeX: 0, eyeY: 0, eyeGap: 1, eyeScale: 1 };
return eyeTune[i];
}

// Which side of the model the girl is on, and how high her eyes sit, differ
// per chapter — these are starting guesses, refine with the sliders.
const eyeSetup = {
2: { xFrac: 0.22, yFrac: 0.075 }, // ch3: girl on one side of the pair
3: { xFrac: 0.28, yFrac: 0.072 }, // ch4: girl at the table
4: { xFrac: -0.12, yFrac: 0.082 }, // ch5: girl behind/left of the boy
};

function setupChapterBlink(idx, group, framing) {
const cfgEye = eyeSetup[idx];
if (!cfgEye) return null;

group.updateMatrixWorld(true);
const box = new THREE.Box3().setFromObject(group);
const size = new THREE.Vector3(); box.getSize(size);
const center = new THREE.Vector3(); box.getCenter(center);

const ray = new THREE.Raycaster();
const rayOriginZ = box.max.z + 2;
function surfaceAt(xOff, yFrac) {
const worldX = center.x + xOff;
const worldY = box.max.y - size.y * yFrac;
ray.set(new THREE.Vector3(worldX, worldY, rayOriginZ), new THREE.Vector3(0, 0, -1));
const hits = ray.intersectObject(group, true);
if (hits.length > 0) {
const hit = hits[0];
const normal = hit.face.normal.clone().transformDirection(group.matrixWorld);
return hit.point.clone().addScaledVector(normal, 0.016);
}
return new THREE.Vector3(worldX, worldY, center.z + size.z * 0.3);
}

const headX = size.x * cfgEye.xFrac;
const gap = size.y * 0.028;
const wL = surfaceAt(headX - gap, cfgEye.yFrac);
const wR = surfaceAt(headX + gap, cfgEye.yFrac);

const lidW = size.y * 0.028;
const lidH = size.y * 0.018;
const lidGeo = new THREE.PlaneGeometry(lidW, lidH);
const lidMat = new THREE.MeshStandardMaterial({
color: 0xf3caa6,
roughness: 0.85,
metalness: 0,
side: THREE.DoubleSide,
});

function makeLid(worldPos) {
const dummy = new THREE.Object3D();
dummy.position.copy(worldPos);
dummy.lookAt(camera.position);
const worldQuat = dummy.quaternion.clone();
const parentWorldQuat = group.getWorldQuaternion(new THREE.Quaternion());
const localQuat = parentWorldQuat.clone().invert().multiply(worldQuat);
const localPos = group.worldToLocal(worldPos.clone());

const mesh = new THREE.Mesh(lidGeo, lidMat.clone());
mesh.userData.baseLocalPos = localPos.clone();
mesh.userData.baseLocalQuat = localQuat.clone();
mesh.position.copy(mesh.userData.baseLocalPos);
mesh.quaternion.copy(mesh.userData.baseLocalQuat);
mesh.scale.set(1, 0.001, 1);
mesh.userData.baseW = lidW;
mesh.userData.baseH = lidH;
mesh.userData.baseScaleY = lidH;
mesh.userData.baseScaleX = lidW;
mesh.renderOrder = 10;
mesh.visible = false;
group.add(mesh);
return mesh;
}

const L = makeLid(wL);
const R = makeLid(wR);
return {
L,
R,
offL: group.worldToLocal(wL.clone()),
offR: group.worldToLocal(wR.clone()),
unit: size.y,
next: 1.0 + Math.random() * 1.4,
start: null,
};
}

function updateChapterBlink(idx, t, visible) {
const sc = loadedScenes[idx];
if (!sc || !sc.blink) return;
const bl = sc.blink;
const group = sc.group;
if (!visible) {
[bl.L, bl.R].forEach((mesh) => { mesh.visible = false; });
return;
}
[bl.L, bl.R].forEach((mesh) => { mesh.visible = true; });

group.updateMatrixWorld(true);
const T = getEyeTune(idx);
const u = bl.unit || 1;
const gapShift = (T.eyeGap - 1) * 0.03 * u;
const dL = bl.offL.clone().add(new THREE.Vector3((T.eyeX - gapShift), T.eyeY * u, 0));
const dR = bl.offR.clone().add(new THREE.Vector3((T.eyeX + gapShift), T.eyeY * u, 0));
bl.L.position.copy(bl.L.userData.baseLocalPos || dL);
bl.R.position.copy(bl.R.userData.baseLocalPos || dR);
bl.L.quaternion.copy(bl.L.userData.baseLocalQuat || bl.L.quaternion);
bl.R.quaternion.copy(bl.R.userData.baseLocalQuat || bl.R.quaternion);

if (t > bl.next && bl.start === null) bl.start = t;
let amt = 0;
if (bl.start !== null) {
const bt = t - bl.start, half = 0.09;
if (bt < half) amt = bt / half;
else if (bt < half * 2) amt = 1 - (bt - half) / half;
else { amt = 0; bl.start = null; bl.next = t + 1.8 + Math.random() * 2.4; }
}
const clamped = Math.max(0.001, amt);
bl.L.scale.x = bl.L.userData.baseScaleX;
bl.R.scale.x = bl.R.userData.baseScaleX;
bl.L.scale.y = clamped;
bl.R.scale.y = clamped;
}

// Show/hide a chapter-3/4/5 scene and adopt its camera + lighting.
function applyExtraChapter(idx) {
const sc = loadedScenes[idx];
if (!sc) return false;
sc.group.userData.__enterT = clock.getElapsedTime();
sc.group.visible = true;
sc.bgPlane.visible = true;
sc.scrim.visible = true;
if (sc.bgVideoEl) sc.bgVideoEl.play().catch(() => {});
if (sc.videoEl) sc.videoEl.play().catch(() => {});
if (sc.videoPlane) { sc.videoPlane.visible = true; if (sc.videoEl) sc.videoEl.play().catch(()=>{}); }
if (sc.extra) sc.extra.visible = true;
applyLightPreset(chapterScenes[idx].light);
baseCamPos.copy(sc.framing.camPos);
lookTarget.copy(sc.framing.lookTarget);
if (!transitionActive) camera.position.copy(sc.framing.camPos);
return true;
}

function hideAllExtraChapters(exceptIdx) {
Object.keys(loadedScenes).forEach((k) => {
if (String(exceptIdx) === k) return;
const sc = loadedScenes[k];
sc.group.visible = false;
sc.bgPlane.visible = false;
sc.scrim.visible = false;
if (sc.videoPlane) sc.videoPlane.visible = false;
if (splitFillLight) splitFillLight.intensity = 0;
if (sc.extra) sc.extra.visible = false;
if (sc.blink) { sc.blink.L.visible = false; sc.blink.R.visible = false; }
});
}

// Per-chapter motion, called every frame while that chapter is showing.
function animateExtraChapter(idx, t) {
const sc = loadedScenes[idx];
if (!sc || !sc.group.visible) return;
const g = sc.group;
const mode = chapterScenes[idx].mode;
const u = g.userData;

if (mode === "walk") {
// Gliding "walk" away from the camera on a slow loop, with a gait bob and
// a gentle side-to-side sway. Legs cannot stride (no rig), so the bob
// and sway are what sell the motion.
const cycle = (t * 0.22) % 1; // 0..1 loop
const travel = 1.6; // how far they advance
g.position.z = u.baseZ + travel * 0.5 - cycle * travel;
g.position.y = u.baseY + Math.abs(Math.sin(t * 3.4)) * 0.022; // step bob
g.position.x = u.baseX + u.rightOffset + Math.sin(t * 1.7) * 0.02; // right-side sway
g.rotation.y = u.baseRotY + getModelTune(idx).rotY + Math.sin(t * 1.7) * 0.05;
g.rotation.z = Math.sin(t * 3.4) * 0.012;
} else if (mode === "nostalgia") {
// Quiet, wistful: slow breathing sway and a soft lean toward the toys.
g.position.y = u.baseY + Math.sin(t * 1.05) * 0.006;
g.rotation.y = u.baseRotY + getModelTune(idx).rotY + Math.sin(t * 0.5) * 0.045;
g.rotation.x = Math.sin(t * 0.7) * 0.012;
if (sc.extra) sc.extra.position.y = sc.extra.userData.baseY + Math.sin(t * 1.4) * 0.004;
} else if (mode === "rain") {
// Umbrella scene: gentle shelter-from-the-rain sway, nothing bouncy.
g.position.y = u.baseY + Math.sin(t * 0.9) * 0.005;
g.rotation.y = u.baseRotY + getModelTune(idx).rotY + Math.sin(t * 0.45) * 0.03;
g.rotation.z = Math.sin(t * 0.7) * 0.006;
} else if (mode === "float" || mode === "thunder" || mode === "split") {
// Multi-part chapters: re-apply the per-role tuning first (so the P panel
// sliders are live), then layer a small idle motion ON TOP of the tuned
// position rather than replacing it.
const P = u.parts || {};
applyPartTunes(idx, P);
g.rotation.y = u.baseRotY + getModelTune(idx).rotY;

if (mode === "float") {
["leftRock", "rightRock"].forEach((role, i2) => {
const o = P[role];
if (!o) return;
o.position.y += Math.sin(t * 0.75 + (o.userData.floatPhase || i2 * 2)) * 0.09;
o.rotation.y += Math.sin(t * 0.25 + i2) * 0.03;
});
if (P.center) P.center.position.y += Math.sin(t * 1.0) * 0.006;
} else if (mode === "thunder") {
if (P.couple) P.couple.position.y += Math.sin(t * 0.9) * 0.004;
// Storm clouds drift and bob overhead rather than sitting frozen.
if (P.clouds) {
P.clouds.position.y += Math.sin(t * 0.55) * 0.035;
P.clouds.position.x += Math.sin(t * 0.3) * 0.03;
P.clouds.rotation.y += Math.sin(t * 0.2) * 0.02;
}
} else if (mode === "split") {
if (P.bike) {
P.bike.rotation.z = Math.sin(t * 0.8) * 0.012;
// Vertical placement is owned by the 60/40 band layout each frame, so
// only a very small ride-bob is added here.
P.bike.position.y += Math.sin(t * 2.2) * 0.006;
const wheels = P.bike.userData.wheels;
if (wheels) wheels.forEach((w) => { if (w) w.rotation.x -= 0.28; });
}
if (P.couple) {
P.couple.rotation.y += Math.sin(t * 0.4) * 0.018;
P.couple.position.y += Math.sin(t * 0.9) * 0.004;
}
}
} else if (mode === "meadowRain") {
// Sitting together under the tree in the rain: very calm, just breathing
// and a slight lean, plus the toys settling beside them.
const P = u.parts || {};
applyPartTunes(idx, P);
g.rotation.y = u.baseRotY + getModelTune(idx).rotY;
if (P.couple) P.couple.position.y += Math.sin(t * 0.85) * 0.005;
if (P.toys) P.toys.position.y += Math.sin(t * 1.1 + 1) * 0.003;
} else if (mode === "stargaze") {
// Looking out over the city at night — slow, still, contemplative.
g.position.y = u.baseY + Math.sin(t * 0.6) * 0.004;
g.rotation.y = u.baseRotY + getModelTune(idx).rotY + Math.sin(t * 0.3) * 0.02;
} else if (mode === "lanterns") {
// Lanterns rising behind them; the pair stay quiet and close. The
// background video shows the land dropping away sharply right as this
// chapter opens, so the model eases down over the same ~2s window to
// match it, then holds still in its settled spot (no idle bob) instead
// of drifting back up.
const dropDuration = 2.0;
const dropAmount = 0.18;
const sinceEnter = t - (u.__enterT !== undefined ? u.__enterT : t);
const dropProgress = Math.min(1, Math.max(0, sinceEnter / dropDuration));
const eased = 1 - Math.pow(1 - dropProgress, 3); // ease-out cubic
g.position.y = u.baseY - dropAmount * eased;
g.rotation.y = u.baseRotY + getModelTune(idx).rotY + Math.sin(t * 0.25) * 0.018;
} else if (mode === "wedding") {
// Ceremony scenes: dignified, minimal motion — a gentle sway only.
g.position.y = u.baseY + Math.sin(t * 0.75) * 0.004;
g.rotation.y = u.baseRotY + getModelTune(idx).rotY + Math.sin(t * 0.35) * 0.015;
} else if (mode === "surprise") {
// Chapter 5 should feel delighted but stable: keep the model rooted in
// place instead of drifting sideways or floating around. The earlier
// version had a wider rotation + bounce, which made the whole figure
// sway too much. This keeps the smile energy while removing the shake.
const pop = Math.pow(Math.max(0, Math.sin(t * 1.2)), 3);
g.position.x = u.baseX;
g.position.y = u.baseY + pop * 0.012 + Math.sin(t * 0.8) * 0.003;
g.position.z = u.baseZ;
g.rotation.y = u.baseRotY + getModelTune(idx).rotY + Math.sin(t * 0.7) * 0.025;
g.rotation.x = Math.sin(t * 0.9) * 0.008;
g.rotation.z = Math.sin(t * 0.8) * 0.006;
}
}

function loadChapter2Model() {
gltfLoader.load(
"assets/models/chapter2.glb",
(gltf) => {
const group = gltf.scene;
scene.add(group);

const box = new THREE.Box3().setFromObject(group);
const size = new THREE.Vector3();
box.getSize(size);
const scale = 1.82 / (size.y || 1);
group.scale.setScalar(scale);

const box2 = new THREE.Box3().setFromObject(group);
const size2 = new THREE.Vector3();
box2.getSize(size2);
const center2 = new THREE.Vector3();
box2.getCenter(center2);
group.position.x -= center2.x;
group.position.z -= center2.z;
group.position.y -= box2.min.y;
// The source model leaves a small visible gap beneath the feet after
// splitting it into the two independently posed people.
group.position.y -= 0.04;

let meshNode = null;
group.traverse((n) => {
if (n.isMesh && n.geometry && n.geometry.attributes.position) {
if (!meshNode || n.geometry.attributes.position.count > meshNode.geometry.attributes.position.count) {
meshNode = n;
}
}
});
if (!meshNode) {
finishLoad();
return;
}

meshNode.material.envMapIntensity = 1.1;
if (meshNode.material.metalness !== undefined) meshNode.material.metalness = Math.min(meshNode.material.metalness, 0.2);
if (meshNode.material.roughness !== undefined) meshNode.material.roughness = Math.max(meshNode.material.roughness, 0.6);
const maxAniso = renderer.capabilities.getMaxAnisotropy();
["map", "normalMap", "roughnessMap", "metalnessMap"].forEach((slot) => {
if (meshNode.material[slot]) {
meshNode.material[slot].anisotropy = maxAniso;
meshNode.material[slot].needsUpdate = true;
}
});

meshNode.updateMatrixWorld(true);
const finalBox = new THREE.Box3().setFromObject(group);
const finalSize = new THREE.Vector3();
finalBox.getSize(finalSize);
const finalCenter = new THREE.Vector3();
finalBox.getCenter(finalCenter);

// Split into two people by an X-plane through the middle.
const invMat = meshNode.matrixWorld.clone().invert();
const splitLocalX = new THREE.Vector3(finalCenter.x, finalCenter.y, finalCenter.z).applyMatrix4(invMat).x;

const posAttr = meshNode.geometry.attributes.position;
const srcIndex = meshNode.geometry.index.array;
const idxLeft = [];
const idxRight = [];
for (let i = 0; i < srcIndex.length; i += 3) {
const a = srcIndex[i], b = srcIndex[i + 1], c = srcIndex[i + 2];
const cx = (posAttr.getX(a) + posAttr.getX(b) + posAttr.getX(c)) / 3;
if (cx < splitLocalX) idxLeft.push(a, b, c);
else idxRight.push(a, b, c);
}

const geoLeft = meshNode.geometry.clone();
geoLeft.setIndex(idxLeft);
const geoRight = meshNode.geometry.clone();
geoRight.setIndex(idxRight);
const meshLeft = new THREE.Mesh(geoLeft, meshNode.material);
const meshRight = new THREE.Mesh(geoRight, meshNode.material);
[meshLeft, meshRight].forEach((m) => {
m.position.copy(meshNode.position);
m.rotation.copy(meshNode.rotation);
m.scale.copy(meshNode.scale);
m.castShadow = true;
m.receiveShadow = true;
});
const parent = meshNode.parent;
parent.remove(meshNode);
parent.add(meshLeft);
parent.add(meshRight);

// Re-pivot each half around its own body center so rotating it for
// sway/lean feels like that person moving, not orbiting some
// point between the two of them.
function makePivot(mesh) {
mesh.updateMatrixWorld(true);
const b = new THREE.Box3().setFromObject(mesh);
const c = new THREE.Vector3();
b.getCenter(c);
const localCenter = c.clone().applyMatrix4(parent.matrixWorld.clone().invert());
const pivot = new THREE.Group();
pivot.position.copy(localCenter);
parent.remove(mesh);
mesh.position.sub(localCenter);
pivot.add(mesh);
parent.add(pivot);
return pivot;
}
chapter2PersonA = makePivot(meshLeft); // boy (left, back to camera)
chapter2PersonB = makePivot(meshRight); // girl (right, facing camera)
chapter2PersonA.userData.baseRotY = chapter2PersonA.rotation.y;
chapter2PersonB.userData.baseRotY = chapter2PersonB.rotation.y;
chapter2PersonA.userData.floorOffsetY = -0.012;
chapter2PersonB.userData.floorOffsetY = -0.010;
chapter2PersonA.visible = false;
chapter2PersonB.visible = false;

// Decide which pivot/mesh is the girl by PROJECTING each one to screen
// space rather than comparing raw world X. World +X does not reliably
// map to screen-right (it depends on where the camera ended up), and
// guessing wrong is exactly what put the mouth sprite on the boy's head.
// The girl is the one that appears further right on screen.
function screenX(pivot) {
const v = new THREE.Vector3();
pivot.getWorldPosition(v);
v.project(camera);
return v.x;
}
const girlIsB = screenX(chapter2PersonB) > screenX(chapter2PersonA);
const girlPivot = girlIsB ? chapter2PersonB : chapter2PersonA;
const girlMesh = girlIsB ? meshRight : meshLeft;
chapter2GirlIsB = girlIsB;
// Person A faces away from camera (back of head visible per the
// reference image), so a front-facing blink overlay wouldn't be
// visible anyway — skipped for A, kept for B who faces camera.

// Mouth movement (speaking cue) — only for B, who faces the camera;
// skipped for A since a mouth overlay on the back of a head would
// never be visible anyway.

// Hand/arm gesture region — only for B, who faces the camera and has
// a clearly visible pair of hands to isolate. A raycast approaching
// from the camera side can only ever hit A's back/hair (his hands are
// in front of his own torso, facing away, hidden from that angle) —
// attempting it on A picked up a stray patch of his jacket instead of
// a hand, so it's skipped for him rather than risk that kind of
// visible artifact.
// NOTE: hand/arm geometry splitting was removed here. Cutting a region
// of triangles out of the body mesh and moving it independently left a
// visible tear/hole in her thigh (the moved triangles pulled away from
// the surrounding surface). Since this model is a single unrigged mesh,
// there's no clean seam to split along. Body language is instead done
// by animating each person's whole pivot — bigger, cleaner, no tearing.

// Camera framing: fit both people (width AND height) into frame.
const fovRad = (camera.fov * Math.PI) / 180;
const distForHeight = (finalSize.y * 1.45) / (2 * Math.tan(fovRad / 2));
const hFovRad = 2 * Math.atan(Math.tan(fovRad / 2) * camera.aspect);
const distForWidth = (finalSize.x * 1.5) / (2 * Math.tan(hFovRad / 2));
const dist = coverBiasedDist(distForHeight, distForWidth);
const eyeHeight = finalBox.min.y + finalSize.y * 0.56;
chapter2Framing.camPos.set(finalCenter.x, eyeHeight, finalBox.max.z + dist);
chapter2Framing.lookTarget.set(finalCenter.x, eyeHeight, finalCenter.z);

// Use chapter 2's actual camera framing when finding the girl's face
// surface. The previous chapter's camera can raycast past her head and
// leave the eye and mouth overlays off-model or invisible.
camera.position.copy(chapter2Framing.camPos);
camera.lookAt(chapter2Framing.lookTarget);
setupFaceSprites(girlPivot, girlMesh);

chapter2Loaded = true;
loadChapterScene(2); // start chapter 3 loading early
},
undefined,
(err) => {
console.error("Chapter 2 model failed to load:", err);
}
);
}

let loaded = false;
function finishLoad() { if (loaded) return;
loaded = true;
loaderPct.textContent = "100%";
setTimeout(() => loaderEl.classList.add("hidden"), 350);
}
// Safety net in case loading stalls (e.g. offline preview without a server).
setTimeout(finishLoad, 6000);

/* =========================================================
4. MOUSE PARALLAX (camera micro-movement — "pro" cinematic feel)
========================================================= */
let mouseX = 0, mouseY = 0, targetX = 0, targetY = 0;
window.addEventListener("pointermove", (e) => {
mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
});

let nextBlinkAt = 1.5 + Math.random() * 2;
let blinkStart = null;
const blinkDuration = 0.14;

/* ---- 3D chapter transition: a camera swoop (push in + orbit + settle
back), not a flat slide/fade. The camera arcs around the look target and
pushes closer at the midpoint — that's also when the text content swaps —
then eases back out to the normal framing. Declared here (before animate()
first runs) since animate() references these every frame. */
let transitionActive = false;
let transitionStart = 0;
let transitionSwapped = false;
const transitionDuration = 1.15; // seconds, total swoop time
const transitionFromPos = new THREE.Vector3();
const transitionMidPos = new THREE.Vector3();
let transitionDirSign = 1; // alternates left/right orbit so it doesn't feel repetitive
let pendingChapterIndex = null;

function easeInOutCubic(x) {
return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function updateBlinkState(state, tNow) {
if (!state.eyelidLeft || !state.eyelidRight) return;
state.eyelidLeft.position.copy(state.eyelidLeft.userData.baseLocalPos || state.eyelidLeft.position);
state.eyelidRight.position.copy(state.eyelidRight.userData.baseLocalPos || state.eyelidRight.position);
state.eyelidLeft.quaternion.copy(state.eyelidLeft.userData.baseLocalQuat || state.eyelidLeft.quaternion);
state.eyelidRight.quaternion.copy(state.eyelidRight.userData.baseLocalQuat || state.eyelidRight.quaternion);

if (tNow > state.nextBlinkAt && state.blinkStart === null) {
state.blinkStart = tNow;
}
if (state.blinkStart !== null) {
const bt = tNow - state.blinkStart;
const half = blinkDuration / 2;
let s;
if (bt < half) s = bt / half;
else if (bt < blinkDuration) s = 1 - (bt - half) / half;
else {
s = 0;
state.blinkStart = null;
state.nextBlinkAt = tNow + 2.4 + Math.random() * 3.6;
}
const clamped = Math.max(0.001, s);
state.eyelidLeft.scale.y = clamped;
state.eyelidRight.scale.y = clamped;
}
}

/* =========================================================
5. RENDER LOOP — idle breathing/sway substitutes for a
skeletal typing animation since the source GLB has no rig.
========================================================= */
/* ---- "Magical" transition sparkle burst -------------------------------
Fires at the moment the chapter content swaps, so the camera swoop is
punctuated by a visible flourish rather than just gliding. */
const sparkleCount = 90;
const sparkleGeo = new THREE.BufferGeometry();
const sparklePos = new Float32Array(sparkleCount * 3);
const sparkleVel = [];
for (let i = 0; i < sparkleCount; i++) {
sparklePos[i*3] = 0; sparklePos[i*3+1] = -999; sparklePos[i*3+2] = 0;
sparkleVel.push(new THREE.Vector3());
}
sparkleGeo.setAttribute("position", new THREE.BufferAttribute(sparklePos, 3));
const sparkleMat = new THREE.PointsMaterial({
size: 0.075, map: makeParticleSprite("rgba(255,225,255,0.95)"),
transparent: true, depthWrite: false, opacity: 0, blending: THREE.AdditiveBlending,
});
const sparkles = new THREE.Points(sparkleGeo, sparkleMat);
sparkles.frustumCulled = false;
scene.add(sparkles);
let sparkleT = -1;

// Full-screen white flash used alongside the sparkle burst.
const flashEl = document.createElement("div");
flashEl.style.cssText =
"position:fixed;inset:0;z-index:50;pointer-events:none;opacity:0;" +
"background:radial-gradient(circle at 55% 50%, rgba(255,240,255,.9), rgba(190,220,255,.35) 45%, transparent 75%)";
document.body.appendChild(flashEl);

function burstSparkles() {
sparkleT = 0;
const origin = lookTarget.clone();
const attr = sparkleGeo.attributes.position;
for (let i = 0; i < sparkleCount; i++) {
attr.array[i*3] = origin.x + (Math.random()-0.5)*0.4;
attr.array[i*3+1] = origin.y + (Math.random()-0.5)*0.9;
attr.array[i*3+2] = origin.z + (Math.random()-0.5)*0.4;
sparkleVel[i].set((Math.random()-0.5)*1.5, Math.random()*1.1+0.2, (Math.random()-0.5)*1.5);
}
attr.needsUpdate = true;
}

function updateSparkles(dt) {
if (sparkleT < 0) return;
sparkleT += dt;
const life = 1.3;
if (sparkleT > life) { sparkleT = -1; sparkleMat.opacity = 0; return; }
const k = sparkleT / life;
sparkleMat.opacity = Math.sin((1 - k) * Math.PI * 0.5) * 0.95;
const attr = sparkleGeo.attributes.position;
for (let i = 0; i < sparkleCount; i++) {
attr.array[i*3] += sparkleVel[i].x * dt;
attr.array[i*3+1] += sparkleVel[i].y * dt;
attr.array[i*3+2] += sparkleVel[i].z * dt;
sparkleVel[i].y -= 0.9 * dt; // gentle gravity
}
attr.needsUpdate = true;
}

/* ---- Live camera tuning (press "C") -----------------------------------
Adjusts the current chapter's camera without editing code or reloading.
Works on EVERY chapter (1-5). Drag until the framing looks right, then
copy the printed line into cameraTune below to make it permanent. */
const cameraTune = {
// chapterIndex: { zoom, panX, panY, panUp }
0: { zoom: 1, panX: 0, panY: 0 },
1: { zoom: 0.98, panX: 0, panY: 0 },   // ch2: nudged left
2: { zoom: 1, panX: 0, panY: 0 },    // ch3: nudged left
3: { zoom: 0.5, panX: 0, panY: 0.2 },   // ch4: nudged left (was 0.24)
4: { zoom: 0.7, panX: 0, panY: 0.10 }, // ch5: left + zoomed out + moved down
5: { zoom: 0.6, panX: 0, panY: 0.10 },
6: { zoom: 1.2, panX: 0, panY: 0 },        // ch7: zoomed out to bring the floating rocks into frame
7: { zoom: 1, panX: 0, panY: 0 },      // ch8: nudged left
8: { zoom: 1.1, panX: 0, panY: 0 },
9: { zoom: 1, panX: 0, panY: 0 },
10: { zoom: 1, panX: 0, panY: 0 },      // ch11: moved fully right (was -0.28)
11: { zoom: 1, panX: 0, panY: 0.05 },
12: { zoom: 1, panX: 0, panY: 0.03 },
13: { zoom: 1, panX: 0, panY: 0 },      // ch14: nudged left (was 0.18)
};
// Per-chapter model rotation (radians). Adjust with the R slider in the
// camera panel, or set permanently here.
const modelTune = { 0:{rotY:0}, 1:{rotY:0}, 2:{rotY:3.14}, 3:{rotY:-0.57}, 4:{rotY:0.15},
5:{rotY:0}, 6:{rotY:0}, 7:{rotY:0}, 8:{rotY:2.18},
9:{rotY:0}, 10:{rotY:3.16}, 11:{rotY:3.16}, 12:{rotY:0}, 13:{rotY:0} };

// Per-chapter background image placement: x/y shift and scale.
const bgTune = { 0:{bgX:-0.5,bgY:0,bgScale:2}, 1:{bgX:-0.1,bgY:-1,bgScale:1}, 2:{bgX:-0.2,bgY:0,bgScale:1.1},
                 3:{bgX:-1.2,bgY:-0.7,bgScale:1}, 4:{bgX:0,bgY:0,bgScale:1},
5:{bgX:0,bgY:0,bgScale:1}, 6:{bgX:0,bgY:0,bgScale:1.5},
7:{bgX:-1.2,bgY:-0.7,bgScale:1}, 8:{bgX:0.8,bgY:0.9,bgScale:1.3},
9:{bgX:0,bgY:0,bgScale:1}, 10:{bgX:2,bgY:0,bgScale:1.15}, 11:{bgX:-0.9,bgY:2,bgScale:1.2},
12:{bgX:0,bgY:-0.12,bgScale:0.92}, 13:{bgX:0,bgY:0,bgScale:1} };
function getBgTune(i) {
if (!bgTune[i]) bgTune[i] = { bgX: 0, bgY: 0, bgScale: 1 };
return bgTune[i];
}

function getModelTune(i) {
if (!modelTune[i]) modelTune[i] = { rotY: 0 };
return modelTune[i];
}

function getCamTune(i) {
if (!cameraTune[i]) cameraTune[i] = { zoom: 1, panX: 0, panY: 0 };
return cameraTune[i];
}

// Applies the tuning to the settled camera position each frame. Zoom scales
// the distance from the look target; panX slides along the camera's own
// right axis and panY along its up axis, so the directions always match
// what you see on screen regardless of how the scene is rotated.
function applyCameraTune(camPosOut, lookOut, idx) {
const T = getCamTune(idx);
const dir = camPosOut.clone().sub(lookOut);
dir.multiplyScalar(T.zoom);
const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
const up = new THREE.Vector3(0, 1, 0);
const len = dir.length();
const shift = right.multiplyScalar(T.panX * len).add(up.clone().multiplyScalar(T.panY * len));
camPosOut.copy(lookOut).add(dir).add(shift);
lookOut.add(shift);
}

let camPanelBuilt = false;
function buildCameraPanel() {
if (camPanelBuilt) return;
camPanelBuilt = true;
const panel = document.createElement("div");
panel.style.cssText =
"position:fixed;left:16px;bottom:70px;z-index:99999;background:rgba(10,12,18,.93);" +
"border:1px solid rgba(255,255,255,.15);border-radius:12px;padding:14px 16px;" +
"font:12px/1.6 monospace;color:#cfe6ff;width:270px;display:none;backdrop-filter:blur(8px)";
const rows = [["zoom", 0.4, 2.5, 0.02], ["panX", -1, 1, 0.01], ["panY", -1, 1, 0.01],
["rotY", -3.14, 3.14, 0.02],
["bgX", -6, 6, 0.05], ["bgY", -6, 6, 0.05], ["bgScale", 0.5, 2.5, 0.02],
["eyeX", -0.6, 0.6, 0.005], ["eyeY", -0.4, 0.4, 0.005],
["eyeGap", 0.2, 3, 0.05], ["eyeScale", 0.3, 3, 0.05]];
let html = "<b>Camera (press C to hide)</b><br><span style='opacity:.7'>Adjusts the chapter you're on.</span><br><br>";
rows.forEach(([k, mn, mx, st]) => {
html += `<label>${k} <span id="cv_${k}">1</span><br>` +
`<input id="cs_${k}" type="range" min="${mn}" max="${mx}" step="${st}" value="1" style="width:100%"></label>`;
});
html += `<br><button id="camReset" style="width:100%;padding:5px;margin-bottom:6px;cursor:pointer">Reset this chapter</button>` +
`<textarea id="camOut" readonly style="width:100%;height:76px;background:#05070c;color:#8fe6ff;border:1px solid rgba(255,255,255,.15);border-radius:6px;font:11px monospace"></textarea>`;
panel.innerHTML = html;
document.body.appendChild(panel);

function sync() {
const T = getCamTune(currentChapter);
const M = getModelTune(currentChapter);
rows.forEach(([k]) => {
const B = getBgTune(currentChapter);
const E = getEyeTune(currentChapter);
const v = (k === "rotY") ? M.rotY
: (E[k] !== undefined ? E[k]
: (B[k] !== undefined ? B[k] : T[k]));
document.getElementById("cs_" + k).value = v;
document.getElementById("cv_" + k).textContent = v;
});
document.getElementById("camOut").value =
"ch" + (currentChapter + 1) + " cam -> zoom: " + T.zoom + ", panX: " + T.panX + ", panY: " + T.panY +
"\nch" + (currentChapter + 1) + " model -> rotY: " + M.rotY +
"\nch" + (currentChapter + 1) + " bg -> bgX: " + getBgTune(currentChapter).bgX +
", bgY: " + getBgTune(currentChapter).bgY + ", bgScale: " + getBgTune(currentChapter).bgScale +
"\nch" + (currentChapter + 1) + " eyes -> eyeX: " + getEyeTune(currentChapter).eyeX +
", eyeY: " + getEyeTune(currentChapter).eyeY + ", eyeGap: " + getEyeTune(currentChapter).eyeGap +
", eyeScale: " + getEyeTune(currentChapter).eyeScale;
}
rows.forEach(([k]) => {
document.getElementById("cs_" + k).addEventListener("input", (e) => {
const val = parseFloat(e.target.value);
if (k === "rotY") getModelTune(currentChapter).rotY = val;
else if (k === "eyeX" || k === "eyeY" || k === "eyeGap" || k === "eyeScale") getEyeTune(currentChapter)[k] = val;
else if (k === "bgX" || k === "bgY" || k === "bgScale") getBgTune(currentChapter)[k] = val;
else getCamTune(currentChapter)[k] = val;
sync();
});
});
document.getElementById("camReset").addEventListener("click", () => {
cameraTune[currentChapter] = { zoom: 1, panX: 0, panY: 0 };
modelTune[currentChapter] = { rotY: 0 };
bgTune[currentChapter] = { bgX: 0, bgY: 0, bgScale: 1 };
eyeTune[currentChapter] = { eyeX: 0, eyeY: 0, eyeGap: 1, eyeScale: 1 };
sync();
});
window.addEventListener("keydown", (e) => {
if (e.key === "c" || e.key === "C") {
panel.style.display = panel.style.display === "none" ? "block" : "none";
sync();
}
});
setInterval(() => { if (panel.style.display !== "none") sync(); }, 400);
}
buildCameraPanel();

/* ---- Per-model tuning panel (press "P") -------------------------------
   Chapters 7, 8 and 9 are built from several separate GLB files, so a single
   camera control can't fix a model that's sitting in the wrong place. This
   panel lets you pick one model at a time and move / scale / rotate just
   that one. Use the "part" button to cycle through the models in the
   current chapter. */
const partPanel = { activeIndex: 0 };
let partPanelBuilt = false;
function buildPartPanel() {
if (partPanelBuilt) return;
partPanelBuilt = true;
const panel = document.createElement("div");
panel.style.cssText =
"position:fixed;right:16px;bottom:70px;z-index:99999;background:rgba(10,12,18,.93);" +
"border:1px solid rgba(255,255,255,.15);border-radius:12px;padding:14px 16px;" +
"font:12px/1.6 monospace;color:#ffd9ef;width:280px;display:none;backdrop-filter:blur(8px)";
const rows = [["x", -6, 6, 0.02], ["y", -6, 6, 0.02], ["z", -6, 6, 0.02],
["s", 0.1, 4, 0.02], ["rotY", -3.14, 3.14, 0.02]];
let html = "<b>Model placement (press P to hide)</b><br>" +
"<span style='opacity:.7'>Only affects chapters with several models (7, 8, 9).</span><br><br>" +
"<button id='partCycle' style='width:100%;padding:6px;margin-bottom:8px;cursor:pointer'>part: –</button>";
rows.forEach(([k, mn, mx, st]) => {
html += `<label>${k} <span id="pv_${k}">0</span><br>` +
`<input id="ps_${k}" type="range" min="${mn}" max="${mx}" step="${st}" value="0" style="width:100%"></label>`;
});
html += `<br><textarea id="partOut" readonly style="width:100%;height:86px;background:#05070c;color:#ffb8e0;border:1px solid rgba(255,255,255,.15);border-radius:6px;font:11px monospace"></textarea>`;
panel.innerHTML = html;
document.body.appendChild(panel);

function currentRoles() {
const sc = loadedScenes[currentChapter];
if (!sc || !sc.group || !sc.group.userData.parts) return [];
return Object.keys(sc.group.userData.parts);
}
function activeRole() {
const r = currentRoles();
if (!r.length) return null;
if (partPanel.activeIndex >= r.length) partPanel.activeIndex = 0;
return r[partPanel.activeIndex];
}
function sync() {
const role = activeRole();
document.getElementById("partCycle").textContent = "part: " + (role || "– none in this chapter –");
if (!role) { document.getElementById("partOut").value = ""; return; }
const T = getPartRoleTune(currentChapter, role);
rows.forEach(([k]) => {
document.getElementById("ps_" + k).value = T[k] !== undefined ? T[k] : (k === "s" ? 1 : 0);
document.getElementById("pv_" + k).textContent = document.getElementById("ps_" + k).value;
});
const all = partTune[currentChapter] || {};
document.getElementById("partOut").value =
"chapter " + (currentChapter + 1) + ":\n" +
Object.keys(all).map((r2) => {
const v = all[r2];
return r2 + ": { x: " + v.x + ", y: " + v.y + ", z: " + v.z + ", s: " + v.s + ", rotY: " + v.rotY + " },";
}).join("\n");
}
document.getElementById("partCycle").addEventListener("click", () => {
const r = currentRoles();
if (r.length) partPanel.activeIndex = (partPanel.activeIndex + 1) % r.length;
sync();
});
rows.forEach(([k]) => {
document.getElementById("ps_" + k).addEventListener("input", (e) => {
const role = activeRole();
if (!role) return;
getPartRoleTune(currentChapter, role)[k] = parseFloat(e.target.value);
sync();
});
});
window.addEventListener("keydown", (e) => {
if (e.key === "p" || e.key === "P") {
panel.style.display = panel.style.display === "none" ? "block" : "none";
sync();
}
});
setInterval(() => { if (panel.style.display !== "none") sync(); }, 500);
}
buildPartPanel();

function animate() {
requestAnimationFrame(animate);
const t = clock.getElapsedTime();

targetX += (mouseX - targetX) * 0.04;
targetY += (mouseY - targetY) * 0.04;

// ---- CHAPTER TRANSITION: a real 3D camera swoop (orbit + push-in +
// settle back) instead of a flat slide/fade. While active, this fully
// drives the camera and skips the idle-parallax lookAt below; once it
// finishes, control returns to the normal idle camera behavior.
if (transitionActive) {
const elapsed = t - transitionStart;
const half = transitionDuration / 2;

// Swap the content as soon as we cross the midpoint — checked
// independently of the position branches below, so a slow/delayed
// frame that jumps straight past the midpoint (e.g. on a heavily
// loaded device) can't skip the swap entirely.
if (!transitionSwapped && elapsed >= half) {
transitionSwapped = true;
if (pendingChapterIndex !== null) {
currentChapter = pendingChapterIndex;
pendingChapterIndex = null;
renderChapter();
storyInner.style.opacity = "1";
burstSparkles();
flashEl.style.transition = "none";
flashEl.style.opacity = "0.55";
requestAnimationFrame(() => {
flashEl.style.transition = "opacity .6s ease";
flashEl.style.opacity = "0";
});

// Swap which 3D scene is visible and where the camera settles, to
// match the new chapter. If chapter 2's model is still loading in
// the background at this exact moment, this falls back to chapter
// 1's scene — but the reconciliation check below (outside the
// transition block, runs every frame) catches up automatically
// the instant loading finishes, rather than leaving it stuck wrong.
applyChapterVisuals(currentChapter);

}
}

if (elapsed < half) {
const p = easeInOutCubic(elapsed / half);
camera.position.lerpVectors(transitionFromPos, transitionMidPos, p);
} else if (elapsed < transitionDuration) {
const p = easeInOutCubic((elapsed - half) / half);
camera.position.lerpVectors(transitionMidPos, baseCamPos, p);
} else {
camera.position.copy(baseCamPos);
transitionActive = false;
transitionSwapped = false; // reset for the next transition
}
camera.lookAt(lookTarget);
} else {
// Apply live camera tuning (press C) on top of the chapter's framing.
const tunedPos = baseCamPos.clone();
const tunedLook = lookTarget.clone();
applyCameraTune(tunedPos, tunedLook, currentChapter);
camera.position.copy(tunedPos);
camera.position.y += Math.sin(t * 0.25) * 0.02;
camera.lookAt(
tunedLook.x + targetX * 0.08,
tunedLook.y + targetY * -0.04,
tunedLook.z
);
}

// Self-healing check: if the user is sitting on chapter 2 but its model
// was still loading at the moment the transition swapped content, this
// catches up automatically the instant loading finishes — cheap no-op
// every other frame since applyChapterVisuals() bails out immediately
// when nothing has changed.
applyChapterVisuals(currentChapter);

// Background photo: slow ambient zoom (Ken Burns-style) plus a touch of
// parallax drift with the mouse, so it doesn't sit as a static flat image.
const bgZoom = 1 + Math.sin(t * 0.06) * 0.035;
const B0 = getBgTune(0), B1 = getBgTune(1);
// Cover the viewport from actual camera/plane geometry (with a small
// margin) instead of a flat guessed multiplier, so panning it around
// with bgX/bgY never exposes an edge of the photo.
const office0Cover = coverScaleForPlane(officeBgPlane.position.z, bgPlaneWidth, bgPlaneHeight);
const office0Scale = bgZoom * B0.bgScale * office0Cover;
officeBgPlane.scale.set(office0Scale, office0Scale, 1);
officeBgPlane.position.x = 1.6 + B0.bgX + targetX * 0.15;
officeBgPlane.position.y = 2.0 + B0.bgY + targetY * -0.08;
scrimPlane.position.x = officeBgPlane.position.x;
scrimPlane.position.y = officeBgPlane.position.y;

const chapter2Cover = coverScaleForPlane(chapter2BgPlane.position.z, bgPlaneWidth, bgPlaneHeight);
const chapter2Scale = bgZoom * B1.bgScale * chapter2Cover;
chapter2BgPlane.scale.set(chapter2Scale, chapter2Scale, 1);
scrim2Plane.scale.set(chapter2Scale, chapter2Scale, 1);
chapter2BgPlane.position.x = 0 + B1.bgX + targetX * 0.12;
chapter2BgPlane.position.y = 2.0 + B1.bgY + targetY * -0.06;
scrim2Plane.position.x = chapter2BgPlane.position.x;
scrim2Plane.position.y = chapter2BgPlane.position.y;

// Per-frame motion + background parallax for chapters 3-5.
// Weather effects belong to specific chapters only.
const activeCfg = lastAppliedExtra !== null ? chapterScenes[lastAppliedExtra] : null;
updateRain(t, 1/60, !!(activeCfg && activeCfg.rain));
updateThunder(t, !!(activeCfg && activeCfg.thunder));

if (lastAppliedExtra !== null) {
animateExtraChapter(lastAppliedExtra, t);
updateChapterBlink(lastAppliedExtra, t, true);
const scV = loadedScenes[lastAppliedExtra];
if (scV && scV.videoPlane) scV.videoPlane.position.x = targetX * 0.10;
const sc = loadedScenes[lastAppliedExtra];
if (sc) {
const Bx = getBgTune(lastAppliedExtra);
const cfgX = chapterScenes[lastAppliedExtra];

if (cfgX && cfgX.mode === "split") {
// Chapter 09 is a hard 60/40 screen split: video across the top 60%,
// still photo across the bottom 40%. Both bands are sized from the
// camera each frame so they fill the width exactly at any window size.
const dist = Math.abs(baseCamPos.z - sc.bgPlane.position.z) || 12;
const vh = 2 * Math.tan((camera.fov * Math.PI / 180) / 2) * dist;
const vw = vh * camera.aspect;
const topH = vh * 0.60, botH = vh * 0.40;
const centreY = lookTarget.y;

if (sc.videoPlane) {
const gH = bgPlaneHeight * 0.52;
sc.videoPlane.scale.set((vw / bgPlaneWidth) * 1.02, (topH / gH) * 1.02, 1);
sc.videoPlane.position.y = centreY + vh * 0.5 - topH * 0.5;
sc.videoPlane.position.x = targetX * 0.04;
}
sc.bgPlane.scale.set((vw / bgPlaneWidth) * 1.02, (botH / bgPlaneHeight) * 1.02, 1);
sc.bgPlane.position.y = centreY - vh * 0.5 + botH * 0.5;
sc.scrim.scale.copy(sc.bgPlane.scale);
sc.scrim.position.y = sc.bgPlane.position.y;
sc.bgPlane.position.x = targetX * 0.04;
sc.scrim.position.x = sc.bgPlane.position.x;

// Drop each model into the middle of its own band.
const P = sc.group.userData.parts || {};
if (P.bike) P.bike.position.y = sc.videoPlane
? (centreY + vh * 0.5 - topH * 0.5) - sc.group.position.y - topH * 0.12
: P.bike.position.y;
if (P.couple) {
P.couple.position.y =
(centreY - vh * 0.5 + botH * 0.5) - sc.group.position.y - botH * 0.10 + 0.9;
// The shared scene lights are aimed at the whole group, which left the
// lower band in shadow. This follows the couple so they stay lit.
if (!splitFillLight) {
splitFillLight = new THREE.PointLight(0xffd9b5, 0, 10, 2);
scene.add(splitFillLight);
}
const wp = new THREE.Vector3();
P.couple.getWorldPosition(wp);
splitFillLight.position.set(wp.x + 0.4, wp.y + 0.9, wp.z + 2.4);
splitFillLight.intensity = 7.5;
}
} else {
// Every other chapter: one photo covering the whole viewport.
const cover = coverScaleForPlane(sc.bgPlane.position.z, bgPlaneWidth, bgPlaneHeight);
const bs = bgZoom * Bx.bgScale * cover;
sc.bgPlane.scale.set(bs, bs, 1);
sc.scrim.scale.set(bs, bs, 1);
sc.bgPlane.position.x = Bx.bgX + targetX * 0.12;
sc.bgPlane.position.y = 2.0 + Bx.bgY + targetY * -0.06;
sc.scrim.position.x = sc.bgPlane.position.x;
sc.scrim.position.y = sc.bgPlane.position.y;
}
}
}

if (character) {
// gentle idle breathing + sway so the scene doesn't feel frozen —
// this stands in for a skeletal typing loop, since the source GLB
// has no rig/bones/animation baked in (see README for how to add one).
// Sway is layered on TOP of the fixed side-angle pose, not a replacement
// for it.
if (character.userData.baseScaleY === undefined) {
character.userData.baseScaleY = character.scale.y;
}
character.rotation.y = characterBaseRotationY + getModelTune(0).rotY + Math.sin(t * 0.35) * 0.035;
const breathe = 1 + Math.sin(t * 1.1) * 0.006;
character.scale.y = character.userData.baseScaleY * breathe;
}

// ---- Chapter 2: idle sway + turn-taking "speaking vs listening" body
// language. Whoever's "turn" it is gets a larger sway/nod; the other
// person settles into a quieter, more still idle pose — the closest
// approximation of conversational body language achievable without a
// rig (real gesture/finger animation isn't possible on this mesh).
if (chapter2PersonA && chapter2PersonA.visible) {
if (t > turnStart + turnDuration) {
turnStart = t;
speakerTurn = 1 - speakerTurn;
}
const speakingA = speakerTurn === 0;
const speakingB = speakerTurn === 1;

// Store each person's rest position once, so lean/shift offsets below
// are always relative to where they actually stand.
[chapter2PersonA, chapter2PersonB].forEach((p) => {
if (p.userData.baseX === undefined) {
p.userData.baseX = p.position.x;
p.userData.baseY = p.position.y;
p.userData.baseZ = p.position.z;
}
});

// Keep them standing solidly in place. The earlier movement amplitude made
// them feel like floating statues drifting around the frame. A grounded,
// nearly static pose reads as more realistic for this still-life moment.
function animatePerson(p, speaking, phase, dirSign) {
const amp = speaking ? 0.15 : 0.05;

p.rotation.y = p.userData.baseRotY + getModelTune(1).rotY
+ Math.sin(t * 0.7 + phase) * 0.03 * amp
+ (speaking ? 0.01 * dirSign : 0);

p.rotation.x = Math.sin(t * 0.5 + phase) * 0.006;
p.rotation.z = Math.sin(t * 0.8 + phase) * 0.01 * amp;

p.position.x = p.userData.baseX;
p.position.y = p.userData.baseY + (p.userData.floorOffsetY || 0);
p.position.z = p.userData.baseZ;
}

animatePerson(chapter2PersonA, speakingA, 0, -1);
animatePerson(chapter2PersonB, speakingB, 1.6, 1);

// Face: blink + speaking mouth (sprite-based, see updateFaceSprites).
updateFaceSprites(t, chapter2GirlIsB ? speakingB : speakingA, true);
}

// ---- Blink cycle: quick close-open pulse on a random-ish interval ----
if (eyelidLeft && eyelidRight) {
if (t > nextBlinkAt && blinkStart === null) {
blinkStart = t;
}
if (blinkStart !== null) {
const bt = t - blinkStart;
const half = blinkDuration / 2;
let s;
if (bt < half) {
s = bt / half; // closing
} else if (bt < blinkDuration) {
s = 1 - (bt - half) / half; // opening
} else {
s = 0;
blinkStart = null;
nextBlinkAt = t + 2.4 + Math.random() * 3.6;
}
const clamped = Math.max(0.001, s);
eyelidLeft.scale.y = clamped;
eyelidRight.scale.y = clamped;
}
}

// ---- Typing bob: the separated hand/keyboard region gets a pronounced,
// staccato vertical motion to read clearly as fingers tapping keys rather
// than a gentle bob. Combines quick asymmetric "key press" pulses at
// slightly offset frequencies so it doesn't look like a single mechanical
// wave.
if (handsMeshRef) {
if (handsMeshRef.userData.baseY === undefined) {
handsMeshRef.userData.baseY = handsMeshRef.position.y;
handsMeshRef.userData.baseRotX = handsMeshRef.rotation.x;
}
const tap1 = Math.pow(Math.max(0, Math.sin(t * 7.3)), 3);
const tap2 = Math.pow(Math.max(0, Math.sin(t * 11.1 + 2.1)), 3);
const tap3 = Math.pow(Math.max(0, Math.sin(t * 5.4 + 4.4)), 4);
handsMeshRef.position.y =
handsMeshRef.userData.baseY - (tap1 * 0.02 + tap2 * 0.014 + tap3 * 0.016);
handsMeshRef.rotation.x =
handsMeshRef.userData.baseRotX - (tap1 + tap2 * 0.7) * 0.05;
}

screenGlow.intensity = 3 + Math.sin(t * 6) * 0.4;
const posAttr = particles.geometry.attributes.position;
for (let i = 0; i < particleCount; i++) {
posAttr.array[i * 3 + 1] += 0.0012;
if (posAttr.array[i * 3 + 1] > 4.5) posAttr.array[i * 3 + 1] = 0;
}
posAttr.needsUpdate = true;

updateSparkles(Math.min(0.05, clock.getDelta ? 1/60 : 1/60));
renderer.render(scene, camera);
}
animate();

window.addEventListener("resize", () => {
camera.aspect = window.innerWidth / window.innerHeight;
camera.updateProjectionMatrix();
renderer.setSize(window.innerWidth, window.innerHeight);
});

/* =========================================================
6. UI — music toggle
========================================================= */
const musicToggle = document.getElementById("musicToggle");
const musicLabel = document.getElementById("musicLabel");
const bgMusic = document.getElementById("bgMusic");
// Starts true to match the label already shown in the HTML ("Music On").
// Browsers block audio autoplay without a user gesture anyway, so nothing
// actually plays until the first click regardless of this initial value.
let musicOn = true;
musicToggle.setAttribute("aria-pressed", "true");
musicToggle.addEventListener("click", () => {
musicOn = !musicOn;
musicToggle.setAttribute("aria-pressed", String(musicOn));
musicLabel.textContent = musicOn ? "Music On" : "Music Off";
if (musicOn) {
bgMusic.play().catch(() => {
// No audio file supplied yet — fail silently, UI still toggles.
});
} else {
bgMusic.pause();
}
});

/* =========================================================
7. UI — chapters panel
========================================================= */
const chaptersPanel = document.getElementById("chaptersPanel");
const chaptersScrim = document.getElementById("chaptersScrim");
const chaptersList = document.getElementById("chaptersList");
const menuToggle = document.getElementById("menuToggle");
const closeMenu = document.getElementById("closeMenu");

function buildChaptersList() {
chaptersList.innerHTML = "";
chapters.forEach((ch, i) => {
const li = document.createElement("li");
const btn = document.createElement("button");
btn.innerHTML = `<span class="num">${String(i + 1).padStart(2, "0")}</span>${ch.eyebrow.replace(/^\d+\.\s*/, "")}`;
if (i === currentChapter) btn.classList.add("active");
btn.addEventListener("click", () => {
goToChapter(i);
closePanel();
});
li.appendChild(btn);
chaptersList.appendChild(li);
});
}
function openPanel() {
chaptersPanel.classList.add("open");
chaptersScrim.classList.add("open");
menuToggle.setAttribute("aria-expanded", "true");
}
function closePanel() {
chaptersPanel.classList.remove("open");
chaptersScrim.classList.remove("open");
menuToggle.setAttribute("aria-expanded", "false");
}
menuToggle.addEventListener("click", () => {
buildChaptersList();
openPanel();
});
closeMenu.addEventListener("click", closePanel);
chaptersScrim.addEventListener("click", closePanel);

/* =========================================================
8. Chapter navigation + text re-reveal animation
========================================================= */
const eyebrowEl = document.getElementById("chapterEyebrow");
const headlineEl = document.getElementById("chapterHeadline");
const bodyEl = document.getElementById("chapterBody");
const ctaEl = document.getElementById("chapterCta");
const ctaLabelEl = document.getElementById("ctaLabel");
const storyInner = document.getElementById("storyInner");
const pageCurrent = document.getElementById("pageCurrent");
const chapterNav = document.getElementById("chapterNav");

function buildDots() {
chapterNav.innerHTML = "";
chapters.forEach((_, i) => {
const b = document.createElement("button");
if (i === currentChapter) b.classList.add("active");
b.setAttribute("aria-label", `Go to chapter ${i + 1}`);
b.addEventListener("click", () => goToChapter(i));
chapterNav.appendChild(b);
});
}

function renderChapter() {
const ch = chapters[currentChapter];
storyInner.classList.toggle("chapter-11", currentChapter === 10);
if (document.body.classList.contains("no-webgl") && sceneFallback) {
const fallbackBackgrounds = [
"office-bg.jpg", "office-bg-2.jpg", "office-bg-3.jpg", "office-bg-4.jpg", "office-bg-5.jpg",
"bg-6.jpg", "bg-7.jpg", "bg-8.jpg", "bg-9b.jpg", "bg-10.jpg", "bg-11.jpg", "bg-13.jpg", "bg-14.jpg", "bg-14.jpg",
];
const background = fallbackBackgrounds[currentChapter] || "office-bg.jpg";
sceneFallback.style.backgroundImage = `linear-gradient(90deg, rgba(4,5,8,.96) 0%, rgba(4,5,8,.72) 36%, rgba(4,5,8,.18) 72%), url("assets/backgrounds/${background}")`;
}
eyebrowEl.textContent = ch.eyebrow;
headlineEl.innerHTML = ch.headline;
bodyEl.textContent = ch.body;
ctaLabelEl.textContent = ch.cta;
ctaEl.disabled = ch.locked;
ctaEl.style.opacity = ch.locked ? 0.5 : 1;
ctaEl.style.cursor = ch.locked ? "not-allowed" : "pointer";
pageCurrent.textContent = String(currentChapter + 1).padStart(2, "0");

[eyebrowEl, headlineEl, bodyEl, ctaEl].forEach((el, i) => {
el.style.animation = "none";
// force reflow so the animation restarts
void el.offsetWidth;
el.style.animation = "";
});

buildDots();
}

/* ---- 3D chapter transition: triggers the camera swoop declared above
(state variables live earlier in the file since animate() references
them from its first frame). */
function startChapterTransition(newIndex) {
if (transitionActive) return;
pendingChapterIndex = newIndex;
transitionActive = true;
transitionStart = clock.getElapsedTime();
transitionDirSign *= -1;

transitionFromPos.copy(camera.position);

// Orbit the camera around the look target and push it closer for the
// "swoop" midpoint, instead of just fading — this is the actual 3D motion.
const offset = transitionFromPos.clone().sub(lookTarget);
const angle = THREE.MathUtils.degToRad(34 * transitionDirSign);
const rotated = offset.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
rotated.multiplyScalar(0.62); // push in closer at the peak of the swoop
rotated.y += offset.y * 0.25; // slight rise for a less flat arc
transitionMidPos.copy(lookTarget).add(rotated);

storyInner.style.transition = "opacity .3s ease";
storyInner.style.opacity = "0";
}

function goToChapter(index) {
if (index < 0 || index >= chapters.length || index === currentChapter) return;
startChapterTransition(index);
}

document.getElementById("prevChapter").addEventListener("click", () => goToChapter(currentChapter - 1));
document.getElementById("nextChapter").addEventListener("click", () => goToChapter(currentChapter + 1));
ctaEl.addEventListener("click", () => {
if (!ctaEl.disabled) goToChapter(currentChapter + 1);
});

document.getElementById("pageTotal").textContent = String(chapters.length).padStart(2, "0");
buildDots();

/* =========================================================
9. Terminal easter egg
========================================================= */
const terminalBadge = document.getElementById("terminalBadge");
const terminalPanel = document.getElementById("terminalPanel");
const terminalBody = document.getElementById("terminalBody");
const terminalLines = [
"$ whoami",
"junior_dev",
"$ status laptop.exe",
"fixing... 47%",
"$ echo $NEXT_CHAPTER",
"'the office assignment that changed everything'",
];
let terminalOpen = false;
let typedOnce = false;

function typeTerminal() {
terminalBody.innerHTML = "";
let lineIndex = 0;
function typeLine() {
if (lineIndex >= terminalLines.length) {
terminalBody.innerHTML += `<span class="cursor"></span>`;
return;
}
const line = terminalLines[lineIndex];
const lineEl = document.createElement("div");
terminalBody.appendChild(lineEl);
let charIndex = 0;
const isCommand = line.startsWith("$");
lineEl.style.color = isCommand ? "#8fe6ff" : "#c9d3e0";
function typeChar() {
if (charIndex <= line.length) {
lineEl.textContent = line.slice(0, charIndex);
charIndex++;
setTimeout(typeChar, isCommand ? 28 : 14);
} else {
lineIndex++;
setTimeout(typeLine, 220);
}
}
typeChar();
}
typeLine();
}

terminalBadge.addEventListener("click", () => {
terminalOpen = !terminalOpen;
terminalPanel.classList.toggle("open", terminalOpen);
if (terminalOpen && !typedOnce) {
typedOnce = true;
typeTerminal();
}
});
