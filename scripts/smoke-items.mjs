/** 상점 아이템 구매 → 입장 창 선택 → 게임 시작 확인. node scripts/smoke-items.mjs <폴더> <태그> */
import puppeteer from 'puppeteer-core'
const B='http://localhost:5173', OUT=process.argv[2], TAG=process.argv[3]||'item'
const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:false,args:['--no-sandbox','--window-size=1300,1050']})
const page=await browser.newPage(); await page.setViewport({width:1200,height:1000,deviceScaleFactor:2})
const errs=[]; page.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,180))}); page.on('pageerror',e=>errs.push('PAGEERROR: '+e.message))
const wait=ms=>new Promise(r=>setTimeout(r,ms))
const click=(s,t)=>page.evaluate((s,t)=>{const l=[...document.querySelectorAll(s)];const e=t?l.find(x=>x.textContent.includes(t)):l[0];if(!e)throw new Error('no '+s+' '+(t||''));e.click()},s,t)
const setI=(s,v)=>page.evaluate((s,val)=>{const el=document.querySelector(s);const set=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;set.call(el,val);el.dispatchEvent(new Event('input',{bubbles:true}))},s,v)
const txt=s=>page.evaluate(s=>document.querySelector(s)?.innerText,s)

await page.goto(`${B}/#/login`,{waitUntil:'networkidle0'}); await page.waitForSelector('input[type=email]'); await wait(600)
await setI('input[type=email]','item@test.com'); await setI('input[type=password]','pass1234')
await click('button[type=submit]')
await page.waitForFunction(()=>location.hash.includes('lobby'),{timeout:15000}); await wait(700)

// 인형을 팔아 골드를 만든 뒤 아이템 구매
await page.goto(`${B}/#/shop`,{waitUntil:'networkidle0'}); await wait(1200)
await click('.filter-tabs button','아이템'); await wait(1500)
console.log('아이템 카드:', await page.evaluate(()=>document.querySelectorAll('.item-card').length))
await page.screenshot({path:`${OUT}/${TAG}-shop.png`})
await click('.item-card button','1,500'); await wait(1200)   // 집게 강화
await click('.item-card button','1,200'); await wait(1200)   // 시간 연장
console.log('보유:', await page.evaluate(()=>[...document.querySelectorAll('.item-card__own')].map(e=>e.textContent).join(' / ')))
console.log('골드:', await txt('.app-header'))

// 게임 방 입장 창
await page.goto(`${B}/#/game`,{waitUntil:'networkidle0'})
try{await page.waitForSelector('.mode-card',{timeout:10000})}catch{await page.reload({waitUntil:'networkidle0'});await page.waitForSelector('.mode-card',{timeout:30000})}
await wait(600); await click('.mode-card','소형'); await wait(1200)
console.log('선택 칩:', await page.evaluate(()=>[...document.querySelectorAll('.item-chip')].map(e=>e.innerText.replace(/\n/g,' ')).join(' | ')))
await click('.item-chip','집게 강화'); await wait(300)
await click('.item-chip','시간 연장'); await wait(400)
await page.screenshot({path:`${OUT}/${TAG}-picker.png`})
console.log('켜진 칩:', await page.evaluate(()=>document.querySelectorAll('.item-chip.is-on').length))
await click('.modal__footer button','게임 시작')
await page.waitForSelector('.stage__cabinet--3d canvas',{timeout:30000}); await wait(3000)
console.log('HUD:', await txt('.stage__hud'))
await page.screenshot({path:`${OUT}/${TAG}-play.png`})
console.log('errors:', errs.length?errs.slice(0,5):'none')
await browser.close()
