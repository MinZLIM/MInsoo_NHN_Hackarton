/**
 * 스모크 테스트용 로그인 헬퍼.
 *
 * mock은 가입된 계정만 로그인시켜 준다. 그래서 매 실행마다 새 계정을 만들고 그 계정으로 들어간다.
 * 계정은 localStorage에 쌓이므로 이메일·닉네임에 타임스탬프를 붙여 겹치지 않게 한다.
 * (마스터 계정으로 들어가고 싶으면 이 헬퍼 대신 admin@admin.com / 1q2w3e 를 직접 넣으면 된다)
 */

const RULE_OK_PASSWORD = 'Pass1234!' // 8자 이상 · 영문 · 숫자 · 특수문자

export async function loginFresh(page, tag = 'smoke') {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms))
  const click = (s, t) =>
    page.evaluate(
      (s, t) => {
        const l = [...document.querySelectorAll(s)]
        const e = t ? l.find((x) => x.textContent.includes(t)) : l[0]
        if (!e) throw new Error('no ' + s)
        e.click()
      },
      s,
      t,
    )
  const setI = (s, v) =>
    page.evaluate(
      (s, val) => {
        const el = document.querySelector(s)
        const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
        set.call(el, val)
        el.dispatchEvent(new Event('input', { bubbles: true }))
      },
      s,
      v,
    )

  const stamp = Date.now()
  const email = `${tag}${stamp}@test.com`

  await page.waitForSelector('input[type=email]', { timeout: 20000 })
  await wait(600)

  // 가입
  await click('.login__tabs button', '회원가입')
  await wait(300)
  await setI('input[type=email]', email)
  await setI('input[type=password]', RULE_OK_PASSWORD)
  await setI('.login__form input[type=text]', `${tag}${stamp % 100000}`)
  await click('button[type=submit]')

  // 가입 후에는 자동 로그인되지 않고 로그인 탭으로 돌아온다
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll('.login__tabs button')]
        .find((b) => b.textContent.includes('로그인'))
        ?.getAttribute('aria-selected') === 'true',
    { timeout: 15000 },
  )
  await wait(400)

  // 로그인 (이메일은 남아 있고 비밀번호만 비워져 있다)
  await setI('input[type=password]', RULE_OK_PASSWORD)
  await click('button[type=submit]')
  await page.waitForFunction(() => location.hash.includes('lobby'), { timeout: 15000 })

  return { email, password: RULE_OK_PASSWORD }
}
