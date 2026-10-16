# SEMI-Talk 🐻

귀여운 캐릭터가 대신 말해주는 음성 통역 웹앱 (갤럭시 크롬용)

- 앱 주소: https://starseeker-harpseal.github.io/SEMI-Talk/
- 내가 한국어로 말하면 → 곰돌이가 상대 언어로 말해줌
- 상대가 말하면 → 상대 캐릭터(👩/👨)가 한국어로 말해줌

## 파일 구성

| 파일 | 하는 일 |
|---|---|
| `index.html` | 본 앱 (곰돌이·상대 캐릭터, 10개 언어) |
| `worker/relay.js` | 번역 중계소 (Cloudflare Worker `semi-talk-relay`) |
| `translate_test.html` | 2단계 번역 테스트 페이지 (캐릭터 없음) |
| `voice_test.html` | 1단계 음성 인식/읽기 테스트 페이지 |

## 구조

```
폰(index.html) → 중계소(Cloudflare Worker) → DeepL API → 중계소 → 폰
```

- DeepL 키는 중계소의 비밀 값에만 있음. 이 레포에는 절대 넣지 않음.
- 중계소 잠금장치: ① 깃허브 페이지 주소에서 온 요청만 받음 ② SEMI-Talk 비밀번호 확인

## 중계소 비밀 값 (Cloudflare → semi-talk-relay → Settings → Variables and secrets)

| 이름 | 종류 | 내용 |
|---|---|---|
| `DEEPL_KEY` | Secret | DeepL API 키 |
| `APP_PASS` | Secret | SEMI-Talk 전용 비밀번호 (폰 ⚙ 설정에 한 번 입력) |

## 언어 추가하는 법

`index.html`의 `LANGS` 목록에 한 줄 추가 (중계소는 안 고쳐도 됨).
목소리는 폰에 그 언어 음성이 깔려 있어야 나옴 (갤럭시 설정 → 텍스트 음성 변환).

## 중계소 코드 고친 뒤

`worker/relay.js` 내용을 Cloudflare → semi-talk-relay → Edit code 에 붙여넣고 Deploy.
