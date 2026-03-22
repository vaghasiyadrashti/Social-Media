const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
        if (err.code === 11000) {
            // Handle duplicate key errors
            const field = Object.keys(err.keyValue)[0]; // Get the field causing the conflict
            const value = err.keyValue[field];         // Get the conflicting value
            return res.status(400).json({
                success: false,
                message: `Duplicate key error: The ${field} '${value}' already exists.`,
            });
        }

        // Fallback for other errors
        res.status(err.status || 500).json({
            success: false,
            message: err.message || 'Server error.',
        });
    });
};









module.exports = asyncHandler;
