const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },

    username: {
        type: String,
    },

    type: {
        type: String,
        enum: ['text', 'media'],
        required: true
    },
    

    text: {
        type: String
    },

    media: {
        type: String
    },

    description: {
        type: String,
        maxLength: 500,
        validate: {
          validator: function (value) {
            // Allow description only if media exists
            return this.media ? value !== undefined : true;
          },
          message: 'Description is only allowed when media is provided.',
        },
      },

    comments: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment'
    },

    reaction: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Reaction'
    },

    publicId_text: {
        type: String
    },

    publicId_media: {
        type: String
    },

    publicId_description: {
        type: String
    },

},
{timestamps: true});

module.exports = mongoose.model('Post', postSchema);