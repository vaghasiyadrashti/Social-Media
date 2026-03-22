const asyncHandler = require('../utils/asyncHandler.js');
const ApiError = require('../utils/ApiErrors.js');
const Post = require('../models/post.models.js');
const uploadOnCloudinary = require('../utils/cloudinary.js');
const ApiResponse = require('../utils/ApiResponse.js');
const jwt = require('jsonwebtoken');
const User = require('../models/user.models.js');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Comment = require('../models/comment.models.js');
const Follow = require('../models/follow.models.js');
const Reaction = require('../models/reaction.models.js');
// const Post = require('../models/post.models.js');














const createPost = asyncHandler(async (req, res) => {
    const { type, text} = req.body;
    const user = await User.findById(req.user._id);
  
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    if(!type)
    {
        throw new ApiError(400, "Type is required");
    }
  
    if (type === "text") {
        console.log('hii');
      if (!text) {
        throw new ApiError(400, "Text is required");
      }
  
      const newPost = await Post.create({
        type: "text",
        user: user._id,
        username: user.username
      });
  
      const postId = newPost._id;
      const localTextFilePath = path.join(__dirname, `../public/posts/${postId}.txt`);
  
      try {

        fs.writeFileSync(localTextFilePath, text);

        const textFile = await uploadOnCloudinary(localTextFilePath);

        newPost.text = textFile.secure_url,
        newPost.publicId_text = textFile.public_id

        await newPost.save();       

        console.log(newPost);
  
        return res
        .status(201)
        .json(new ApiResponse(201, newPost, 'Post created successfully!!'));
      } catch (error) {
        throw new ApiError(500, `Failed to create post: ${error.message}`);
      } finally {

        if (fs.existsSync(localTextFilePath)) {
          fs.unlinkSync(localTextFilePath);
        }
      }
    }
  
    if (type === "media") {
      const { description } = req.body;

      const mediaFile = req.file; 
  
      if (!mediaFile) {
        throw new ApiError(400, "Media is required");
      }
  
      const mediaLocalPath = mediaFile.path;
  
      const newPost = await Post.create({
        user: user._id,
        type: "media",
        username: user.username
      });
  
      try {
        const uploadedMedia = await uploadOnCloudinary(mediaLocalPath);
  
        newPost.media = uploadedMedia.secure_url;
        newPost.publicId_media = uploadedMedia.public_id;

        newPost.save();
  
        if (description) {
          const postId = newPost._id;
          const localDescriptionPath = path.join(__dirname, `../public/posts/${postId}-desc.txt`);
  
          try {
            fs.writeFileSync(localDescriptionPath, description);
  
            const uploadedDescription = await uploadOnCloudinary(localDescriptionPath);

            newPost.description = uploadedDescription.secure_url;
            newPost.publicId_description = uploadedDescription.public_id;

            await newPost.save();

          } finally {
            if (fs.existsSync(localDescriptionPath)) {
              fs.unlinkSync(localDescriptionPath);
            }

            if(fs.existsSync(mediaLocalPath))
            {
                fs.unlinkSync(mediaLocalPath);
            }
          }
        }
  
        return res
        .status(201)
        .json(new ApiResponse(201, newPost, 'Post created successfully!!'));
      } catch (error) {
        throw new ApiError(500, `Failed to create post: ${error.message}`);
      } finally {
        if (fs.existsSync(mediaLocalPath)) {
          fs.unlinkSync(mediaLocalPath);
        }
      }
    }
  
    throw new ApiError(400, "Invalid post type");
  });
  





















  const countReactions = async (postId) => {
    try {
      const reactionCount = await Reaction.aggregate([
        { $match: { post: new mongoose.Types.ObjectId(postId) } }, // Match the post ID
        { $group: { 
            _id: "$reactionType", // Group by reaction type
            count: { $sum: 1 } // Count occurrences of each reaction type
        }},
        { $project: { 
            _id: 0, // Hide the _id field
            reactionType: "$_id", // Use the reactionType field for clarity
            count: 1 // Include the count field
        }}
      ]);
      
      return reactionCount;
    } catch (error) {
      console.error("Error counting reactions:", error);
      return [];
    }
  };
  








  const FetchThePost = asyncHandler(async (req, res) => {
    // const postId = req.params.postId;
    const postId = req.params.postId.trim(); 

    // Fetch the post
    const post = await Post.findById(postId);

    if (!post) {
        throw new ApiError(404, "Post not found");
    }

    // Fetch comments along with the associated user details
    const comments = await Post.aggregate([
      {
          $match: {
              _id: new mongoose.Types.ObjectId(postId),
          },
      },
      {
          $lookup: {
              from: 'comments',
              localField: '_id',
              foreignField: 'post',
              as: 'commentsList',


              pipeline: [
                {
                    $lookup: {
                        from: 'users',
                        localField: 'user',
                        foreignField: '_id',
                        as: 'userDetails',
                    },
                },
            ]
          },
      },
      {
          $addFields: {
              commentsCount: { $size: '$commentsList' },  // Ensure commentsList is treated as an array
          }
      },
      {
          $project: {
              commentsList: 1,
              commentsCount: 1,
              // userDetails: 1,  // Use this for the renamed field
          },
      },
  ]);

    if (!comments?.length) {
        throw new ApiError(404, 'Post has no comments');
    }

    // Count the number of reactions for each reaction type
    const reactionCount = await countReactions(postId);

    // Prepare the response with the post and comments
    return res.status(200).json(
        new ApiResponse(200, { post, comments: comments[0], reactionCount}, 'Post fetched successfully')
    );
});
















const commentOnPost = asyncHandler(async (req, res) => {
    const postId = req.params.postId;
    const { comment } = req.body;

    if (!comment) {
        throw new ApiError(400, "Comment is required");
    }

    const post = await Post.findById(postId);

    if (!post) {
        throw new ApiError(404, "Post not found");
    }

    const newComment = await Comment.create({
        user: req.user._id,
        post: postId,
        comment,
    });

    await newComment.save();

    return res
        .status(201)
        .json(new ApiResponse(201, newComment, 'Comment created successfully!!'));
  
  });

















  const FetchAllPosts = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const followings = await Follow.find({ user: user._id });

    if (!followings?.length) {
        return res
            .status(201)
            .json(new ApiResponse(201, { message: 'Follow people for content!!!' }, 'No posts found!!'));
    }

    const followingIds = followings.map((f) => f.following);

    // Initialize posts array
    let posts = [];

    // Use Promise.all to handle async operations correctly
    const tempPosts = await Promise.all(followingIds.map(async (id) => {
        return await User.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(id),
                },
            },
            {
                $lookup: {
                    from: "posts", // Lookup posts for each followed user
                    localField: "_id",
                    foreignField: "user",
                    as: "PostsList",
                    pipeline: [
                        {
                            $lookup: {
                                from: "comments", // Lookup comments for each post
                                localField: "_id",
                                foreignField: "post",
                                as: "commentsList",
                            },
                        },
                        {
                            $lookup: {
                                from: "reactions", // Lookup reactions for each post
                                localField: "_id",
                                foreignField: "post",
                                as: "reactionsList",
                            },
                        },
                        {
                            $addFields: {
                                commentsCount: { $size: "$commentsList" }, // Add comment count
                                reactionCounts: {
                                    $arrayToObject: {
                                        $map: {
                                            input: {
                                                $reduce: {
                                                    input: "$reactionsList",
                                                    initialValue: [],
                                                    in: {
                                                        $cond: {
                                                            if: { $in: ["$$this.reactionType", "$$value"] },
                                                            then: "$$value",
                                                            else: { $concatArrays: ["$$value", ["$$this.reactionType"]] },
                                                        },
                                                    },
                                                },
                                            },
                                            as: "reactionType",
                                            in: {
                                                k: "$$reactionType",
                                                v: {
                                                    $size: {
                                                        $filter: {
                                                            input: "$reactionsList",
                                                            as: "reaction",
                                                            cond: { $eq: ["$$reaction.reactionType", "$$reactionType"] },
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        {
                            $project: {
                                reactionCounts: 1, // Keep the reaction count
                                commentsCount: 1, // Keep the comment count
                                _id: 1,
                            },
                        },
                    ],
                },
            },
            {
                $addFields: {
                    PostsList: { $slice: ["$PostsList", 10] }, // Limit to first 10 posts
                },
            },
            {
                $project: {
                    _id: 1,
                    username: 1,
                    profilePic: 1,
                    PostsList: 1,
                },
            },
        ]);
    }));

    // Fetch the user's own posts
    const userPosts = await Post.aggregate([
        {
            $match: { user: user._id },
        },
        {
            $lookup: {
                from: "comments",
                localField: "_id",
                foreignField: "post",
                as: "commentsList",
            },
        },
        {
            $lookup: {
                from: "reactions",
                localField: "_id",
                foreignField: "post",
                as: "reactionsList",
            },
        },
        {
            $addFields: {
                commentsCount: { $size: "$commentsList" },
                reactionCounts: {
                    $arrayToObject: {
                        $map: {
                            input: {
                                $reduce: {
                                    input: "$reactionsList",
                                    initialValue: [],
                                    in: {
                                        $cond: {
                                            if: { $in: ["$$this.reactionType", "$$value"] },
                                            then: "$$value",
                                            else: { $concatArrays: ["$$value", ["$$this.reactionType"]] },
                                        },
                                    },
                                },
                            },
                            as: "reactionType",
                            in: {
                                k: "$$reactionType",
                                v: {
                                    $size: {
                                        $filter: {
                                            input: "$reactionsList",
                                            as: "reaction",
                                            cond: { $eq: ["$$reaction.reactionType", "$$reactionType"] },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        {
            $project: {
                username:1,
                profilePic:1,
                commentsCount: 1,
                reactionCounts: 1,
                _id: 1,
            },
        },
    ]);

    // Combine user posts and posts from the followings
    posts = tempPosts.flat();
    posts = posts.concat(userPosts);

    if (!posts.length) {
        return res
            .status(200)
            .json(new ApiResponse(200, { message: "No posts found" }, "Follow people for content!"));
    }

    return res.status(200).json(new ApiResponse(200, posts, "Posts fetched successfully"));
});

















const reactOnPost = asyncHandler(async (req, res) => {

    const postId = req.params.postId;
    const { reaction } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const post = await Post.findById(postId);

    if (!post) {
      throw new ApiError(404, "Post not found");
    }

    const existingReaction = await Reaction.findOne({
      user: userId, 
      post: postId
    });

    if (existingReaction) {
      existingReaction.reaction = reaction;
      await existingReaction.save();
    } else {
      const newReaction = await Reaction.create({
        user: userId,
        post: postId,
        reactionType: reaction
      });

      await newReaction.save();
    }

    return res
      .status(200)
      .json(new ApiResponse(200, { message: "Reaction added successfully" }, "Reaction added successfully"));
});


















const reactedUser = asyncHandler(async (req, res) => {

  const userId = req.user;
    const postId = req.params.postId;
    const {reactionType} = req.body;

    const validReactions = ["heart", "funny", "thumb", "wow"];
  if (!reactionType || typeof reactionType !== "string" || !validReactions.includes(reactionType)) {
    throw new ApiError(400, "Invalid or missing reaction type");
  }
    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const post = await Post.findById(postId);

    if (!post) {
      throw new ApiError(404, "Post not found");
    }

    const isFollowed = await Follow.findOne({
      user: userId,
      following: post.user
    });

    if (!isFollowed) {
      return res
        .status(200)
        .json(new ApiResponse(200, { message: "You are not allowed to see the post!!" }, "You are not following the user"));
    }

    const userReacted = await Reaction.find(
      {
        user: userId,
        post: postId,
        reactionType: reactionType
      }
    );

    if (userReacted.length > 0) {
      return res
        .status(200)
        .json(new ApiResponse(200, userReacted, "User Reacted Fetched successfully"));
    }

   return res
    .status(200)
    .json(new ApiResponse(200, { message: "No Users reacted!!!" }, "User Reacted Fetched successfully"));
});














module.exports = 
{
  createPost, 
  FetchThePost, 
  commentOnPost, 
  FetchAllPosts, 
  reactOnPost,
  reactedUser
};