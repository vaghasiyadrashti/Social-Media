const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');


const ApiError = require('./utils/ApiErrors');
const ApiResponse = require('./utils/ApiResponse');
const User = require('./models/user.models');


const app = express();


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public')));


const userRoutes = require('./routes/user.routes.js');
app.use('/users', userRoutes);


const postRoutes = require('./routes/post.routes.js');
app.use('/posts', postRoutes);


app.get('/search',async (req, res) => {
        const { search } = req.query;

    if (!search) {
        throw new ApiError(400, 'Search query is required');
    }       

    const users = await User.find({ username: { $regex: search, $options: 'i' } }).select('-password -refreshToken');

    if (!users?.length) {
        throw new ApiError(404, 'No users found');
    }

    return res.status(200).json(new ApiResponse(200, users, 'Users fetched successfully'));

});

module.exports = app;