# Just Another Workday — animated story site

A single-page animated 3D story site built with Three.js, matching your
reference image: a stylised character at a desk, moody dark/cyan/pink
lighting, floating particles, and a story UI (chapter text, page counter,
music toggle, chapters menu, terminal easter egg).

## IMPORTANT — you must run this through a local server

Double-clicking `index.html` and opening it directly in your browser
(a `file://` URL) will NOT work. Modern browsers block ES module imports
and GLB loading over `file://` for security reasons. You'll just see a
blank black screen with a spinner that never finishes.

You need a local web server. Pick whichever you have installed:

### Option A — Python (most common, usually pre-installed on Mac/Linux)
1. Open a terminal in this folder (the one containing `index.html`)
2. Run:
   ```
   python3 -m http.server 8000
   ```
   (On Windows, if `python3` doesn't work, try `python`)
3. Open your browser to: **http://localhost:8000**

### Option B — Node.js
1. Open a terminal in this folder
2. Run:
   ```
   npx serve .
   ```
3. Open the URL it prints (usually http://localhost:3000)

### Option C — VS Code
1. Install the "Live Server" extension
2. Right-click `index.html` → "Open with Live Server"

## What's in this folder

```
index.html              — page structure + UI markup
style.css               — all visual styling + CSS animations
script.js               — Three.js scene, camera, lighting, chapter logic
assets/models/character.glb   — your 3D model, optimized (86MB → 1.3MB)
assets/audio/            — put a music file here (see the .txt inside)
vendor/three/            — Three.js library, bundled locally (no internet
                            needed to run this — everything loads from disk
                            except Google Fonts, which is optional polish)
```

## What's real vs. what's a placeholder

**Matches your reference image:**
- Character, laptop with Capgemini branding, plant, desk composition
- Character sits at a turned 3/4 angle (not dead-on) to match the reference's more dynamic pose
- Background is now the actual office photo you uploaded
  (`assets/backgrounds/office-bg.jpg`), placed as a 3D background plane
  behind the character rather than an abstract recreation. It has a slow
  ambient zoom (Ken Burns-style) and drifts slightly with mouse movement
  for a sense of depth. A left-side gradient overlay (drawn in front of
  the photo) keeps it from competing with the text panel's contrast.
  **One thing worth double-checking on your end:** this photo came from a
  stock site (StockCake) — worth confirming its license covers how you
  plan to use this site (personal portfolio vs. something public-facing
  or commercial) before shipping it anywhere beyond your own testing.
- Top bar (music toggle, page counter, menu), chapter text with
  entrance animation, pink gradient CTA button
- Camera has subtle mouse-parallax and idle drift for a "living" feel
- Textures now preserve the source file's full 4096px resolution (up from
  1024px in the first pass) for visibly sharper hair, skin, and the
  Capgemini logo on the laptop lid

**Motion added since the first pass:**
- **Blinking**: two small skin-toned patches are positioned exactly on the
  character's pupils (found via raycasting onto the actual face surface,
  not guessed) and periodically scale up/down to fake a blink, since the
  source mesh has no eyelid geometry or blend shapes to animate directly.
- **Typing hands**: the source GLB is one solid, unrigged mesh with no
  skeleton — there's no way to move individual fingers. Instead, the
  hand region is found by raycasting onto the actual hand surface (not
  guessed), then every triangle nearby is checked against the real
  texture color at that spot and kept only if it's a skin tone — this
  is what keeps the keyboard and laptop screen from being pulled in by
  mistake (an earlier version used a plain bounding box, which
  occasionally grabbed laptop-screen triangles and made the screen
  visibly crack/shake — fixed by adding the color check). The isolated
  hand region gets a visible, quick vertical bob and slight tilt to
  suggest fingers moving on the keys. It won't show individual finger
  motion, but it reads as typing at normal viewing size, and the
  laptop itself stays completely still.

**Still placeholder / needs your input:**
- **Chapters 2–12**: only chapter 1 has real content (from your image).
  Chapters 2–3 have sample placeholder text; 4–12 are locked "coming
  soon" stubs. Edit the `chapters` array at the top of `script.js` to
  add your real story content — the array format is documented inline.
- **Music**: the toggle button works, but no audio file is included
  (I can't source copyrighted music for you). Drop an MP3 at
  `assets/audio/theme.mp3` and it'll play on toggle.

## Adding a real typing animation later

If you get the character rigged (Blender + Mixamo, or a Blender artist):
1. Export the rigged, animated version as a new `.glb`
2. Replace `assets/models/character.glb` with it
3. In `script.js`, find the `gltfLoader.load(...)` callback — after
   the model loads, add:
   ```js
   const mixer = new THREE.AnimationMixer(character);
   const action = mixer.clipAction(gltf.animations[0]); // your typing clip
   action.play();
   ```
   and in the `animate()` render loop, add:
   ```js
   mixer.update(clock.getDelta());
   ```
   (Three.js is already imported and set up for this — just wire in
   the mixer once you have real animation clips.)

## Editing chapters

Open `script.js` and find the `chapters` array near the top. Each
chapter is:
```js
{
  eyebrow: "01. Our story begins",
  headline: "Just another<br/>workday&hellip;",
  body: "I thought I was just going to fix a laptop problem.",
  cta: "Go to SCB Office",
  locked: false,
}
```
Edit the text, add/remove chapters, or set `locked: true` to show a
chapter as "coming soon" with a disabled button.

Chapter 2 now has real content matching the "First meeting" reference
image you sent (eyebrow, headline, body, and a "Next" button). The 3D
*scene* for chapter 2 is still the same boy character and office
background as chapter 1, though — recreating the two-person scene from
that image (a second character) would need an actual 3D model of that
character, which I don't have. If you get one (or have one made), I can
wire it in the same way the current character is loaded.

## Chapter transitions (3D camera swoop, not a slide)

Moving between chapters no longer just fades text — the camera does an
actual 3D move: it orbits around the character and pushes in closer,
swaps the text content at the peak of that motion, then eases back out
to the normal framing. Look for `startChapterTransition()` and the
"CHAPTER TRANSITION" block inside `animate()` in `script.js` if you want
to tune it:

- `transitionDuration` — total time for the swoop, in seconds.
- The `34` in `THREE.MathUtils.degToRad(34 * transitionDirSign)` —
  how far the camera orbits during the swoop. Bigger number = more
  dramatic spin.
- The `0.62` multiplier — how far the camera pushes in at the peak.
  Lower = pushes in closer/more dramatic.

It alternates orbiting left/right each time so consecutive transitions
don't feel identical.

**A performance note:** while testing this, I saw the transition take
as long as 20+ seconds to complete in my own sandbox testing
environment, which uses software (CPU-only) rendering — a deliberately
worst-case setup. On a real device with actual GPU acceleration
(any normal laptop or phone), this should complete close to the
intended ~1.15 seconds. If it feels slow on your actual machine too,
that's worth telling me — it would mean something in the scene needs
lightening, not just a testing artifact.

## Performance note

Your original GLB was 86MB with ~2 million triangles — far too heavy
for a web page. After a few optimization passes (the last one loosening
simplification and bumping texture size back up for sharper detail,
per your feedback), it's settled at 2.8MB / ~300k triangles using
Meshopt compression and WebP textures at 2048px. That's still light
enough to load in a couple of seconds on a normal connection and a
real GPU. (My own testing environment uses software/CPU rendering,
which is artificially much slower — expect your real results to be
noticeably faster.)

If it ever feels sluggish on lower-end devices, lower the
`simplify-ratio` or `texture-size` using `gltf-transform optimize`
(the same tool used to shrink yours — the exact command is in the
project's history if you need to rebuild it), or reduce the shadow
map size in `script.js` (`keyLight.shadow.mapSize.set(1024, 1024)` →
`512, 512`).

## About the blink and hand-typing effects

Both are geometry/overlay tricks layered on top of a static mesh, not
real animation clips — worth understanding if you plan to extend them:

- The eyelid patches are positioned by raycasting onto the actual face
  surface at load time, so they should stay correctly placed even if
  you swap in a different (but similarly-proportioned) character model.
  If you swap models and the blink looks off, the calibration constants
  near "Fake blink" in `script.js` (`eyeWorldY`, `eyeOffsetMag`) may need
  adjusting for the new proportions.
- The typing hands work by raycasting to find the hand surface, then
  keeping only nearby triangles whose texture color is skin-toned (see
  `isSkinTone` and "Split the hands" in `script.js`). If you swap in a
  different character model, `handAnchorY` and the `isSkinTone` color
  thresholds may need retuning for that model's proportions and skin tone.
