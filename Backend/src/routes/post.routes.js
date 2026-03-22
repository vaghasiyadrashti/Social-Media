const Router = require('express');
const upload = require('../middlewares/multer.middleware.js');
const router = Router();
const isLoggedIn = require('../middlewares/auth.middleware.js');

const 
{
    createPost,
    FetchThePost,
    commentOnPost,
    FetchAllPosts,
    reactOnPost,
    reactedUser

} = require('../controllers/post.controller.js');



router.route('/create').post(
    isLoggedIn,
    upload.single('media'),
    createPost
);



router.route('/:postId').get(isLoggedIn, FetchThePost);



router.route('/:postId/comment').put(isLoggedIn, commentOnPost);



router.route('/').get(isLoggedIn, FetchAllPosts);



router.route('/:postId/react').put(isLoggedIn, reactOnPost);



router.route('/:postId/react/users').get(isLoggedIn, reactedUser);



module.exports = router;