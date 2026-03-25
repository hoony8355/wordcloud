# 국내 중심 연관 키워드 네트워크 그래프 MVP

국내 검색 API를 기준축으로 연관 키워드를 모으고, 번역 + 해외 무료 API로 확장한 뒤 다시 국내 맥락으로 재검증하여 네트워크 그래프로 보여주는 Next.js MVP입니다.

## 주요 기능

- 키워드 입력 → `/api/analyze` 단일 엔드포인트 분석
- 국내 수집(네이버/카카오) 중심 점수화
- 번역 provider 분리 구조(`lib/providers/translator.ts`)
- (선택) OpenAI 기반 의도 재분류 레이어
- (선택) Upstash Redis 기반 서버리스 캐시 레이어
- 해외 확장(Datamuse, Wikipedia) + 국내 재검증
- 가중치 기반 최종 점수 산출(`config/weights.ts`)
- 그래프 시각화(`react-force-graph-2d`) + 인사이트 패널
- 일부 provider 실패 시 전체 실패 대신 fallback 동작
- 서버 내부 오류 시에도 500 대신 fallback 분석 결과(200) 반환 + warning/debug 노출
- 기본 rate limit + 5분 메모리 캐시 적용
- 브라우저(F12) 콘솔 + 화면 내 디버그 패널(최근 50개 로그) + requestId 표시

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
OPENAI_API_KEY=
OPENAI_INTENT_MODEL=gpt-4o-mini
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
NEXT_PUBLIC_DEBUG_LOGS=1
```

- `NEXT_PUBLIC_DEBUG_LOGS`: 기본적으로 콘솔 로그가 켜져 있으며, `0`으로 설정하면 비활성화됩니다.
- 페이지 하단 `실시간 디버그 로그` 패널에서도 동일 요청 흐름(요청/응답/예외)을 확인할 수 있습니다.
- `OPENAI_API_KEY`를 넣으면 키워드 intent를 LLM이 보정합니다(미설정 시 룰 기반 유지).
- `UPSTASH_REDIS_REST_URL/TOKEN`을 넣으면 서버리스 환경에서도 캐시가 공유됩니다.

> API 키가 없더라도 fallback 데이터로 데모 동작은 가능하도록 구성했습니다.

## 빠른 사용방법

1. 키워드 입력 (브랜드 + 의도 조합 권장: 예 `강남 헤어샵 후기`)
2. `연관 키워드 분석` 클릭
3. 그래프에서 연결강도(선 두께), 중요도(노드 크기), 의도(색상) 확인
4. 인사이트 패널에서 상위 키워드/의도그룹 확인
5. 오류 시 하단 디버그 패널 + F12 콘솔의 requestId 확인

## 로컬 실행

```bash
npm install
npm run dev
npm run build
```

브라우저에서 `http://localhost:3000` 접속.

## Vercel 빌드 안정화 메모

- `npm run build`는 `NEXT_TELEMETRY_DISABLED=1 next build --no-lint`로 설정되어 있습니다.
- 즉, CI/Vercel 빌드에서 telemetry 출력과 lint 단계 영향을 줄이고 타입체크 중심으로 빌드됩니다.

## Vercel Output Directory 오류 해결

- 본 저장소는 Next.js 프로젝트이며 빌드 산출물은 `.next`입니다.
- Vercel Project Settings > Build & Output Settings에서 Output Directory가 `public`으로 고정되어 있다면 비워두거나 `.next`로 수정하세요.
- 저장소에는 동일 설정을 위해 `vercel.json`(`framework: nextjs`, `outputDirectory: .next`)을 포함했습니다.

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

## 고도화 아이디어

- Naver 검색 질의 확장(원본+후기+가격+비교) 기반으로 국내 후보 밀도 강화
- 산업군별 suffix 사전(예: 병원/교육/뷰티/식품) 도입
- 클릭 가능한 키워드 노드 재분석(2-hop 탐색)
- 분석 결과 CSV 다운로드 및 공유 링크 생성

## TODO (2차 고도화)

- Redis/Edge 캐싱으로 다중 인스턴스 캐시 일관성 확보
- 분석 결과 저장/히스토리
- PNG/PDF 내보내기
- 로그인/권한
- 산업군 템플릿
- 광고주 보고서용 자동 문장 생성
- 의도 분류 고도화(룰 기반 → 경량 ML/LLM 보조)
- 국내 재검증에서 DataLab 교차검증 범위 확대
