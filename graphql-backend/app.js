const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { graphqlHTTP } = require('express-graphql');

const constants = require('./utils/constant');
const graphqlSchema = require('./graphql/schema');
const graphqlResolver = require('./graphql/resolvers');
const auth = require('./middleware/auth');
const { clearImage } = require('./utils/file');

const MONGODB_URL = constants.mongoDbUrl;

const app = express();

 
const fileStorage = multer.diskStorage({
    destination: 'images',
    filename: (req, file, cb) => {
    //   const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uuidv4() + '-' + file.originalname)
    }
  })

const fileFilter = (req, file, cb) => {
    if(file.mimetype === 'image/png' || file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg') {
        cb(null, true);
    }else {
        cb(null, false);
    }
}

// app.use(bodyParser.urlencoded()); // x-www-form-urlencoded <form>
app.use(bodyParser.json());
app.use('/images', express.static(path.join(__dirname, 'images')));

app.use(multer({storage: fileStorage, fileFilter: fileFilter}).single('image'));

app.use((req, res, next) => {
    // res.setHeader('Access-Controller-Allow-Origin', '*');
    // res.setHeader('Access-Controller-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE');
    // res.setHeader('Access-Controller-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader("X-Frame-Options", "ALLOWALL");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", 'GET, POST, PUT, PATCH, DELETE');
    res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization"); // headers allow for request
    // solution to fix graphql api request OPTION call blocked
    if(req.method === 'OPTIONS') {
        return res.sendStatus(200)
    }
    next();
});

app.use(auth);

app.put('/post-image', (req, res, next) => {
    if(!req.isAuth) {
        const error = new Error('Not authenticated');
        error.code = 401;
        throw error;
    }
    if(!req.file) {
        return res.status(200).json({message: "No file provided!"})
    }
    if(req.body.oldPath) {
        clearImage(req.body.oldPath)
    }

    return res.status(200).json({message: "File stroed", filePath: req.file.path})
});


app.use('/graphql', graphqlHTTP({
    schema: graphqlSchema,
    rootValue: graphqlResolver,
    graphiql: true,
    customFormatErrorFn(err) {
        if(!err.originalError) {
            return err;
        }
        const data = err.originalError.data;
        const message = err.message || "An error occured";
        const status = err.originalError.status || 500;
        return {
            message, status, data
        }
    }
}))

app.use((error, req, res, next) => {
    console.log('common error middleware >>>', error);
    const status = error.status || 500;
    const message = error.message;
    const data = error.data;
    res.status(status).json({message: message, data: data})
});

// app.listen(8080);

// *** use mongoose code base
mongoose.connect(MONGODB_URL)
.then(result => {
    app.listen(8080);
    console.log('connected to port 8080');
}).catch(err => {
    console.log(err);
});

