/**
 * Server cədvəl filtrinə dəyər yazır; boş dəyər açarı silir. Formada təmizlənən sahə əvvəlki
 * axtarışın dəyəri ilə filtrdə qalmasın (əvvəl yalnız dolu dəyərlər yazılırdı, heç vaxt silinmirdi).
 */
export function setFilter(filter: Record<string, string>, key: string, value: unknown): void {
  if (value === null || value === undefined || value === '') {
    delete filter[key];
  } else {
    filter[key] = String(value);
  }
}
