import { PipeTransform } from '@nestjs/common';
export declare class SharpPipe implements PipeTransform<Express.Multer.File, Promise<string>> {
    transform(image: Express.Multer.File): Promise<string>;
}
