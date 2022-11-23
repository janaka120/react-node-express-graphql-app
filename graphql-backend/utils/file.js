const path = require('path');
const fs = require('fs');

const clearImage = (filePath) => {
    filePath = path.join(__dirname, '../', filePath);
    // delete file
    fs.unlink(filePath, err => console.log("file delete err" >> err))
}

exports.clearImage = clearImage