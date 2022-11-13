const jwt = require('jsonwebtoken');
const { JetTokenSecret } = require('../utils/constant');


module.exports = (req, res, next) => {
    const authHeader = req.get('Authorization');
    if(!authHeader) {
        const err = new Error('Not authenticated');
        err.status = 401;
        throw err;
    }
    const token = authHeader.split(' ')[1];
    let decodeedToken;
    try {
        decodeedToken  = jwt.verify(token, JetTokenSecret)
    }catch(error) {
        console.log("is auth error >>>", error);
        error.status = 500;
        throw error;
    }
    if(!decodeedToken) {
        const err = new Error('Not authenticated');
        err.status = 401;
        throw err;
    }
    req.userId = decodeedToken.userId;
    next();
}