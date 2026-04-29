const ApiError = require('../utils/ApiError');

const errorHandler = (err, req, res, next) => {
  let { statusCode, message } = err;
  
  if (!err.statusCode) {
    if (err.type === 'entity.too.large') {
      statusCode = 413;
      message = 'Uploaded images are too large. Please use smaller images.';
    } else if (err.name === 'ValidationError') {
      statusCode = 400;
      message = Object.values(err.errors || {})
        .map((error) => error.message)
        .join(', ') || 'Validation Error';
    } else if (err.name === 'CastError') {
      statusCode = 400;
      message = 'Invalid identifier';
    } else {
      statusCode = 500;
      message = 'Internal Server Error';
    }
  }

  res.locals.errorMessage = err.message;

  const response = {
    code: statusCode,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  };

  res.status(statusCode).send(response);
};

module.exports = { errorHandler };
