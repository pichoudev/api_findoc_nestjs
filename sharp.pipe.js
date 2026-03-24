"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SharpPipe = void 0;
const common_1 = require("@nestjs/common");
const sharp_1 = __importDefault(require("sharp"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
let SharpPipe = class SharpPipe {
    async transform(image) {
        console.log('SharpPipe - Input received:', {
            hasImage: !!image,
            hasBuffer: !!image?.buffer,
            bufferLength: image?.buffer?.length,
            mimetype: image?.mimetype,
            originalname: image?.originalname,
            size: image?.size
        });
        if (!image) {
            console.log('SharpPipe - No image provided');
            throw new common_1.BadRequestException('Aucun fichier fourni');
        }
        if (!image.buffer) {
            console.log('SharpPipe - No buffer in image');
            throw new common_1.BadRequestException('Fichier vide ou corrompu');
        }
        if (!image.mimetype || !image.mimetype.startsWith('image/')) {
            console.log('SharpPipe - Invalid mimetype:', image.mimetype);
            throw new common_1.BadRequestException('Le fichier doit être une image');
        }
        if (image.buffer.length === 0) {
            console.log('SharpPipe - Empty buffer');
            throw new common_1.BadRequestException('Le buffer de l\'image est vide');
        }
        if (image.buffer.length < 100) {
            console.log('SharpPipe - Buffer too small:', image.buffer.length);
            throw new common_1.BadRequestException('L\'image semble trop petite pour être valide');
        }
        console.log('SharpPipe - Validations passed, processing image...');
        try {
            const originalName = path.parse(image.originalname).name.replace(/\s+/g, '-');
            const filename = `${Date.now()}-${originalName}.webp`;
            const outputPath = path.join('dist', 'uploads', 'compressed', filename);
            const outputDir = path.dirname(outputPath);
            console.log('SharpPipe - Processing:', {
                originalName,
                filename,
                outputPath,
                outputDir
            });
            if (!fs.existsSync(outputDir)) {
                console.log('SharpPipe - Creating directory:', outputDir);
                fs.mkdirSync(outputDir, { recursive: true });
            }
            const metadata = await (0, sharp_1.default)(image.buffer).metadata();
            console.log('SharpPipe - Image metadata:', metadata);
            if (!metadata.width || !metadata.height) {
                throw new common_1.BadRequestException('L\'image n\'a pas de dimensions valides');
            }
            await (0, sharp_1.default)(image.buffer)
                .resize(800, 800, {
                fit: 'inside',
                withoutEnlargement: true
            })
                .webp({
                quality: 75,
                effort: 6
            })
                .toFile(outputPath);
            console.log('SharpPipe - Image processed successfully:', filename);
            return filename;
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            console.error('Sharp processing error:', error);
            throw new common_1.BadRequestException('Erreur lors du traitement de l\'image: ' + error.message);
        }
    }
};
exports.SharpPipe = SharpPipe;
exports.SharpPipe = SharpPipe = __decorate([
    (0, common_1.Injectable)()
], SharpPipe);
//# sourceMappingURL=sharp.pipe.js.map