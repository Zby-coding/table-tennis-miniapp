import { Injectable, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

/**
 * File upload service.
 * In production, uploads files to Tencent Cloud COS.
 * In dev mode, writes files to local disk under uploads/ directory.
 */
@Injectable()
export class UploadService {
  private readonly maxSize = 5 * 1024 * 1024; // 5MB
  private readonly uploadDir = path.join(process.cwd(), 'uploads');

  async uploadFile(file: Express.Multer.File, _userId: number) {
    if (!file) throw new BadRequestException('未选择文件');

    if (file.size > this.maxSize) {
      throw new BadRequestException('文件大小不能超过5MB');
    }

    const mime = (file.mimetype || '').toLowerCase();
    if (!mime.startsWith('image/') || mime === 'image/svg+xml' || mime.includes('svg')) {
      throw new BadRequestException('只支持 JPG/PNG/WebP 图片');
    }

    const fromName = path.extname(file.originalname || '').toLowerCase();
    if (fromName === '.svg' || fromName === '.html' || fromName === '.htm' || fromName === '.xml') {
      throw new BadRequestException('不支持的文件类型');
    }

    const sniffed = this.sniffImageExt(file.buffer);
    const byMime = MIME_TO_EXT[mime];
    const ext = sniffed || byMime || (ALLOWED_EXT.has(fromName) ? fromName : null);
    if (!ext || !ALLOWED_EXT.has(ext)) {
      throw new BadRequestException('只支持 JPG/PNG/WebP 图片');
    }

    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }

    const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    fs.writeFileSync(path.join(this.uploadDir, filename), file.buffer);

    return {
      url: `/uploads/${filename}`,
      name: file.originalname,
      size: file.size,
      type: mime,
    };
  }

  /** Magic-byte sniff for common raster formats; returns null if unknown. */
  private sniffImageExt(buf: Buffer): string | null {
    if (!buf || buf.length < 12) return null;
    // JPEG
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return '.jpg';
    // PNG
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return '.png';
    // WebP: RIFF....WEBP
    if (
      buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
    ) {
      return '.webp';
    }
    return null;
  }
}
