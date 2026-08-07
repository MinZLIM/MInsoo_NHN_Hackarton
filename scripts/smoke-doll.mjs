/** 콜렉터함 3D 뷰어로 인형 디테일을 크게 확인한다. */
import puppeteer from 'puppeteer-core'
import { loginFresh } from './_auth.mjs'
const B='http://localhost:5173', OUT=process.argv[2], TAG=process.argv[3]||'doll'
const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:false,args:['--no-sandbox','--window-size=1300,1050']})
const page=await browser.newPage(); await page.setViewport({width:1200,height:1000,deviceScaleFactor:2})
const errs=[]; page.on('pageerror',e=>errs.push('PAGEERROR '+e.message)); page.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,220))})
const wait=ms=>new Promise(r=>setTimeout(r,ms))
await page.goto(`${B}/#/login`,{waitUntil:'networkidle0'}); await page.waitForSelector('input[type=email]'); await wait(500)
await loginFresh(page,'phys'); await wait(700)
await page.goto(`${B}/#/collection`,{waitUntil:'networkidle0'}); await wait(1500)
const idx=Number(process.argv[4]||0)
await page.evaluate((i)=>{document.querySelectorAll('.vitrine')[i].click()},idx)
await wait(4500)
console.log('인형:', await page.evaluate(()=>document.querySelector('.modal__title')?.textContent))
await page.screenshot({path:`${OUT}/${TAG}.png`})
console.log('canvas:', await page.evaluate(()=>{const c=document.querySelector('.doll-detail__viewer canvas');return c?{w:c.width,h:c.height}:null}))
console.log('errors:', errs.length?errs.slice(0,4):'none')
await browser.close()
