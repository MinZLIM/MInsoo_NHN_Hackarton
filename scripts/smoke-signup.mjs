/**
 * 회원가입 -> 수동 로그인 흐름 확인용 스모크 테스트.
 *
 *   npm run dev
 *   node scripts/smoke-signup.mjs <스크린샷폴더> <태그>
 *
 * 가입 직후 자동 로그인되지 않고 로그인 탭으로 돌아오는지,
 * 그 상태로 새로고침해도 세션이 살아나지 않는지, 그 뒤 직접 로그인하면
 * 가입 때 넣은 닉네임과 지급된 골드가 그대로인지까지 확인한다.
 * CI에는 넣지 않는다. 브라우저 실행 경로가 로컬 환경에 묶여 있다.
 */
import puppeteer from 'puppeteer-core'
const B = 'http://localhost:5173', OUT = process.argv[2], TAG = process.argv[3] || 'signup'
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: false, args: ['--no-sandbox', '--window-size=1300,1050'] })
const page = await browser.newPage(); await page.setViewport({ width: 1200, height: 1000 })
const errs = []; page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 180)) }); page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message))
const wait = ms => new Promise(r => setTimeout(r, ms))
const click = (s, t) => page.evaluate((s, t) => { const l = [...document.querySelectorAll(s)]; const e = t ? l.find(x => x.textContent.includes(t)) : l[0]; if (!e) throw new Error('no ' + s); e.click() }, s, t)
const setI = (s, v) => page.evaluate((s, val) => { const el = document.querySelector(s); const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; set.call(el, val); el.dispatchEvent(new Event('input', { bubbles: true })) }, s, v)
const val = s => page.evaluate(s => document.querySelector(s)?.value ?? null, s)

const fails = []
const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`); if (!ok) fails.push(name) }

// 매번 새 계정으로 시작한다. mock은 localStorage에 상태를 쌓아두기 때문이다.
const EMAIL = `signup${Date.now()}@test.com`
const PW = 'pass1234'
const NICK = '가입테스터'

await page.goto(`${B}/#/login`, { waitUntil: 'networkidle0' })
await page.evaluate(() => localStorage.clear())
await page.goto(`${B}/#/login`, { waitUntil: 'networkidle0' })
await page.waitForSelector('input[type=email]', { timeout: 20000 }); await wait(600)

// --- 회원가입 ---
await click('.login__tabs button', '회원가입'); await wait(300)
await setI('input[type=email]', EMAIL)
await setI('input[type=password]', PW)
await setI('.login__form input[type=text]', NICK)
await click('button[type=submit]')
await wait(2000)
await page.screenshot({ path: `${OUT}/${TAG}-1-after-signup.png` })

const hashAfterSignup = await page.evaluate(() => location.hash)
check('가입 후 로비로 넘어가지 않는다', !hashAfterSignup.includes('lobby'), hashAfterSignup)
check('가입 후 로그인 탭으로 돌아온다', await page.evaluate(() => [...document.querySelectorAll('.login__tabs button')].find(b => b.textContent.includes('로그인'))?.getAttribute('aria-selected') === 'true'))
check('닉네임 입력칸이 사라진다 (로그인 탭)', await page.evaluate(() => !document.querySelector('.login__form input[type=text]')))
check('이메일은 남아 있다', (await val('input[type=email]')) === EMAIL)
check('비밀번호는 비워진다', (await val('input[type=password]')) === '')

// --- 새로고침해도 세션이 살아나면 안 된다 ---
await page.reload({ waitUntil: 'networkidle0' })
await page.waitForSelector('input[type=email]', { timeout: 20000 }); await wait(1200)
const hashAfterReload = await page.evaluate(() => location.hash)
check('새로고침해도 로그인되지 않는다', !hashAfterReload.includes('lobby'), hashAfterReload)

// --- 보호된 라우트 직접 진입도 막혀야 한다 ---
await page.goto(`${B}/#/lobby`, { waitUntil: 'networkidle0' })
await wait(1500)
const hashAfterGuard = await page.evaluate(() => location.hash)
check('/lobby 직접 진입 시 로그인으로 튕긴다', hashAfterGuard.includes('login'), hashAfterGuard)

// --- 직접 로그인 ---
await page.waitForSelector('input[type=email]', { timeout: 20000 }); await wait(400)
await setI('input[type=email]', EMAIL)
await setI('input[type=password]', PW)
await click('button[type=submit]')
await page.waitForFunction(() => location.hash.includes('lobby'), { timeout: 15000 }); await wait(1200)
await page.screenshot({ path: `${OUT}/${TAG}-2-after-login.png` })
check('직접 로그인하면 로비로 들어간다', true)

const body = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 400))
check('가입 때 넣은 닉네임이 유지된다', body.includes(NICK), body.slice(0, 160))
check('가입 보너스 골드가 남아 있다', /10,?000/.test(body), body.slice(0, 160))

console.log('\n[errors]', errs.length ? errs.slice(0, 4) : 'none')
console.log(fails.length ? `\n${fails.length} FAILED: ${fails.join(', ')}` : '\nALL PASSED')
await browser.close()
process.exit(fails.length ? 1 : 0)
