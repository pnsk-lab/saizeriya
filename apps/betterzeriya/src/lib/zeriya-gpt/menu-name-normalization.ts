const zeroWidthPattern = /[\u200B-\u200D\uFEFF]/gu
const whitespacePattern = /\p{White_Space}+/gu

export const normalizeMenuName = (text: string) =>
  text.normalize('NFKC').replace(zeroWidthPattern, '').replace(whitespacePattern, ' ').trim()
