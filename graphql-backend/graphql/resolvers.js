const bcrypt = require('bcryptjs');
const validator = require('validator');
const jwt = require('jsonwebtoken');

const User = require('../models/user');
const Post = require('../models/post');

const { JetTokenSecret } = require('../utils/constant');
const { clearImage } = require('../utils/file');

module.exports = {
    createUser: async function({userInput}, req) {
        // const email = args.userInput.email;
        const {email, password, name} = userInput;
        const errors = [];
        if(!validator.isEmail(email)) {
            errors.push({message: 'Email is invalid'})
        }
        if(validator.isEmpty(userInput.password) || !validator.isLength(userInput.password, {min: 5})) {
            errors.push({message: 'Password too short'})
        }
        if(errors.length > 0) {
            const error = new Error('Invalid input');
            error.data = errors;
            error.status = 422;
            throw error;
        }
        const existingUser = await User.findOne({email: userInput.email});
        if(existingUser) {
            const error = new Error('User exists already!');
            throw error;
        }
        const hashPw = await bcrypt.hash(userInput.password, 12);
        const user = new User({
            email: userInput.email,
            name: userInput.name,
            password: hashPw,
        });
        const createdUser = await user.save();

        return { ...createdUser._doc, _id: createdUser._id.toString() }
    },
    login: async function({email, password}) {
        const user = await User.findOne({email: email});
        if(!user) {
            const error = new Error('User not found.');
            error.data = errors;
            error.status = 401;
            throw error;
        }
        const isEqual = await bcrypt.compare(password, user.password);
        if(!isEqual) {
            const error = new Error('Password is incorrect.');
            error.data = errors;
            error.status = 401;
            throw error;
        }
        const token = jwt.sign({
            userId: user._id.toString(),
            email: user.email
        }, JetTokenSecret,
        {expiresIn: '1h'});
        return {userId: user._id.toString(), token}
    },
    createPost: async  function({postInput}, req) {
        if(!req.isAuth) {
            const error = new Error('Not authenticated');
            error.code = 401;
            throw error;
        }
        const errors = [];
        if(validator.isEmpty(postInput.title) || !validator.isLength(postInput.title, {min: 5})) {
            errors.push({message: "Title is invalid"})
        }
        if(validator.isEmpty(postInput.content) || !validator.isLength(postInput.content, {min: 5})) {
            errors.push({message: "Content is invalid"})
        }
        if(errors.length > 0) {
            const error = new Error('Invalid input');
            error.data = errors;
            error.status = 422;
            throw error;
        }
        const user = await User.findById(req.userId);
        if(!user) {
            const error = new Error('User not found');
            error.code = 401;
            throw error;
        }
        const post = new Post({
            title: postInput.title,
            content: postInput.content,
            imageUrl: postInput.imageUrl,
            creator: user
        });
        const createdPost = await post.save();
        user.posts.push(createdPost);
        await user.save();
        return {
            ...createdPost._doc,
            id: createdPost._id.toString(),
            createdAt: createdPost.createdAt.toISOString(),
            updatedAt: createdPost.updatedAt.toISOString()
        }
    },
    posts: async function({page}, req) {
        if(!req.isAuth) {
            const error = new Error('Not authenticated');
            error.code = 401;
            throw error;
        }
        if(!page) {
            page = 1;
        }
        const perPage = 2;
        const totalPosts = await Post.find().countDocuments();
        const posts = await Post.find()
            .sort({createdAt: -1})
            .skip((page -1) * perPage)
            .limit(perPage)
            .populate('creator');

        return {
            posts: posts.map(post => {
                return {
                    ...post._doc,
                    _id: post._id.toString(),
                    createdAt: post.createdAt.toISOString(),
                    updatedAt: post.updatedAt.toISOString()
                }
            }),
            totalPosts: totalPosts,
        }
    },
    post: async  function({postId}, req) {
        if(!req.isAuth) {
            const error = new Error('Not authenticated');
            error.code = 401;
            throw error;
        }
        const post = await Post.findById(postId)
                    .populate('creator');;
        if(!post) {
            const error = new Error('Post not found');
            error.code = 422;
            throw error;
        }

        return {
            ...post._doc,
            id: post._id.toString(),
            createdAt: post.createdAt.toISOString(),
            updatedAt: post.updatedAt.toISOString()
        }
    },
    updatePost: async  function({id, postInput}, req) {
        if(!req.isAuth) {
            const error = new Error('Not authenticated');
            error.code = 401;
            throw error;
        }
        const errors = [];
        if(validator.isEmpty(postInput.title) || !validator.isLength(postInput.title, {min: 5})) {
            errors.push({message: "Title is invalid"})
        }
        if(validator.isEmpty(postInput.content) || !validator.isLength(postInput.content, {min: 5})) {
            errors.push({message: "Content is invalid"})
        }
        if(errors.length > 0) {
            const error = new Error('Invalid input');
            error.data = errors;
            error.status = 422;
            throw error;
        }
        const user = await User.findById(req.userId);
        if(!user) {
            const error = new Error('User not found');
            error.code = 401;
            throw error;
        }

        const post = await Post.findById(id).populate('creator')
        if(!post) {
            const error = new Error('Could not find post.');
            error.status = 422;
            throw error;
        }
        if(post.creator._id.toString() !== req.userId.toString()) {
            const error = new Error('Not authorized!.');
            error.status = 403;
            throw error;
        }
        
        post.title = postInput.title;
        post.content = postInput.content;
        if(postInput.imageUrl !== 'undefined') {
            post.imageUrl = postInput.imageUrl;
        }
        const updatedPost = await post.save();
        return {
            ...updatedPost._doc,
            id: updatedPost._id.toString(),
            createdAt: updatedPost.createdAt.toISOString(),
            updatedAt: updatedPost.updatedAt.toISOString()
        }
    },
    deletePost: async  function({id}, req) {
        if(!req.isAuth) {
            const error = new Error('Not authenticated');
            error.code = 401;
            throw error;
        }
        const post = await Post.findById(id).populate('creator')
        if(!post) {
            const error = new Error('Could not find post.');
            error.status = 422;
            throw error;
        }
        if(post.creator._id.toString() !== req.userId.toString()) {
            const error = new Error('Not authorized!.');
            error.status = 403;
            throw error;
        }
        try {
            clearImage(post.imageUrl);
            await Post.findByIdAndRemove(id);
            const user = await User.findById(req.userId);
            user.posts.pull(id);
            await user.save();
            return true;
        }catch(error) {
            console.log("error >>>>>", error);
            return false;
        }
    },
    updateStatus: async  function({status}, req) {
        if(!req.isAuth) {
            const error = new Error('Not authenticated');
            error.code = 401;
            throw error;
        }
        console.log("req.userId>>>>>", req.userId);
        const user = await User.findById(req.userId);
        if(!user) {
            const error = new Error('User not found');
            error.code = 401;
            throw error;
        }
        user.status = status;
        const updatedUser = await user.save();
        return {
            ...updatedUser._doc,
            _id: updatedUser._id.toString(),
        }
    },
    user: async  function(_, req) {
        if(!req.isAuth) {
            const error = new Error('Not authenticated');
            error.code = 401;
            throw error;
        }
        const user = await User.findById(req.userId);
        if(!user) {
            const error = new Error('User not found');
            error.code = 401;
            throw error;
        }

        return {
            ...user._doc,
            _id: user._id.toString(),
        }
    },
}