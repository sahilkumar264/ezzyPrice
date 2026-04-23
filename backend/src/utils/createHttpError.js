const createHttpError = (statusCode, message, extras = {}) => {
  const error = new Error(message);
  error.statusCode = statusCode;

  return Object.assign(error, extras);
};

module.exports = createHttpError;
