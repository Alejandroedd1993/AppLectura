export function simpleTextHash(str) {
  let hash = 0;
  let index = 0;
  const length = str.length;

  while (index < length) {
    hash = ((hash << 5) - hash) + str.charCodeAt(index++);
    hash |= 0;
  }

  return (hash >>> 0).toString(36);
}