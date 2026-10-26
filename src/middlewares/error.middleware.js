const errorHandler = (error, _req, res, next) => {
    if (res.headersSent) {
        return next(error);
    }

    let statusCode = error.statusCode ?? 500;
    if (error.name === "MulterError") {
        statusCode = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    } else if (error.name === "ValidationError") {
        statusCode = 400;
    } else if (error.code === 11000) {
        statusCode = 409;
    }

    if (statusCode >= 500) {
        console.error(error);
    }

    return res.status(statusCode).json({
        success: false,
        message: statusCode >= 500 ? "Internal server error" : error.message,
        errors: error.errors ?? []
    });
};

export { errorHandler };
