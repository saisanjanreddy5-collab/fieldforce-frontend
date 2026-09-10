export interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorBody {
  success: false;
  message: string;
  errors?: unknown;
}
