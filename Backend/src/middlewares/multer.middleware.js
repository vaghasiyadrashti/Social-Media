const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = './public/uploads';

// Ensure the upload directory exists
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },

    filename: function (req, file, cb) {
        crypto.randomBytes(12, function (err, hash) {
            if (err) {
                return cb(err);
            }
            const fn = hash.toString('hex') + path.extname(file.originalname);
            cb(null, fn);
        });
    },
});

// const upload = multer({ storage: storage });

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 },  // 10MB limit
});


module.exports = upload;
