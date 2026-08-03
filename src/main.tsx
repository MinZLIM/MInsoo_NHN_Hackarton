import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

/**
 * StrictMode를 쓰지 않는다.
 *
 * React 19의 StrictMode는 개발 모드에서 컴포넌트를 두 번 마운트하는데,
 * react-three-fiber는 첫 번째 인스턴스를 정리하면서 gl.forceContextLoss()를 호출한다.
 * 두 번째 마운트는 같은 <canvas> DOM 노드를 재사용하므로 이미 죽은 컨텍스트를 물려받아
 * 3D 게임 화면이 통째로 검게 나온다. (콘솔의 "THREE.WebGLRenderer: Context Lost")
 *
 * 게임 화면이 이 프로젝트의 핵심이라 StrictMode 쪽을 포기했다.
 */
createRoot(document.getElementById('root')!).render(<App />)
