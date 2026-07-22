import {
  forwardRef,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { TeleportContext } from '@xrift/world-components'
import { DoubleSide, Mesh, Vector3 } from 'three'

/**
 * Zipline — クロスヘア（カメラ前方）に最も近い対象を選び、タップ/クリック（または外部トリガー）で
 * その対象の手前まで滑走する WebXR / react-three-fiber 用ナビゲーション。
 *
 * 無重力ワールドで「見ている物へ素早く行く」を、水平移動に依存せず解く（どの高さの対象にも届く）。
 * 移動は XRift の `useTeleport`（`TeleportContext`）に委譲＝ホストのプレイヤー制御に乗る。
 * ホスト実装が無い環境（例: DevEnvironment のデフォルト）では teleport が no-op になり得るので、
 * 実挙動は実ホストで確認する。
 */
export interface ZiplineHandle {
  /** 現在照準に捉えている対象の index（無ければ -1） */
  getAimIndex: () => number
  /** 照準中の対象へ滑走を開始する（VR のトリガー等、自前トリガーから呼ぶ）。開始できたら true */
  zipToAim: () => boolean
}

export interface ZiplineProps {
  /** 飛べる対象のワールド座標。teleport もこの座標系で行う */
  targets: Vector3[]
  /** 滑走を開始した瞬間（対象を選んだ瞬間）に対象 index を返す */
  onPick?: (index: number) => void
  /** 滑走が完了した瞬間に対象 index を返す */
  onArrive?: (index: number) => void
  /** 対象の手前で止まる距離(m)。既定 3.2 */
  standoff?: number
  /** 滑走の秒数。既定 1.1 */
  duration?: number
  /** クロスヘアの許容コーン半角(度)。既定 13（半径ヒットが無いときの遠方選択用） */
  aimConeDeg?: number
  /**
   * 対象の実体半径(m)。レイがこの半径内を通る対象は「当たり」とみなし、**最寄りを優先**する
   * （手前の物を貫通して奥を指すのを防ぐ＝遮蔽）。当たりが無ければ `aimConeDeg` の角度選択に落ちる。
   * 対象の見た目サイズに合わせる。既定 0.9
   */
  targetRadius?: number
  /** 照準リングの色。既定 '#43e0ff' */
  reticleColor?: string
  /** 照準リングを描くか。既定 true（自前の照準表現を使うなら false） */
  reticle?: boolean
  /** 内蔵のタップ/クリック発射を使うか。既定 true（false にして ref.zipToAim を自前トリガーへ） */
  tapToZip?: boolean
  /**
   * 目線の高さ(m)。XRift の `useTeleport` はプレイヤーの**足元**を置き、カメラはそこから
   * この分だけ上にある。対象に**目線が合う**よう着地の足元を下げる補正に使う。既定 1.44
   * （XRift 既定＝PLAYER_HALF_HEIGHT 0.4 + PLAYER_RADIUS 0.4 + CAMERA_Y_OFFSET 0.64）。
   */
  eyeHeight?: number
  /** 全体の有効/無効。既定 true */
  enabled?: boolean
}

export const Zipline = forwardRef<ZiplineHandle, ZiplineProps>(function Zipline(
  {
    targets,
    onPick,
    onArrive,
    standoff = 3.2,
    duration = 1.1,
    aimConeDeg = 13,
    targetRadius = 0.9,
    reticleColor = '#43e0ff',
    reticle = true,
    tapToZip = true,
    eyeHeight = 1.44,
    enabled = true,
  },
  ref,
) {
  const { camera } = useThree()
  const teleportCtx = useContext(TeleportContext)
  const teleport = teleportCtx?.teleport
  const reticleRef = useRef<Mesh>(null)
  const aim = useRef(-1)
  const glide = useRef<{ start: Vector3; end: Vector3; index: number; t: number } | null>(null)

  const camPos = useMemo(() => new Vector3(), [])
  const camDir = useMemo(() => new Vector3(), [])
  const tmp = useMemo(() => new Vector3(), [])
  const aimCos = useMemo(() => Math.cos((aimConeDeg * Math.PI) / 180), [aimConeDeg])

  // 発射: 照準中の対象へ滑走を開始（最新プロップを閉じ込めるため ref 経由で公開）
  const doZip = (): boolean => {
    const i = aim.current
    if (!enabled || i < 0 || glide.current || !teleport) return false
    const eye = camera.getWorldPosition(new Vector3())
    const dir = targets[i].clone().sub(eye).normalize()
    // teleport は足元を置く＝カメラは eyeHeight 上。目線が対象を向くよう足元を eyeHeight 下げる
    // （start/end とも足元空間へ揃える＝発射時の縦跳ねも消える）
    const start = eye.clone()
    start.y -= eyeHeight
    const end = targets[i].clone().sub(dir.multiplyScalar(standoff))
    end.y -= eyeHeight
    glide.current = { start, end, index: i, t: 0 }
    onPick?.(i)
    return true
  }
  const zipRef = useRef(doZip)
  zipRef.current = doZip

  useImperativeHandle(
    ref,
    () => ({ getAimIndex: () => aim.current, zipToAim: () => zipRef.current() }),
    [],
  )

  // 内蔵トリガー: タップ（短時間・小移動＝視線ドラッグと区別）。デスクトップのクリックも同じ
  useEffect(() => {
    if (!tapToZip) return
    let dx = 0
    let dy = 0
    let downAt = 0
    let moved = false
    let down = false
    const onDown = (e: PointerEvent) => {
      down = true
      dx = e.clientX
      dy = e.clientY
      downAt = performance.now()
      moved = false
    }
    const onMove = (e: PointerEvent) => {
      if (down && Math.hypot(e.clientX - dx, e.clientY - dy) > 12) moved = true
    }
    const onUp = () => {
      if (down && !moved && performance.now() - downAt < 300) zipRef.current()
      down = false
    }
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [tapToZip])

  useFrame((_s, delta) => {
    if (!enabled) return
    // 滑走駆動（毎フレーム teleport で end へ寄せる）
    if (glide.current && teleport) {
      const g = glide.current
      g.t = Math.min(1, g.t + delta / duration)
      const e = g.t * g.t * (3 - 2 * g.t) // smoothstep
      tmp.copy(g.start).lerp(g.end, e)
      teleport({ position: [tmp.x, tmp.y, tmp.z] })
      if (g.t >= 1) {
        const idx = g.index
        glide.current = null
        onArrive?.(idx)
      }
    }
    // 照準: レイが実体半径を貫く対象は「最寄り」を優先（遮蔽＝手前の物を貫通しない）。
    // 半径内に一つも無ければ角度コーンで遠方の対象を選ぶ（点として最も中央の物）。
    camera.getWorldPosition(camPos)
    camera.getWorldDirection(camDir)
    let hitBest = -1
    let hitNearest = Infinity // 半径内ヒットのうち最寄り(along最小)
    let angBest = -1
    let angBestDot = aimCos
    for (let i = 0; i < targets.length; i++) {
      tmp.copy(targets[i]).sub(camPos)
      const along = tmp.dot(camDir) // レイ方向の符号付き距離
      if (along <= 0.5) continue // 背後/近すぎ
      const len2 = tmp.lengthSq()
      const perp = Math.sqrt(Math.max(0, len2 - along * along)) // レイと対象点の垂直距離
      if (perp < targetRadius && along < hitNearest) {
        hitNearest = along
        hitBest = i
      }
      const d = along / Math.sqrt(len2) // = cos(視線との角度)
      if (d > angBestDot) {
        angBestDot = d
        angBest = i
      }
    }
    const best = hitBest >= 0 ? hitBest : angBest
    aim.current = best
    const r = reticleRef.current
    if (r) {
      if (best >= 0) {
        r.visible = true
        r.position.copy(targets[best])
        r.quaternion.copy(camera.quaternion)
        r.scale.setScalar(Math.max(0.4, camPos.distanceTo(targets[best]) * 0.06))
      } else {
        r.visible = false
      }
    }
  })

  if (!reticle) return null
  return (
    <mesh ref={reticleRef} visible={false} frustumCulled={false}>
      <ringGeometry args={[0.6, 0.78, 32]} />
      <meshBasicMaterial
        color={reticleColor}
        transparent
        opacity={0.85}
        side={DoubleSide}
        depthTest={false}
      />
    </mesh>
  )
})
