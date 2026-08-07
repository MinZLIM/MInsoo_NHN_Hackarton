/**
 * 회원가입 비밀번호 규칙.
 *
 * 로그인 화면의 사전 검증과 mock 가입 검증이 같은 규칙을 써야 하므로 여기 한 곳에만 둔다.
 *
 * ⚠️ 실제 Supabase에서는 서버 규칙도 같이 맞춰야 한다.
 *    Dashboard > Authentication > Providers > Email 의
 *    Minimum password length / Password Requirements 를 아래와 동일하게 설정하지 않으면,
 *    이 화면에서 막은 비밀번호를 서버는 그대로 통과시킨다.
 */

export const PASSWORD_MIN_LENGTH = 8

/** 입력칸 placeholder·안내 문구에 쓰는 한 줄 요약 */
export const PASSWORD_RULE_TEXT = `${PASSWORD_MIN_LENGTH}자 이상 · 영문 · 숫자 · 특수문자 포함`

/**
 * 규칙에 맞으면 null, 아니면 사용자에게 보여줄 사유를 돌려준다.
 * 어디가 틀렸는지 알려주려고 boolean 대신 사유를 반환한다.
 */
export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상이어야 합니다.`
  }
  if (!/[A-Za-z]/.test(password)) return '비밀번호에 영문자를 포함해 주세요.'
  if (!/[0-9]/.test(password)) return '비밀번호에 숫자를 포함해 주세요.'
  // 영문·숫자·공백이 아닌 문자를 특수문자로 본다. 허용 목록을 따로 두면 서버 규칙과 어긋나기 쉽다.
  if (!/[^A-Za-z0-9\s]/.test(password)) {
    return '비밀번호에 특수문자(!@#$ 등)를 포함해 주세요.'
  }
  return null
}
