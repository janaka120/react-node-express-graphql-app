const jwt = require('jsonwebtoken');
const { JetTokenSecret } = require('../utils/constant');


module.exports = (req, res, next) => {
    const authHeader = req.get('Authorization');
    if(!authHeader) {
        req.isAuth = false;
        return next();
    }
    const token = authHeader.split(' ')[1];
    let decodeedToken;
    try {
        decodeedToken  = jwt.verify(token, JetTokenSecret)
    }catch(error) {
        req.isAuth = false;
        return next();
    }
    if(!decodeedToken) {
        req.isAuth = false;
        return next();
    }
    req.userId = decodeedToken.userId;
    req.isAuth = true;
    next();
}