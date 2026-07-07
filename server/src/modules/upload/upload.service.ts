import { Injectable, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

/**
 * File upload service.
 * In production, uploads files to Tencent Cloud COS.
 * In dev mode, writes files to local disk under uploads/ directory.
 */
@Injectable()
export class UploadService {
  private readonly maxSize = 5 * 1024 * 1024; // 5MB
  private readonly uploadDir = path.join(process.cwd(), 'uploads');

  async uploadFile(file: Express.Multer.File, userId: number) {
    if (!file) throw new BadRequestException('未选择文件');

    if (file.size > this.maxSize) {
      throw new BadRequestException('文件大小不能超过5MB');
    }

    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('只支持图片格式');
    }

    // In production: upload to Tencent Cloud COS and return CDN URL
    // For now: write to local disk and return a URL path
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }

    const ext = path.extname(file.originalname) || '.png';
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    fs.writeFileSync(path.join(this.uploadDir, filename), file.buffer);

    return {
      url: `/uploads/${filename}`,
      name: file.originalname,
      size: file.size,
      type: file.mimetype,
    };
  }
}
