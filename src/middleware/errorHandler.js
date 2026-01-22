class AppError extends Error {
  constructor(statusCode = 400, status, message) {
    super(message);
    this.statusCode = statusCode;
    this.status= status;

  }
}

export default AppError;
