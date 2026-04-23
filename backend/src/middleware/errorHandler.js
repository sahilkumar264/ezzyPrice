const errorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  console.error(error);

  return res.status(error.statusCode || 500).json({
    message: error.message || "Something went wrong.",
  });
};

module.exports = errorHandler;
