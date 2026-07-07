import { Injectable, BadRequestException } from '@nestjs/common';

/**
 * File upload service.
 * In production, uploads files to Tencent Cloud COS.
 * In dev mode, stores as base64 placeholder.
 */
@Injectable()
export class UploadService {
  private readonly maxSize = 5 * 1024 * 1024; // 5MB

  async uploadFile(file: Express.Multer.File, userId: number) {
    if (!file) throw new BadRequestException('未选择文件');

    if (file.size > this.maxSize) {
      throw new BadRequestException('文件大小不能超过5MB');
    }

    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('只支持图片格式');
    }

    // In production: upload to Tencent Cloud COS and return CDN URL
    // For now: return base64 data URL
    const base64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

    return {
      url: base64,
      name: file.originalname,
      size: file.size,
      type: file.mimetype,
    };
  }
}
