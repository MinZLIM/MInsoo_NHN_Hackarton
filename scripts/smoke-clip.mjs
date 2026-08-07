/** 중형(빨래집게) 게임 확인용 스모크 테스트. node scripts/smoke-clip.mjs <폴더> <태그> */
import puppeteer from 'puppeteer-core'
import { loginFresh } from './_auth.mjs'
const B='http://localhost:5173', OUT=process.argv[2], TAG=process.argv[3]||'clip'
const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:false,args:['--no-sandbox','--window-size=1300,1050']})
const page=await browser.newPage(); await page.setViewport({width:1200,height:1000,deviceScaleFactor:2})
const errs=[]; page.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,180))}); page.on('pageerror',e=>errs.push('PAGEERROR: '+e.message))
const wait=ms=>new Promise(r=>setTimeout(r,ms))
const click=(s,t)=>page.evaluate((s,t)=>{const l=[...document.querySelectorAll(s)];const e=t?l.find(x=>x.textContent.includes(t)):l[0];if(!e)throw new Error('no '+s);e.click()},s,t)
await page.goto(`${B}/#/login`,{waitUntil:'networkidle0'}); await page.waitForSelector('input[type=email]'); await wait(600)
await loginFresh(page,'phys'); await wait(700)
await page.goto(`${B}/#/game`,{waitUntil:'networkidle0'})
try{await page.waitForSelector('.mode-card',{timeout:10000})}catch{await page.reload({waitUntil:'networkidle0'});await page.waitForSelector('.mode-card',{timeout:30000})}
await wait(400); await click('.mode-card','중형'); await wait(400); await click('.modal__footer button','입장하기')
await page.waitForSelector('canvas',{timeout:30000}); await wait(7000)
await page.screenshot({path:`${OUT}/${TAG}-idle.png`})
// 버튼을 여러 번 눌러 판정을 돌려 본다
for(let i=0;i<8;i++){ await page.evaluate(()=>document.querySelector('.arcade-button, .clip-button, button.round-button')?.click()); await wait(1600) }
await page.screenshot({path:`${OUT}/${TAG}-after.png`})
console.log('score:', await page.evaluate(()=>document.querySelector('.stage__score')?.textContent||document.body.innerText.match(/획득.*?점/)?.[0]))
console.log('errors:', errs.length?errs.slice(0,5):'none')
await browser.close()
