# 국내 중심 연관 키워드 네트워크 그래프 MVP

국내 검색 API를 기준축으로 연관 키워드를 모으고, 번역 + 해외 무료 API로 확장한 뒤 다시 국내 맥락으로 재검증하여 네트워크 그래프로 보여주는 Next.js MVP입니다.

## 주요 기능

- 키워드 입력 → `/api/analyze` 단일 엔드포인트 분석
- 국내 수집(네이버/카카오) 중심 점수화
- 번역 provider 분리 구조(`lib/providers/translator.ts`)
- 해외 확장(Datamuse, Wikipedia) + 국내 재검증
- 가중치 기반 최종 점수 산출(`config/weights.ts`)
- 그래프 시각화(`react-force-graph-2d`) + 인사이트 패널
- 일부 provider 실패 시 전체 실패 대신 fallback 동작
- 기본 rate limit + 5분 메모리 캐시 적용
- 브라우저(F12) 콘솔 친화 디버깅 로그 + requestId 표시

## 사용 API

- **Naver Search API**: blog, webkr, shop, kin
- **Naver DataLab Search Trend API**: 후보 반응성 비교
- **Kakao Search API**: web, blog, cafe
- **Datamuse API**: 영어 연관어 확장
- **Wikipedia(MediaWiki) Search API**: 영어 의미 확장
- **LibreTranslate(기본 provider)**: 한↔영 번역 확장

## 환경변수 설정

1. `.env.example` 복사
2. `.env.local` 생성 후 값 입력

```bash
cp .env.example .env.local
```

```env
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=
KAKAO_REST_API_KEY=
LIBRETRANSLATE_URL=https://libretranslate.de/translate
LIBRETRANSLATE_API_KEY=
NEXT_PUBLIC_DEBUG_LOGS=1
```

- `NEXT_PUBLIC_DEBUG_LOGS=1`: F12 콘솔에 분석 시작/성공/오류 로그를 상세 출력합니다.

> API 키가 없더라도 fallback 데이터로 데모 동작은 가능하도록 구성했습니다.

## 로컬 실행

```bash
npm install
npm run dev
npm run build
```

브라우저에서 `http://localhost:3000` 접속.

## GitHub 업로드 방법

```bash
git init
git add .
git commit -m "feat: keyword graph mvp"
git remote add origin <YOUR_REPO_URL>
git push -u origin main
```

## Vercel 배포 방법

1. Vercel에서 GitHub 저장소 Import
2. Framework Preset: Next.js (자동 감지)
3. Project Settings → Environment Variables에 `.env.local` 값 등록
4. Deploy 클릭

기본 빌드 설정(Install: `npm install`, Build: `npm run build`)으로 배포됩니다.

## 응답 스키마

`POST /api/analyze`

- body: `{ "keyword": "강남 헤어샵" }`
- response: 루트 키워드, 노드/링크, 인사이트(상위 키워드/의도그룹/국내-해외 통계)
- `debug`: requestId, 수행시간, 캐시 히트 여부, 단계별 후보 개수

## 주의사항 (무료 API 한계)

- 무료 API는 rate limit과 가용성 이슈가 있습니다.
- Naver/Kakao API 키 미설정 시 실제 검색 기반 점수는 제한됩니다.
- 번역 API 응답 지연/실패 가능성이 있어 timeout + fallback 처리를 적용했습니다.
- 해외 확장 결과는 **국내 재검증 점수** 없이는 높은 최종 점수를 받기 어렵게 설계했습니다.

## TODO (2차 고도화)

- Redis/Edge 캐싱으로 다중 인스턴스 캐시 일관성 확보
- 분석 결과 저장/히스토리
- PNG/PDF 내보내기
- 로그인/권한
- 산업군 템플릿
- 광고주 보고서용 자동 문장 생성
- 의도 분류 고도화(룰 기반 → 경량 ML/LLM 보조)
- 국내 재검증에서 DataLab 교차검증 범위 확대
