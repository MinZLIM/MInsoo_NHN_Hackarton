import {
  AmbientLight,
  Box3,
  DirectionalLight,
  Group,
  HemisphereLight,
  PerspectiveCamera,
  PointLight,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { dollLook, modelLoadingManager, modelUrlFor } from './dollModels'
import { buildProceduralDoll } from './proceduralDolls'
import { prepareDollObject } from './dollModel'
import { buildDollDress } from './dollDress'
import type { DollSize } from '@/types/api'

/**
 * 도감 썸네일.
 *
 * 목록에 이모지를 쓰면 상세에서 보이는 3D 인형과 딴판이라, 같은 파이프라인으로
 * 인형을 실제로 한 번 그려 정면 샷을 굽는다. 인형 45종을 미리 이미지로 만들어
 * 두는 대신, 처음 보일 때 한 장 굽고 그 뒤로는 캐시를 쓴다.
 *
 * 렌더러는 하나만 만들어 돌려 쓴다. 칸마다 캔버스를 두면 WebGL 컨텍스트
 * 개수 제한(보통 16개)에 바로 걸린다.
 */

const SIZE = 256

let renderer: WebGLRenderer | null = null
let scene: Scene | null = null
let camera: PerspectiveCamera | null = null

const loader = new GLTFLoader(modelLoadingManager)
const gltfCache = new Map<string, Promise<Group>>()
const thumbCache = new Map<string, Promise<string | null>>()

function setup() {
  if (renderer && scene && camera) return { renderer, scene, camera }

  renderer = new WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })
  renderer.setSize(SIZE, SIZE)
  renderer.setPixelRatio(1)

  scene = new Scene()
  scene.add(new AmbientLight(0xffffff, 0.85))
  scene.add(new HemisphereLight(0xd8ccff, 0x2a2350, 0.8))

  const key = new DirectionalLight(0xffffff, 2.4)
  key.position.set(2.5, 4, 4)
  scene.add(key)

  const fill = new DirectionalLight(0xa9c0ff, 0.9)
  fill.position.set(-3, 1.5, 2)
  scene.add(fill)

  // 아래에서 살짝 올려 비추면 봉제 인형의 부피감이 산다
  const bounce = new PointLight(0xffd9c4, 6, 8)
  bounce.position.set(0, -2, 2)
  scene.add(bounce)

  camera = new PerspectiveCamera(30, 1, 0.1, 50)

  return { renderer, scene, camera }
}

function loadGltf(url: string): Promise<Group> {
  let pending = gltfCache.get(url)
  if (!pending) {
    pending = loader.loadAsync(url).then((gltf) => gltf.scene as Group)
    gltfCache.set(url, pending)
  }
  return pending
}

async function render(name: string, size: DollSize): Promise<string | null> {
  const { renderer: gl, scene: sc, camera: cam } = setup()

  const procedural = buildProceduralDoll(name)
  const root = procedural ?? (await loadGltf(modelUrlFor(name))).clone(true)

  const look = dollLook(name)
  const prepared = prepareDollObject(root, look.scale)
  const holder = new Group()
  holder.add(prepared.model)
  holder.add(buildDollDress({ name, size, look, dims: prepared.dims, hull: prepared.hull }))
  /*
   * 살짝 돌려 놓으면 납작한 정면 샷보다 입체감이 산다.
   * 상어·고래처럼 앞뒤로 긴 인형은 정면에서 보면 뭔지 알 수 없으니 더 돌려
   * 옆모습이 보이게 한다.
   */
  const long = prepared.dims.depth > prepared.dims.width * 1.35
  holder.rotation.y = long ? -1.0 : -0.35
  sc.add(holder)

  // 인형이 칸을 꽉 채우도록 카메라 거리를 바운딩박스에서 구한다
  const box = new Box3().setFromObject(holder)
  const span = box.getSize(new Vector3())
  const center = box.getCenter(new Vector3())
  const reach = Math.max(span.x, span.y) / 2 / Math.tan((cam.fov * Math.PI) / 360)
  cam.position.set(center.x, center.y + span.y * 0.05, center.z + reach * 1.06)
  cam.lookAt(center)

  gl.render(sc, cam)
  const url = gl.domElement.toDataURL('image/png')

  sc.remove(holder)
  holder.traverse((child) => {
    const mesh = child as { geometry?: { dispose(): void } }
    if (procedural) mesh.geometry?.dispose()
  })

  return url
}

/**
 * 인형 정면 썸네일을 만든다. 같은 인형은 한 번만 굽는다.
 * WebGL을 못 쓰는 환경에서는 null을 돌려주고, 부르는 쪽이 이모지로 대체한다.
 */
export function dollThumbnail(name: string, size: DollSize): Promise<string | null> {
  const key = `${name}|${size}`
  let pending = thumbCache.get(key)
  if (!pending) {
    pending = render(name, size).catch((error) => {
      console.warn('[dolls] 썸네일 생성 실패', name, error)
      return null
    })
    thumbCache.set(key, pending)
  }
  return pending
}
