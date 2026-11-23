const onlyDigits = (value: string) => value.replace(/\D/g, '');

export const formatCPF = (value?: string | null): string => {
  if (!value) return '';
  const digits = onlyDigits(value).slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

export const formatCEP = (value?: string | null): string => {
  if (!value) return '';
  return onlyDigits(value)
    .slice(0, 8)
    .replace(/(\d{5})(\d)/, '$1-$2');
};

export const formatPhone = (value?: string | null): string => {
  if (!value) return '';
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const timeFormatter = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

/** Datas sem horário (ex.: nascimento) são exibidas em UTC para não "voltarem" um dia. */
export const formatDate = (value?: string | null): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(date);
};

export const formatDateLocal = (value?: string | Date | null): string => (value ? dateFormatter.format(new Date(value)) : '');
export const formatDateTime = (value?: string | null): string => (value ? dateTimeFormatter.format(new Date(value)) : '');
export const formatTime = (value?: string | null): string => (value ? timeFormatter.format(new Date(value)) : '');

export const formatNumber = (value: number): string => new Intl.NumberFormat('pt-BR').format(value);

export const calculateAge = (birthDate: string, today = new Date()): number => {
  const birth = new Date(birthDate);
  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = today.getUTCMonth() - birth.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getUTCDate() < birth.getUTCDate())) age -= 1;
  return age;
};

export const initials = (name?: string | null): string => {
  if (!name) return '?';
  const parts = name
    .replace(/^(Dra?\.)\s+/i, '')
    .split(/\s+/)
    .filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return `${first}${last}`.toUpperCase();
};

/** Converte uma data ISO para o valor aceito por <input type="datetime-local"> no fuso local. */
export const toDateTimeLocalInput = (value?: string | Date | null): string => {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

export const toDateInput = (value?: string | Date | null): string => {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
};

export { onlyDigits };
