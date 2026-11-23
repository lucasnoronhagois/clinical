/** Normaliza texto para buscas sem diferenciar acentos e maiúsculas. */
export const normalizeText = (value?: string | null): string =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
