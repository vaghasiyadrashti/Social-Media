const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        lowercase: true,
        trim: true,
        index: true,
        match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
    },

    gender:{
        type: String,
        enum: ['Male', 'Female', 'Other'],
        default: 'Other'
    },

    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
        index: true
    },

    fullname: {
        type: String,
        trim: true,
        minlength: 3,
        maxlength: 100 // Prevent excessively long names
    },

    password:{
        type: String, 
        required: [true, 'Password is required'],
        // unique: true,
        // lowercase: true,
        trim: true,
        // index: true
    },

    profilePic: {
        type: String,
        default: 'https://static.vecteezy.com/system/resources/previews/024/983/914/original/simple-user-default-icon-free-png.png'
    },

    profilePicId:{
        type: String
    },

    privacy: {
        type: String,
        enum: ['Public', 'Private'],
        default: 'Public'
    },

    bio: {
        type: String,
        maxlength: 250 // Limit bio length
    },

    isOnline: {
        type: Boolean,
        default: false
    },

    lastActive: {
        type: Date,
        default: Date.now
    },

    refreshToken: {
        type: String,
    }

},{timestamps: true});

userSchema.index({username: 1, email: 1}, {unique: true});
// userSchema.index({ username: 1 }, { unique: true });



userSchema.path('password').validate((value) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return regex.test(value);
}, 'Password must be at least 8 characters long, contain an uppercase letter, a number, and a special character');



userSchema.pre('save', async function(next) {
    if(!this.isModified('password'))
    {
        return next();
    }

    this.password = await bcrypt.hash(this.password, 10);
    next();
});



userSchema.methods.isPasswordCorrect = async function(password) {
    return await bcrypt.compare(password, this.password);
}



userSchema.methods.updateLastActive = function() {
    this.lastActive = Date.now();
    return this.save();
};



userSchema.methods.generateAccessToken = function() {
    return jwt.sign(
        {
            _id : this.id,
            email: this.email,
            username: this.username
        },
        process.env.ACCESS_TOKEN_SECRET,
        {expiresIn: process.env.ACCESS_TOKEN_EXPIRY}
    );
};



userSchema.methods.generateRefreshToken = function() {
    return jwt.sign(
        {
            _id: this.id
        },
        process.env.REFRESH_TOKEN_SECRET,
        {expiresIn: process.env.REFRESH_TOKEN_EXPIRY}
    );
};



module.exports = mongoose.model('User', userSchema);