/**
 * 등록 이미지 경로의 저장 형식과 해석.
 *
 * iOS는 앱을 업데이트하거나 다시 설치할 때마다 앱 컨테이너 UUID를 새로 발급한다.
 *   file:///var/mobile/Containers/Data/Application/<UUID>/Documents/user-library/...
 * Documents 안의 파일 자체는 그대로 살아남지만 <UUID> 부분이 달라지므로,
 * 절대 URI를 저장해 두면 업데이트 한 번에 전부 깨진 링크가 된다.
 *
 * 그래서 저장에는 문서 디렉터리 기준 **상대 경로**만 남기고, 읽을 때 그 시점의
 * documentDirectory 를 앞에 붙여 해석한다. 예전에 저장된 절대 경로도 같은 함수가
 * 상대 경로로 되돌리므로, 파일이 남아 있는 한 자동으로 복구된다.
 *
 * React Native 에 의존하지 않는 순수 문자열 로직이라 그대로 테스트할 수 있다.
 */

/** 등록 이미지를 모아 두는 문서 디렉터리 하위 폴더 이름. */
export const LIBRARY_DIRNAME = 'user-library';

/**
 * 저장용 상대 경로로 정규화한다.
 *
 * - 이미 상대 경로면 그대로 (여러 번 적용해도 결과가 같다)
 * - `.../user-library/foo.png` → `user-library/foo.png`
 * - `.../Documents/그 밖의/foo.png` → `그 밖의/foo.png`
 * - 그 외에는 파일명만 살려 `user-library/foo.png`
 *
 * 해석할 수 없으면 빈 문자열. 호출부가 "경로 없음"으로 다루면 된다.
 */
export function toLibraryPath(value: string | undefined | null): string {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return '';

  // 쿼리·프래그먼트는 파일 URI 에 붙을 일이 없지만, 들어와도 경로만 남긴다.
  const pathOnly = trimmed.split(/[?#]/, 1)[0].replace(/^\.\//, '');
  if (!pathOnly) return '';

  const isAbsolute = pathOnly.includes('://') || pathOnly.startsWith('/');
  if (!isAbsolute) return stripLeadingSlashes(pathOnly);

  const dirSegment = `/${LIBRARY_DIRNAME}/`;
  const atDir = pathOnly.lastIndexOf(dirSegment);
  // slice(atDir + 1) 로 앞의 '/' 만 떼어 'user-library/...' 를 남긴다.
  if (atDir !== -1) return pathOnly.slice(atDir + 1);

  const docsSegment = '/Documents/';
  const atDocs = pathOnly.lastIndexOf(docsSegment);
  if (atDocs !== -1) {
    const rest = stripLeadingSlashes(pathOnly.slice(atDocs + docsSegment.length));
    if (rest) return rest;
  }

  const basename = pathOnly.split('/').filter(Boolean).pop() ?? '';
  return basename ? `${LIBRARY_DIRNAME}/${basename}` : '';
}

/**
 * 상대 경로를 지금 이 설치본의 절대 URI로 해석한다.
 * 절대 경로를 넣어도 먼저 상대 경로로 되돌린 뒤 다시 붙이므로, 예전 형식이 그대로 통과한다.
 */
export function toLibraryUri(
  value: string | undefined | null,
  documentDirectory: string | undefined | null,
): string | undefined {
  const relative = toLibraryPath(value);
  if (!relative || !documentDirectory) return undefined;

  const base = documentDirectory.endsWith('/') ? documentDirectory : `${documentDirectory}/`;
  return `${base}${relative}`;
}

/** 우리가 만든 등록 이미지 경로인지 (남의 파일을 지우지 않도록 삭제 전에 확인한다). */
export function isLibraryPath(value: string | undefined | null): boolean {
  return toLibraryPath(value).startsWith(`${LIBRARY_DIRNAME}/`);
}

function stripLeadingSlashes(value: string): string {
  return value.replace(/^\/+/, '');
}
