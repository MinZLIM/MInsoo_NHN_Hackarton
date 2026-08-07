/**
 * 소형 인형뽑기 수동 확인용 스모크 테스트.
 *
 *   npm i -D puppeteer-core && npm run dev
 *   node scripts/smoke-claw.mjs <스크린샷폴더> <태그>
 *
 * 로그인 -> 소형 입장 -> 시점 전환 -> 집게 하강까지 돌리고 스크린샷을 남긴다.
 * CI에는 넣지 않는다. 브라우저 실행 경로가 로컬 환경에 묶여 있다.
 */
import puppeteer from 'puppeteer-core'
import { loginFresh } from './_auth.mjs'
const B='http://localhost:5173', OUT=process.argv[2], TAG=process.argv[3]||'it'
const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:false,args:['--no-sandbox','--window-size=1300,1050']})
const page=await browser.newPage(); await page.setViewport({width:1200,height:1000})
const errs=[]; page.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,160))}); page.on('pageerror',e=>errs.push('PAGEERROR: '+e.message))
const wait=ms=>new Promise(r=>setTimeout(r,ms))
const click=(s,t)=>page.evaluate((s,t)=>{const l=[...document.querySelectorAll(s)];const e=t?l.find(x=>x.textContent.includes(t)):l[0];if(!e)throw new Error('no '+s);e.click()},s,t)
await page.goto(`${B}/#/login`,{waitUntil:'networkidle0'})
await loginFresh(page,'phys'); await wait(700)
await page.goto(`${B}/#/game`,{waitUntil:'networkidle0'})
try{await page.waitForSelector('.mode-card',{timeout:10000})}catch{await page.reload({waitUntil:'networkidle0'});await page.waitForSelector('.mode-card',{timeout:30000})}
await wait(400); await click('.mode-card','소형'); await wait(400); await click('.modal__footer button','입장하기')
await page.waitForSelector('.stage__cabinet--3d canvas',{timeout:30000}); await wait(7000)
await page.screenshot({path:`${OUT}/${TAG}-front.png`})
await click('.view-switch button','위'); await wait(2500); await page.screenshot({path:`${OUT}/${TAG}-top.png`})
await click('.view-switch button','정면'); await wait(2000)
// 집게 내려 파지 장면
const jb=await page.evaluate(()=>{const r=document.querySelector('.joystick').getBoundingClientRect();return {cx:r.left+r.width/2,cy:r.top+r.height/2}})
await page.mouse.move(jb.cx,jb.cy); await page.mouse.down(); await page.mouse.move(jb.cx+22,jb.cy+12,{steps:6}); await wait(700); await page.mouse.up()
await page.evaluate(()=>{const b=document.querySelector('.arcade-btn'); if(b&&!b.disabled)b.click()})
await wait(2600); await page.screenshot({path:`${OUT}/${TAG}-grip.png`})
await wait(3000); await page.screenshot({path:`${OUT}/${TAG}-lift.png`})
console.log('score:', await page.evaluate(()=>document.querySelector('.stage__score')?.textContent?.trim()))
console.log('[errors]', errs.length?errs.slice(0,4):'none')
await browser.close()
