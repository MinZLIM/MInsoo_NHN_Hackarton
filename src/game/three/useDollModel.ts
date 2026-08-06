import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { dollLook, modelLoadingManager, modelUrlFor } from './dollModels'
import { buildProceduralDoll } from './proceduralDolls'
import { prepareDollObject } from './dollModel'
import { buildDollDress } from './dollDress'
import type { DollSize } from '@/types/api'

/**
 * 인형 하나를 그릴 준비를 한다 — 몸통 모델 · 충돌 껍질 · 장식.
 *
 * 기계 안의 인형(Doll3D)과 콜렉터함 뷰어(DollViewer)가 같은 모습을 쓰도록
 * 이 훅 하나에서 처리한다.
 */
export function useDollModel(name: string, size: DollSize = 'small', scaleMultiplier = 1) {
  const look = useMemo(() => dollLook(name), [name])
  const url = useMemo(() => modelUrlFor(name), [name])

  /*
   * 직접 만든 모델을 쓰는 인형도 useGLTF는 그대로 호출한다.
   * 훅은 조건부로 부를 수 없고, modelUrlFor가 돌려주는 파일은 어차피
   * 다른 인형이 이미 받아 둔 것이라 추가 요청이 생기지 않는다.
   */
  const { scene } = useGLTF(url, undefined, undefined, (loader) => {
    loader.manager = modelLoadingManager
  })

  return useMemo(() => {
    const root = buildProceduralDoll(name) ?? scene.clone(true)
    const prepared = prepareDollObject(root, look.scale * scaleMultiplier)
    const dress = buildDollDress({ name, size, look, dims: prepared.dims, hull: prepared.hull })
    return { ...prepared, dress, look }
  }, [name, size, scene, look, scaleMultiplier])
}
