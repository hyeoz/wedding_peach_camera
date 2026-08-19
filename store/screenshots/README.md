# App Store 스크린샷

## 요구 규격

| 폴더 | 기기 | 해상도 | ASC 슬롯 | 필수 |
|---|---|---|---|---|
| `raw/iphone/` | iPhone 6.9" (17/16 Pro Max) | 1320 × 2868 | `APP_IPHONE_67` | 예 |
| `raw/ipad/` | iPad Pro 13-inch (M4) | 2064 × 2752 | `APP_IPAD_PRO_3GEN_129` | 예 (`supportsTablet: true`) |

각 사이즈당 최소 1장, 최대 10장. 5장을 권장한다.

> ASC 슬롯 값은 API 에 직접 시도해 확인했다.
> `APP_IPHONE_69` 와 `APP_IPAD_13` 은 **유효하지 않다**(409).

## 작업 순서

1. **원본 캡처를 아래 경로에 넣는다** (파일명은 캡션 slug 와 같아야 한다)

   ```
   store/screenshots/raw/iphone/01-home.png
   store/screenshots/raw/iphone/02-select.png
   store/screenshots/raw/iphone/03-edit.png
   store/screenshots/raw/iphone/04-text.png
   store/screenshots/raw/iphone/05-result.png
   store/screenshots/raw/ipad/…  (같은 5장)
   ```

2. **캡션을 얹어 규격에 맞춘다**

   ```bash
   python3 -m pip install pillow          # 최초 1회
   python3 scripts/compose-store-screenshots.py --list      # 캡션 확인
   python3 scripts/compose-store-screenshots.py             # iPhone + iPad
   ```

   결과는 `store/screenshots/composed/<기기>/` 에 정확한 픽셀 규격으로 저장된다.
   캡션 문구는 `store/screenshot-captions.json` 에서 고칠 수 있다.

3. 업로드는 App Store Connect 에서(또는 API 로) 진행한다.

## 촬영 팁

- **촬영 화면(카메라 미리보기)은 시뮬레이터로 못 찍는다** — 시뮬레이터에 카메라가 없다.
  실기기 6.9" 로 찍으면 1320×2868 이 그대로 나온다.
- **편집·텍스트 화면을 찍으려면 앱에 프레임·스티커를 먼저 등록**해 두어야 한다
  (앱에 내장된 프레임·스티커가 없기 때문).
- 시뮬레이터로 찍는다면 `scripts/screenshots.sh` 가 상태바를 9:41 로 고정하고
  해상도까지 검증해 준다.

## 참고

이전에 시뮬레이터로 찍어둔 홈 화면 캡처(`iphone-6.9/`, `ipad-13/`)는 지웠다.
iPad 쪽은 홈 화면 레이아웃 수정 전에 찍은 것이라 낡았고, 캡션을 얹는
`raw/` → `composed/` 흐름으로 대체된다.
