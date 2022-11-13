const { validationResult } = require('express-validator/check');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/user');
const { JetTokenSecret } = require('../utils/constant');

exports.signup = (req, res, next) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
        const error = new Error('Validation failed')
        error.status = 422;
        error.data = errors.array();
        throw error;
    }
    const {email, name, password} = req.body;

    bcrypt.hash(password, 12).then(hashPw => {
        const user = User({
            email: email,
            password: hashPw,
            name: name
        });
        return user.save();
    }).then(result => {
        res.status(201).json({message: 'User created!', userId: result._id});
    }).catch(err => {
        console.log("signup err >>>", err);
        if(!err.status) {
            err.status = 500;
        }
        next();
    });
}

exports.login = (req, res, next) => {
    const {email, password} = req.body;
    let loadedUser;
    User.findOne({email: email}).then(user => {
        if(!user) {
            const error = new Error('A user with this email could not be found');
            error.status = 401;
            throw error;
        }
        loadedUser = user;
        return bcrypt.compare(password, user.password);
    }).then(isEqual => {
        if(!isEqual) {
            const error = new Error('Wrong password');
            error.status = 401;
            throw error;
        }
        const token = jwt.sign(
            {
            email: loadedUser.email,
            userId: loadedUser._id.toString(),
            },
            JetTokenSecret,
            {expiresIn: '1h'}
        );
        res.status(201).json({ token: token, userId: loadedUser._id.toString() });
    }).catch(err => {
        console.log("signup err >>>", err);
        if(!err.status) {
            err.status = 500;
        }
        next();
    });
}