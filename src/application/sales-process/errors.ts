export class SalesProcessValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SalesProcessValidationError";
  }
}

export class OpenSalesActionConflictError extends SalesProcessValidationError {
  constructor(
    message = "Заявка уже получила новое активное действие. Обновите карточку и повторите при необходимости.",
  ) {
    super(message);
    this.name = "OpenSalesActionConflictError";
  }
}
