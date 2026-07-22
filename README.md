# xrift-zipline

Ray-aim **zip-to-target navigation** for [react-three-fiber](https://github.com/pmndrs/react-three-fiber) / WebXR worlds — point at a target (**controller ray in VR**, crosshair on flat), tap or pull the trigger, and **glide** there.

Built for zero-gravity spaces where you can't reach things by walking: point at any target at any height and zip to it. Movement is delegated to XRift's `useTeleport`, so it rides the host's player controller.

## Install

```sh
npm i xrift-zipline
```

Peer deps: `react`, `three`, `@react-three/fiber`, `@xrift/world-components`.

## Usage

```tsx
import { Zipline } from 'xrift-zipline'
import { Vector3 } from 'three'

// world-space positions you can zip to
const targets = stars.map((s) => new Vector3(s.x, s.y, s.z))

function World() {
  return (
    <>
      {/* ...your scene... */}
      <Zipline
        targets={targets}
        onArrive={(i) => console.log('arrived at', targets[i])}
      />
    </>
  )
}
```

The component renders a small billboarded reticle on the target nearest your aim ray and glides you to `standoff` metres in front of it.

- **Flat (desktop/mobile)**: aim = camera forward (crosshair); fire = **tap/click** (distinguished from a look-drag).
- **VR**: aim = the **controller pointer ray** (`targetRaySpace`, following whichever hand last pulled the trigger); fire = **trigger** (`selectstart`). A **beam line** is drawn from the controller to the aimed target. Falls back to camera aim if no controller pose is available.

### Driving the trigger yourself (VR controller, custom button)

Set `tapToZip={false}` and call the imperative handle from your own trigger (e.g. a WebXR `select` event or a controller-ray hit):

```tsx
const zip = useRef<ZiplineHandle>(null)
// on trigger:
zip.current?.zipToAim()

<Zipline ref={zip} targets={targets} tapToZip={false} />
```

## Props

| prop | default | meaning |
|---|---|---|
| `targets` | — | world-space `Vector3[]` you can zip to |
| `onPick(i)` | — | fires when a glide starts (target chosen) |
| `onArrive(i)` | — | fires when a glide completes |
| `standoff` | `3.2` | stop this many metres before the target |
| `duration` | `1.1` | glide time in seconds (smoothstep) |
| `aimConeDeg` | `13` | half-angle of the aim cone (far-target fallback) |
| `targetRadius` | `0.9` | physical radius (m); ray hits within it pick the **nearest** target (occlusion) before falling back to the angle cone |
| `tapToZip` | `true` | use the built-in tap/click/VR-trigger firing |
| `aimHand` | `'right'` | initial VR aim hand; follows whichever hand last pulled the trigger |
| `eyeHeight` | `1.44` | camera height above the teleported feet position; arrival is lowered by this so the target meets your eye line |
| `reticleColor` | `'#43e0ff'` | reticle ring / beam colour |
| `reticle` | `true` | render the built-in reticle |
| `rayLine` | `true` | render the VR beam line (controller → aimed target; 24 m forward when nothing is aimed; never drawn on flat) |
| `enabled` | `true` | master on/off |

`ZiplineHandle` (via `ref`): `getAimIndex()`, `zipToAim()`.

## Notes

- Movement uses `useTeleport` from `@xrift/world-components`. In environments without a host teleport implementation (e.g. the default DevEnvironment), teleport is a no-op — **verify on the real host**.
- In zero-gravity worlds, remember the host may respawn a player below an absolute Y threshold; keep your reachable targets above it.

MIT © toming
