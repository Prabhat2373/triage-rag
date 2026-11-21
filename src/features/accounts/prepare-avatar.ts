import sharp from 'sharp';
import { avatarSizeError } from './avatar-file';

const MAX_AVATAR_PIXELS = 16_000_000;

export async function prepareAvatar(file: File) {
  const sizeError = avatarSizeError(file);
  if (sizeError) throw new Error(sizeError);

  try {
    const image = sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: MAX_AVATAR_PIXELS, failOn: 'warning' });
    const { format } = await image.metadata();
    if (format !== 'jpeg' && format !== 'png' && format !== 'webp') throw new Error('Unsupported format');

    const avatar = await image.autoOrient().resize(256, 256, { fit: 'cover' }).webp({ quality: 82 }).toBuffer();
    return `data:image/webp;base64,${avatar.toString('base64')}`;
  } catch {
    throw new Error('Choose a valid JPG, PNG, or WebP image under 16 megapixels.');
  }
}
