# App Store 스크린샷

## 요구 규격

| 폴더 | 기기 | 해상도 | ASC 슬롯 | 필수 |
|---|---|---|---|---|
| `raw/iphone/` | iPhone 6.9" | 1320 × 2868 | `APP_IPHONE_67` | 예 |
| `raw/ipad/` | iPad Pro 13-inch (M4) | 2064 × 2752 | `APP_IPAD_PRO_3GEN_129` | 예 (`supportsTablet: true`) |

각 사이즈당 최소 1장, 최대 10장.

> ASC 슬롯 값은 API 에 직접 시도해 확인했다.
> `APP_IPHONE_69` 와 `APP_IPAD_13` 은 **유효하지 않다**(409).

## 현재 들어 있는 캡처

실기기 캡처(2026-08-19). **파일명은 IMG 번호가 아니라 앱 흐름 순서**로 붙였다 —
iPhone 은 촬영 순서와 흐름 순서가 달라서(3585 가 3583 보다 앞) 다시 매겼다.

| slug | 화면 | iPhone | iPad |
|---|---|---|---|
| `01-home` | 모드 선택(홈) | IMG_3582 | IMG_0907 ⚠️ |
| `02-select` | 프레임 선택 · 내 프레임 만들기 | IMG_3585 | IMG_0910 |
| `03-edit` | 편집(스티커 배치) | IMG_3583 | IMG_0911 |
| `04-result` | 완성 · 저장/공유 | IMG_3584 | IMG_0912 |

### ⚠️ iPad `01-home` 은 다시 찍어야 한다 (ASC 미업로드)

두 가지 문제가 겹쳐 있어 업로드에서 제외했다.

1. **홈 화면 여백 수정(`cce7ca9`) 이전 빌드**로 찍혔다. 제목이 상단에 붙고 카드만
   화면 중앙으로 내려간 그 레이아웃 그대로다. 픽셀로 확인한 근거는 아래 "판별" 참고.
2. 상태바에 **`◀ TestFlight`** breadcrumb 이 남아 있다. 심사에서 베타 흔적은
   반려 사유가 된다.

`cce7ca9` 이후 빌드에서 홈 화면을 **TestFlight 를 거치지 않고**(홈 화면에서 앱을
직접 실행) 다시 찍어 `raw/ipad/01-home.png` 를 갈아끼운 뒤

```bash
python3 scripts/compose-store-screenshots.py --device ipad
node scripts/upload-store-screenshots.mjs --device ipad
```

#### 판별 — 왜 수정 이전 빌드라고 볼 수 있나

`cce7ca9` 는 제목과 카드를 한 덩어리(`body`)로 묶어 **함께** 세로 중앙에 둔다.
2360×1640 캡처를 pt 로 환산해 재면:

| | 수정 전 예측 | 수정 후 예측 | 실제 캡처 |
|---|---|---|---|
| 제목 시작 | ~124pt (프로필 칩 바로 아래) | ~262pt (중앙 정렬된 덩어리) | **132pt** |
| 카드 시작 | ~320pt | ~314pt (제목과 20pt 간격) | **317pt** |

제목이 칩 바로 아래에 붙어 있고 카드만 중앙으로 내려가 그 사이가 278px 비어 있다.
수정 후라면 제목도 같이 내려와 있어야 한다.

## 작업 순서

1. **원본 캡처를 `raw/<기기>/<slug>.png` 로 넣는다.** slug 는 캡션 JSON 과 같아야 한다.

2. **캡션을 얹어 규격에 맞춘다**

   ```bash
   python3 -m pip install pillow          # 최초 1회
   python3 scripts/compose-store-screenshots.py --list      # 캡션 확인
   python3 scripts/compose-store-screenshots.py             # iPhone + iPad
   ```

   결과는 `composed/<기기>/` 에 정확한 픽셀 규격(sRGB · 알파 없음)으로 저장된다.
   캡션 문구는 `store/screenshot-captions.json` 에서 고친다.

3. **App Store Connect 에 올린다**

   ```bash
   node scripts/upload-store-screenshots.mjs --dry-run   # 계획 확인
   node scripts/upload-store-screenshots.mjs
   node scripts/upload-store-screenshots.mjs --exclude ipad/01-home
   ```

   예약 → 바이너리 PUT → `uploaded=true` + MD5 커밋 → `COMPLETE` 확인까지 한다.
   기존 세트에 이미지가 있으면 지우고 새로 올린다(교체). 목록 순서는 파일명 순으로 고정된다.
   자격증명은 `.env.release` (`ASC_ISSUER_ID` / `ASC_KEY_ID` / `ASC_KEY_PATH`).

## 합성 시 알아둘 것

### 기기마다 캔버스 색이 다르다

앱 테마가 프로필 이모지를 따라가서, iPhone 캡처는 `purple` · iPad 캡처는 `peach`
테마로 찍혔다. 캔버스 그라디언트를 캡처 테마에 맞춰야 화면과 배경이 한 장처럼
보이므로 `SPECS` 의 `palette` 로 기기별로 나눠 둔다. **캡처를 다른 테마로 다시
찍으면 이 값도 같이 바꿔야 한다.**

### iPad 원본은 가로, 규격은 세로다

iPad 캡처는 2360×1640(가로)인데 규격 캔버스는 2064×2752(세로)다. 종횡비가 아예
달라서 채울 수가 없다. 잘라내면 UI 가 날아가므로 **비율을 유지한 채 폭에 맞춰
넣고, 남는 세로 공간은 위아래로 반씩 나눠** 화면을 띠 한가운데 둔다
(`compose()` 의 `top` 계산). 좌우 여백(`side_pad`)을 48 로 좁혀 화면을 최대한
크게 넣었고, 남는 여백이 허전하지 않도록 iPad 캡션만 키웠다(104/58).

> 더 나은 선택지: Apple 은 iPad 13" 슬롯에 **가로 2752×2064 도 받는다.**
> 가로로 찍은 캡처를 그대로 쓰면 여백 없이 꽉 찬다. 세로 규격을 고집할 이유가
> 없다면 그쪽이 낫다.

### iPadOS 퀵 메모 핫코너

iPad 캡처 우하단에 15pt 짜리 검은 갈고리(퀵 메모 핫코너 어피던스)가 4장 모두
찍혀 있었다. 원본을 `raw/` 로 옮길 때 배경색으로 덮었다. 배경 그라디언트가
세로 방향이라 같은 행의 왼쪽 픽셀을 그대로 쓰면 티가 나지 않는다.
다시 찍을 때 **설정 > 멀티태스킹 및 제스처 > 퀵 메모 끄기**로 아예 없앨 수 있다.

## 촬영 팁

- **촬영 화면(카메라 미리보기)은 시뮬레이터로 못 찍는다** — 시뮬레이터에 카메라가 없다.
- **편집·텍스트 화면을 찍으려면 앱에 프레임·스티커를 먼저 등록**해 두어야 한다.
- **TestFlight 로 열지 말고 홈 화면에서 앱을 직접 실행**해야 상태바에
  `◀ TestFlight` 가 남지 않는다.
