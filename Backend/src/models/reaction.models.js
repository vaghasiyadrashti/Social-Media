const mongoose = require('mongoose');

const reactionSchema = new mongoose.Schema({
    post: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
        required: true,  
    },

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },

    reactionType: {
        type: String,
        enum: ['heart', 'funny', 'thumb', 'wow'],
        required: true,
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Reaction', reactionSchema);
