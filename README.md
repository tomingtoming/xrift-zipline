# xrift-zipline

Crosshair-aim **zip-to-target navigation** for [react-three-fiber](https://github.com/pmndrs/react-three-fiber) / WebXR worlds — look at a target, tap (or pull the trigger), and **glide** there.

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

The component renders a small billboarded reticle on the target nearest your crosshair and, on a **tap/click** (distinguished from a look-drag), glides you to `standoff` metres in front of it.

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
| `aimConeDeg` | `13` | half-angle of the crosshair aim cone |
| `reticleColor` | `'#43e0ff'` | reticle ring colour |
| `reticle` | `true` | render the built-in reticle |
| `tapToZip` | `true` | use the built-in tap/click trigger |
| `enabled` | `true` | master on/off |

`ZiplineHandle` (via `ref`): `getAimIndex()`, `zipToAim()`.

## Notes

- Movement uses `useTeleport` from `@xrift/world-components`. In environments without a host teleport implementation (e.g. the default DevEnvironment), teleport is a no-op — **verify on the real host**.
- In zero-gravity worlds, remember the host may respawn a player below an absolute Y threshold; keep your reachable targets above it.

MIT © toming
