import { HttpErrorResponse } from '@angular/common/http';

/**
 * Serverin istifadəçi üçün yazdığı xəta mesajı. API iki formada qaytarır:
 * xəta middleware-i PascalCase ({ StatusCode, Message }), controller cavabları camelCase
 * ({ success, message }). Mesaj yoxdursa (şəbəkə xətası, boş 403) fallback göstərilir.
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse) {
    const body = error.error;
    const message = typeof body === 'string' ? null : body?.Message ?? body?.message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
    if (error.status === 403) {
      return 'Bu əməliyyat üçün icazəniz yoxdur.';
    }
  }
  return fallback;
}
