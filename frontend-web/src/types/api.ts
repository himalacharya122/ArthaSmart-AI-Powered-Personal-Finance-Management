export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiError {
  detail?: string;
  code?: string;
  errors?: Record<string, string[]>;
}

export interface ApiFieldErrors {
  [field: string]: string[];
}
