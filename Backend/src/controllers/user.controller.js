const asyncHandler = require('../utils/asyncHandler.js');
const ApiError = require('../utils/ApiErrors.js');
const User = require('../models/user.models.js');
const uploadOnCloudinary = require('../utils/cloudinary.js');
const ApiResponse = require('../utils/ApiResponse.js');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Follow = require('../models/follow.models.js');
















const generateAccessAndRefreshToken = async (userId) => {
    try {
        
        console.log('Generating tokens for User ID:', userId);

        const user = await User.findById(userId);

        if (!user) {
            throw new ApiError(404, `User with ID ${userId} not found`);
        }

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        console.log('accessToken:', accessToken);
        console.log('refreshToken:', refreshToken);

        return { accessToken, refreshToken };

    } catch (error) {
        console.error('Error in generating tokens:', error.message);

        throw new ApiError(
            error.statusCode || 500,
            error.message || 'Something went wrong while generating tokens'
        );
    }
};















const registerUser = asyncHandler(async (req, res) => {

    try {
        const {username, email, fullname, password, gender} = req.body;

    if(!username || !email || !fullname || !password)
    {
        throw new ApiError(400, 'All fields are required');
    }

    const existedUser = await User.findOne(
        {
            $or: [{username: username}, {email: email}]
        }
    );

    if(existedUser)
    {
        throw new ApiError(409, 'User already exists');
    }

    const profilePicLocalPath = req.files.path;

    const profilePic = await uploadOnCloudinary(profilePicLocalPath);


    const user = await User.create({
        username: username,
        email: email,
        fullname: fullname,
        password: password,
        profilePic: profilePic?.url,
        profilePicId: profilePic?.public_id,
        gender: gender
    });

    const createdUser = await User.findById(user._id).select('-password');

    if(!createdUser)
    {
        throw new ApiError(500, 'Something went wrong');
    }

    return res.status(201).json(new ApiResponse(201, createdUser, 'User created successfully!!'));
    } catch (error) {
        throw new ApiError(500, `Something went wrong: ${error.message}`);
    }
})














const loginUser = asyncHandler(async (req, res) => {

    const {email, password, username} = req.body;

    if(!username && !email)
    {
        throw new ApiError(400, 'Email or username is required');
    }

    const user = await User.findOne({
        $or: [{username:username}, {email: email}]
    });

    if(!user)
    {
        throw new ApiError(404, 'User not found');
    } 

    const isPasswordValid = await user.isPasswordCorrect(password);

    if(!isPasswordValid){
        throw new ApiError(401, 'Invalid password');
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id);

    console.log(`accessToken: ${accessToken}, refreshToken: ${refreshToken}`);

    const loggedInUser = await User.findById(user._id).select('-password -refreshToken');

    const options = {httpOnly: true, secure: true};

    return res
    .status(200)
    .cookie('refreshToken', refreshToken, options)
    .cookie('accessToken', accessToken, options)
    .json(new ApiResponse(200, {user: loggedInUser, accessToken, refreshToken}, 'User logged in successfully'));
    
});














const logoutUser = asyncHandler(async (req, res) => {

    await User.findByIdAndUpdate(
        req.user._id, 
        {
            $set:{
                refreshToken: undefined
            },
        },
        {
            new: true
        }
    );

    const options = {httpOnly: true, secure: true};

    return res.
    status(200)
    .clearCookie('refreshToken', options)
    .clearCookie('accessToken', options)
    .json(new ApiResponse(200, null, 'User logged out successfully'));
});

















const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken;

    if(!incomingRefreshToken)
    {
        throw new ApiError(401, 'Refresh token is required');
    }

    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

    const user = await User.findById(decodedToken?._id);

    if(!user)
    {
        throw new ApiError(404, 'User not found');
    }

    if(incomingRefreshToken !== user?.refreshToken)
    {
        throw new ApiError(401, 'Invalid refresh token');
    }

    const options = {httpOnly: true, secure: true};

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id);

    return res
    .status(200)
    .cookie('refreshToken', refreshToken, options)
    .cookie('accessToken', accessToken, options)
    .json(new ApiResponse(200, {accessToken, refreshToken}, 'Access token refreshed successfully'));
})


















const editUserDetails = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (!user) {
        throw new ApiError(404, 'User not found');
    }

    const { bio, username, gender } = req.body;


    let profilePic;
    if (req.files?.path) {
        if (user.profilePicPublicId) {
            await cloudinary.uploader.destroy(user.profilePicPublicId);
        }

        profilePic = await uploadOnCloudinary(req.files.path);
    }

    const updateFields = {
        ...(bio && { bio }),
        ...(username && { username }),
        ...(gender && { gender }),
        ...(profilePic?.url && { profilePic: profilePic.url }),
        ...(profilePic?.public_id && { profilePicPublicId: profilePic.public_id }),
    };

    const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        { $set: updateFields },
        { new: true }
    );

    if (!updatedUser) {
        throw new ApiError(500, 'Something went wrong');
    }

    return res.status(200).json(new ApiResponse(200, updatedUser, 'User details updated successfully'));
});



















const editUserPassword = asyncHandler(async (req, res) => {
 
    const {username, email, currentPassword, newPassword, confirmNewPassword } = req.body;

    if(!username && !email)
    {
        throw new ApiError(400, 'Please provide username or email');
    }

    const user = await User.findOne({
        $or: [{username:username}, {email: email}]
    });

    if(!user)
    {
        throw new ApiError(404, 'User not found');
    }

    if (!currentPassword || !newPassword || !confirmNewPassword) {
        throw new ApiError(400, 'Please fill all the fields');
    }

    const isPasswordCorrect = await user.isPasswordCorrect(currentPassword);

    if (!isPasswordCorrect) {
        throw new ApiError(400, 'Incorrect password');
    }

    if (newPassword !== confirmNewPassword) {
        throw new ApiError(400, 'Passwords do not match');
    }

    user.password = newPassword;
    await user.save();

    return res.status(200).json(new ApiResponse(200, user, 'Password updated successfully'));

});
















const fetchProfile = asyncHandler(async (req, res) => {
    const username = req.params.username.trim();  // Trim any extra spaces
    console.log('Looking for user with username:', username);
    
    const user = await User.findOne({ username }).select('-password -refreshToken'); 
    
    if (!user) {
        throw new ApiError(404, 'User not found');
    }

    const isOwnProfile = req.user._id === user._id;

    const data = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(user._id)
            }
        },
        {
            $lookup: {
                from: 'follows',
                localField: '_id',
                foreignField: 'following',
                as: 'followerList'
            }
        },
        {
            $lookup: {
                from: 'follows',
                localField: '_id',
                foreignField: 'user',
                as: 'followingList'
            }
        },
        {
            $lookup:{
                from: 'posts',
                localField: '_id',
                foreignField: 'user',
                as: 'posts'
            }
            
        },
        {
            $addFields: {
                followerCount: { $size: "$followerList" },
                followingCount: { $size: "$followingList" },
                isFollowing: {
                    $in: [new mongoose.Types.ObjectId(user._id), "$followingList.user"]
                },
                postCount : { $size: "$posts" }
            }
        },
        {
            $project: {
                fullname: 1,
                username: 1,
                bio: 1,
                profilePic: 1,
                followerCount: 1,
                followingCount: 1,
                isFollowing: isOwnProfile ? undefined : 1,
                posts: 1,
                postCount: 1
            }
        },
    ]);

    if (!data?.length) {
        throw new ApiError(404, 'User not found');
    }

    return res.status(200).json(new ApiResponse(200, data[0], 'Profile fetched successfully'));
});















const fetchFollowers = asyncHandler(async (req, res) => {
    const username = req.params.username.trim();  // Trim any extra spaces
    console.log('Looking for user with username:', username);
    
    const user = await User.findOne({ username }).select('-password -refreshToken'); 
    
    if (!user) {
        throw new ApiError(404, 'User not found');
    }

    const isOwnProfile = req.user._id === user._id;

    const followers = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(user._id)
            }
        },
        {
            $lookup: {
                from: 'follows',  // Join with the 'follows' collection
                localField: '_id',  // Match the _id of the current user
                foreignField: 'following',  // Match the 'following' field in 'follows'
                as: 'followerList',  // Output array of matched documents in 'followerList'
                pipeline: [  // Pipeline to further look up user details
                    {
                        $lookup: {
                            from: 'users',  // Join with the 'users' collection
                            localField: 'user',  // The 'user' field in the 'follows' collection
                            foreignField: '_id',  // The '_id' field in the 'users' collection
                            as: 'userDetails'  // Output array of matched user documents
                        }
                    },
                    {
                        $project: {
                            _id: 1,  // Include the _id field from the 'follows' collection
                            user: 1,  // Include the user field
                            following: 1,  // Include the following field
                            'userDetails.username': 1  // Only include the 'username' field from 'userDetails'
                        }
                    }
                ]
            }
            
        },
        {
            $addFields: {
                followerList: {
                    $filter: {
                        input: "$followerList",
                        as: "follower",
                        cond: { $ne: ["$$follower.user", new mongoose.Types.ObjectId(user._id)] } // Exclude own ID
                    }
                }
            }
        },
        {
            $addFields: {
                followerCount: { $size: "$followerList" },
            }
        },
        {
            $project: {
                followerList: 1,
                username: 1,
            }
        },
        ]);

        if (!followers?.length) 
        {
            throw new ApiError(404, 'User has no followers');
        }

    return res.status(200).json(new ApiResponse(200, followers[0], 'Followers fetched successfully'));
});













const fetchFollowings = asyncHandler(async (req, res) => {
    const username = req.params.username.trim(); // Trim extra spaces
    console.log('Looking for user with username:', username);

    // Find the user by username
    const user = await User.findOne({ username }).select('-password -refreshToken');

    if (!user) {
        throw new ApiError(404, 'User not found');
    }

    const followings = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(user._id), // Match the user by their ID
            },
        },
        {
            $lookup: {
                from: 'follows',  // Look up the "follows" collection
                localField: '_id',
                foreignField: 'user',  // Match the 'user' field in the "follows" collection
                as: 'followingList',  // Output array of matched documents in "followingList"
                pipeline: [
                    {
                        $lookup: {
                            from: 'users',  // Join with the "users" collection
                            localField: 'following',  // The 'following' field in the "follows" collection
                            foreignField: '_id',  // Match with '_id' in the "users" collection
                            as: 'userDetails',  // Output array of matched user documents
                        },
                    },
                    {
                        $project: {
                            _id: 1,  // Include the _id field from "follows"
                            user: 1,  // Include the user field from "follows"
                            following: 1,  // Include the following field from "follows"
                            'userDetails.username': 1,  // Include only the username field from "userDetails"
                        },
                    },
                ],
            }
            
        },
        {
            $addFields: {
                followingList: {
                    $filter: {
                        input: '$followingList',
                        as: 'following',
                        cond: {
                            $ne: ['$$following.following', new mongoose.Types.ObjectId(user._id)], // Exclude the user's own ID from the followings
                        },
                    },
                },
            },
        },
        {
            $addFields: {
                followingCount: { $size: '$followingList' }, // Add the count of filtered followings
            },
        },
        {
            $project: {
                followingList: 1, // Include the filtered following list
                followingCount: 1, // Include the following count
                username: 1, // Include the username
            },
        },
    ]);

    if (!followings?.length) 
    {
        throw new ApiError(404, 'User has no followings');
    }

    return res
        .status(200)
        .json(new ApiResponse(200, followings[0], 'Followings fetched successfully'));
});














const followUser = asyncHandler(async (req, res) => {

    const  toBeFollowedUsername  = req.params.username;
    const userId = req.user._id;

    const user = await User.findById(userId);

    const toBeFollowedUser = await User.findOne({ username: toBeFollowedUsername }).select('-password -refreshToken'); 

    if (!toBeFollowedUser) {
        throw new ApiError(404, 'toBeFollowedUser not found');
    }

    const isFollowing = await Follow.findOne({ user: userId, following: toBeFollowedUser._id });

    if (isFollowing) {
        throw new ApiError(400, 'You are already following this user');
    }

    const newFollow = await Follow.create({
        user: userId,
        following: toBeFollowedUser._id
    });

    console.log(userId);

    if (!newFollow) {
        throw new ApiError(500, 'Failed to follow user');
    }

    const username = user.username;

    return res.status(200).json(new ApiResponse(200, {newFollow, username, toBeFollowedUsername}, 'User followed successfully'));
});














const unfollowUser = asyncHandler(async (req, res) => {

    const  toBeUnfollowedUsername  = req.params.username;
    const userId = req.user._id;

    const toBeUnfollowedUser = await User.findOne({ username: toBeUnfollowedUsername }).select('-password -refreshToken'); 

    if (!toBeUnfollowedUser) {
        throw new ApiError(404, 'toBeUnfollowedUser not found');
    }

    const isFollowing = await Follow.findOne({ user: userId, following: toBeUnfollowedUser._id });

    if (!isFollowing) {
        throw new ApiError(400, 'You are not following this user');
    }

    await Follow.deleteOne({ user: userId, following: toBeUnfollowedUser._id });

    return res.status(200).json(new ApiResponse(200, null, 'User unfollowed successfully'));
});















// const searchUser = asyncHandler(async (req, res) => {

//     // const { search } = req.query;

//     return res.json('ji');

//     return res.json(search);

//     // if (!search) {
//     //     throw new ApiError(400, 'Search query is required');
//     // }       

//     // const users = await User.find({ username: { $regex: search, $options: 'i' } }).select('-password -refreshToken');

//     // if (!users?.length) {
//     //     throw new ApiError(404, 'No users found');
//     // }

//     // return res.status(200).json(new ApiResponse(200, users, 'Users fetched successfully'));
// });










const searchUser = asyncHandler(async (req, res) => {
    console.log('Search route hit');
    return res.json('hiii');
});











const tempUser = asyncHandler(async (req, res) => {
    return res.json('hiii');
});






module.exports = 
{
    registerUser, 
    loginUser, 
    logoutUser, 
    refreshAccessToken, 
    editUserDetails, 
    editUserPassword, 
    fetchProfile, 
    fetchFollowers, 
    fetchFollowings,
    followUser,
    unfollowUser,
    tempUser
};   