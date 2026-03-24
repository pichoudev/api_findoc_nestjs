"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.multerOptions = void 0;
const multer_1 = require("multer");
exports.multerOptions = {
    storage: (0, multer_1.memoryStorage)(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, callback) => {
        console.log('Multer - File filter check:', {
            mimetype: file.mimetype,
            originalname: file.originalname,
            size: file.size,
            hasBuffer: !!file.buffer
        });
        if (file.mimetype.startsWith('image/')) {
            console.log('Multer - File accepted');
            callback(null, true);
        }
        else {
            console.log('Multer - File rejected - not an image');
            callback(new Error('Seules les images sont autorisées'), false);
        }
    },
};
//# sourceMappingURL=multer.config.js.map