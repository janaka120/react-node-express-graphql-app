const {validationResult} = require('express-validator/check');

const user = require('../models/user');
const UserShcema = require('../models/user');

exports.getStatus = (req, res, next) => {
    const userId = req.userId;
    UserShcema.findById(userId).then(user => {
        if(!user) {
            const error = new Error('User not found!');
            error.status = 402;
            throw error;
        }
        return res.status(200).json({message: 'user status fetch successfully!', status: user.status});
    }).catch(err => {
        console.log("Create post err >>>", err);
        if(!err.status) {
            err.status = 500;
        }
        next();
    })
}

exports.postStatus = (req, res, next) => {
    const userId = req.userId;
    const status = req.body.status;
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
        const error = new Error('Validation failed, status can not be empty!.');
        error.status = 422;
        throw error;
    }
    UserShcema.findById(userId).then(user => {
        if(!user) {
            const error = new Error('User not found!');
            error.status = 402;
            throw error;
        }
        user.status = status;
        return user.save();
    }).then(result => {
        return res.status(200).json({message: 'User status updated!', user: result});
    })
    .catch(error => {
        console.log("postStatus error >>>", error);
        if(!error.status) {
            error.status = 500;
        }
        next();
    })
}