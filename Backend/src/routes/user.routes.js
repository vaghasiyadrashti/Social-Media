const Router = require('express');
const upload = require('../middlewares/multer.middleware.js');
const router = Router();
const isLoggedIn = require('../middlewares/auth.middleware.js');



const 
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
    
} = require('../controllers/user.controller.js'); 



router.route('/register').post(upload.fields([
    {name: 'profilePic', maxCount: 1},
]) , registerUser);



router.route('/login').post(loginUser);



router.route('/logout').patch(isLoggedIn,logoutUser);



router.route('/refresh').post(refreshAccessToken);



router.route('/editProfile').patch(isLoggedIn, upload.fields([
    {name: 'profilePic', maxCount: 1},
]), editUserDetails);



router.route('/editPassword').patch(editUserPassword);



router.route('/:username').get(isLoggedIn, fetchProfile);



router.route('/:username/followers').get(isLoggedIn, fetchFollowers);



router.route('/:username/following').get(isLoggedIn, fetchFollowings);



router.route('/:username/follow').post(isLoggedIn, followUser);



router.route('/:username/unfollow').put(isLoggedIn, unfollowUser);




router.route('/temp').get(tempUser);



module.exports = router;