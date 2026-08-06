/** 도감 목록 썸네일 확인용 스모크 테스트. node scripts/smoke-collection.mjs <폴더> <태그> */
import puppeteer from 'puppeteer-core'
const B='http://localhost:5173', OUT=process.argv[2], TAG=process.argv[3]||'coll'
const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:false,args:['--no-sandbox','--window-size=1300,1100']})
const page=await browser.newPage(); await page.setViewport({width:1200,height:1050,deviceScaleFactor:2})
const errs=[]; page.on('pageerror',e=>errs.push('PAGEERROR '+e.message)); page.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,200))})
const wait=ms=>new Promise(r=>setTimeout(r,ms))
const click=(s,t)=>page.evaluate((s,t)=>{const l=[...document.querySelectorAll(s)];const e=t?l.find(x=>x.textContent.includes(t)):l[0];if(!e)throw new Error('no '+s);e.click()},s,t)
const setI=(s,v)=>page.evaluate((s,val)=>{const el=document.querySelector(s);const set=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;set.call(el,val);el.dispatchEvent(new Event('input',{bubbles:true}))},s,v)
await page.goto(`${B}/#/login`,{waitUntil:'networkidle0'}); await page.waitForSelector('input[type=email]'); await wait(500)
await setI('input[type=email]','admin@admin.com'); await setI('input[type=password]','1q2w3e')
await click('button[type=submit]')
await page.waitForFunction(()=>location.hash.includes('lobby'),{timeout:15000}); await wait(700)
await page.goto(`${B}/#/collection`,{waitUntil:'networkidle0'}); await wait(6000)
await page.screenshot({path:`${OUT}/${TAG}.png`,fullPage:true})
console.log('img:', await page.evaluate(()=>document.querySelectorAll('.doll-image img').length), '/ 칸:', await page.evaluate(()=>document.querySelectorAll('.vitrine').length))
console.log('errors:', errs.length?errs.slice(0,5):'none')
await browser.close()
