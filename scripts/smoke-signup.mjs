/**
 * 인증 흐름(가입 · 로그인 · 로그아웃) 확인용 스모크 테스트.
 *
 *   npm run dev
 *   node scripts/smoke-signup.mjs <스크린샷폴더> <태그>
 *
 * 가입 직후 자동 로그인되지 않고 로그인 탭으로 돌아오는지, 새로고침해도 세션이
 * 살아나지 않는지, 실패 사유별 안내 문구가 제대로 갈리는지, 로그아웃 토스트가 뜨는지를 본다.
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
const hash = () => page.evaluate(() => location.hash)
const fieldError = () => page.evaluate(() => document.querySelector('.field__error')?.textContent?.trim() ?? '')
const toasts = () => page.evaluate(() => [...document.querySelectorAll('.toast, [class*=toast]')].map(t => t.textContent.trim()).join(' | '))

const fails = []
const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`); if (!ok) fails.push(name) }

// 매번 새 계정으로 시작한다. mock은 localStorage에 계정 장부를 쌓아두기 때문이다.
const EMAIL = `signup${Date.now()}@test.com`
const PW = 'Pass1234!'
const NICK = `가입테스터${Date.now() % 100000}`

const goSignUp = async () => { await click('.login__tabs button', '회원가입'); await wait(300) }
const goSignIn = async () => { await click('.login__tabs button', '로그인'); await wait(300) }

await page.goto(`${B}/#/login`, { waitUntil: 'networkidle0' })
await page.evaluate(() => localStorage.clear())
await page.goto(`${B}/#/login`, { waitUntil: 'networkidle0' })
await page.waitForSelector('input[type=email]', { timeout: 20000 }); await wait(600)

// --- 1. 버튼 문구 ---
await goSignUp()
check('회원가입 탭 버튼 문구가 "회원가입"이다', (await page.evaluate(() => document.querySelector('button[type=submit]')?.textContent?.trim())) === '회원가입')

// --- 4-a. 비밀번호 규칙: 특수문자 누락 ---
await setI('input[type=email]', EMAIL)
await setI('input[type=password]', 'Pass1234')
await setI('.login__form input[type=text]', NICK)
await click('button[type=submit]'); await wait(600)
check('특수문자 없는 비밀번호를 막는다', (await fieldError()).includes('특수문자'), await fieldError())

// --- 4-b. 비밀번호 규칙: 길이 부족 ---
await setI('input[type=password]', 'Pa1!')
await click('button[type=submit]'); await wait(600)
check('8자 미만 비밀번호를 막는다', (await fieldError()).includes('8자 이상'), await fieldError())

// --- 가입 성공 ---
await setI('input[type=password]', PW)
await click('button[type=submit]'); await wait(1800)
await page.screenshot({ path: `${OUT}/${TAG}-1-after-signup.png` })

check('가입 후 로비로 넘어가지 않는다', !(await hash()).includes('lobby'), await hash())
check('가입 후 로그인 탭으로 돌아온다', await page.evaluate(() => [...document.querySelectorAll('.login__tabs button')].find(b => b.textContent.includes('로그인'))?.getAttribute('aria-selected') === 'true'))
check('이메일은 남고 비밀번호는 비워진다', (await val('input[type=email]')) === EMAIL && (await val('input[type=password]')) === '')

// --- 새로고침해도 세션이 살아나면 안 된다 ---
await page.reload({ waitUntil: 'networkidle0' })
await page.waitForSelector('input[type=email]', { timeout: 20000 }); await wait(1200)
check('새로고침해도 로그인되지 않는다', !(await hash()).includes('lobby'), await hash())

// --- 4-c. 중복 이메일 ---
await goSignUp()
await setI('input[type=email]', EMAIL)
await setI('input[type=password]', PW)
await setI('.login__form input[type=text]', `${NICK}2`)
await click('button[type=submit]'); await wait(1200)
check('이미 가입된 이메일을 알려준다', (await fieldError()).includes('이미 가입된 이메일'), await fieldError())

// --- 4-d. 중복 닉네임 ---
await setI('input[type=email]', `other${Date.now()}@test.com`)
await setI('.login__form input[type=text]', NICK)
await click('button[type=submit]'); await wait(1200)
check('이미 쓰는 닉네임을 알려준다', (await fieldError()).includes('닉네임'), await fieldError())

// --- 3-a. 없는 계정으로 로그인 ---
await goSignIn()
await setI('input[type=email]', `nobody${Date.now()}@test.com`)
await setI('input[type=password]', PW)
await click('button[type=submit]'); await wait(1200)
await page.screenshot({ path: `${OUT}/${TAG}-2-account-not-found.png` })
check('없는 계정임을 알려준다', (await fieldError()).includes('가입되지 않은 이메일'), await fieldError())

// --- 3-b. 비밀번호 틀림 ---
await setI('input[type=email]', EMAIL)
await setI('input[type=password]', 'Wrong1234!')
await click('button[type=submit]'); await wait(1200)
await page.screenshot({ path: `${OUT}/${TAG}-3-wrong-password.png` })
check('비밀번호가 틀렸음을 알려준다', (await fieldError()).includes('비밀번호가 올바르지 않습니다'), await fieldError())

// --- 로그인 성공 ---
await setI('input[type=password]', PW)
await click('button[type=submit]')
await page.waitForFunction(() => location.hash.includes('lobby'), { timeout: 15000 }); await wait(1200)
await page.screenshot({ path: `${OUT}/${TAG}-4-after-login.png` })

const body = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 400))
check('가입 때 넣은 닉네임이 유지된다', body.includes(NICK), body.slice(0, 140))
check('가입 보너스 골드가 남아 있다', /10,?000/.test(body), body.slice(0, 140))

// --- 2. 로그아웃 토스트 ---
await click('.settings__trigger'); await wait(400)
await click('.settings__signout'); await wait(700)
const logoutToast = await toasts()
await page.screenshot({ path: `${OUT}/${TAG}-5-after-logout.png` })
check('로그아웃 성공 토스트가 뜬다', logoutToast.includes('로그아웃되었습니다'), logoutToast)
await wait(800)
check('로그아웃 후 로그인 화면으로 돌아간다', (await hash()).includes('login'), await hash())

console.log('\n[errors]', errs.length ? errs.slice(0, 4) : 'none')
console.log(fails.length ? `\n${fails.length} FAILED: ${fails.join(', ')}` : '\nALL PASSED')
await browser.close()
process.exit(fails.length ? 1 : 0)
