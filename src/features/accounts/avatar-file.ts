export const MAX_AVATAR_BYTES = 750 * 1024;
export const AVATAR_ACCEPT = 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp';

export function avatarSizeError(file: File) {
  if (!file.size) return 'Choose a non-empty image.';
  if (file.size > MAX_AVATAR_BYTES) return 'Choose an image no larger than 750 KB.';
  return null;
}
