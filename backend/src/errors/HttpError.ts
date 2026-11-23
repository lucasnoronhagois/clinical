export interface ErrorDetail {
  field?: string;
  message: string;
}

export class HttpError extends Error {
  readonly status: number;
  readonly details?: ErrorDetail[];

  constructor(status: number, message: string, details?: ErrorDetail[]) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
  }

  static badRequest(message: string, details?: ErrorDetail[]) {
    return new HttpError(400, message, details);
  }

  static unauthorized(message = 'Não autenticado.') {
    return new HttpError(401, message);
  }

  static forbidden(message = 'Acesso não autorizado.') {
    return new HttpError(403, message);
  }

  static notFound(message = 'Recurso não encontrado.') {
    return new HttpError(404, message);
  }

  static conflict(message: string) {
    return new HttpError(409, message);
  }
}
