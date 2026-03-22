const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiErrors");
const jwt = require("jsonwebtoken");
require("dotenv").config(); 
const User = require("../models/user.models");

const isLoggedIn = asyncHandler(async (req, res, next) => {
    try {
        const token = req.cookies.accessToken || req.header('Authorization')?.split(' ')[1];

        if (!token) {
            throw new ApiError(401, "Authentication token is required");
        }

        console.log('Received Token:', token);

        const data = await jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        
        console.log('Decoded JWT Data:', data);

        const user = await User.findById(data?._id).select('-password -refreshToken');

        if (!user) {
            throw new ApiError(401, "User not found");
        }

        req.user = user;
        next();
        
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new ApiError(401, "Token expired");
        }
        console.error('JWT Verification Error:', error.message);
        throw new ApiError(401, `Something went wrong: ${error.message}`);
    }
});

module.exports = isLoggedIn;
