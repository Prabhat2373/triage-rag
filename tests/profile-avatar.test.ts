import assert from 'node:assert/strict';
import { test } from 'node:test';
import sharp from 'sharp';
import { MAX_AVATAR_BYTES } from '../src/features/accounts/avatar-file';
import { prepareAvatar } from '../src/features/accounts/prepare-avatar';

test('a profile photo is cropped and stored as a small WebP image', async () => {
  const image = await sharp({
    create: { width: 400, height: 300, channels: 3, background: '#6434cb' },
  }).png().toBuffer();
  const storedAvatar = await prepareAvatar(new File([new Uint8Array(image)], 'avatar.png', { type: 'image/png' }));
  assert.match(storedAvatar, /^data:image\/webp;base64,/);

  const metadata = await sharp(Buffer.from(storedAvatar.split(',')[1], 'base64')).metadata();
  assert.equal(metadata.width, 256);
  assert.equal(metadata.height, 256);
  assert.equal(metadata.format, 'webp');
});

test('an oversized or unsupported image cannot be saved as a profile photo', async () => {
  await assert.rejects(
    prepareAvatar(new File([new Uint8Array(MAX_AVATAR_BYTES + 1)], 'large.png', { type: 'image/png' })),
    /750 KB/,
  );
  await assert.rejects(
    prepareAvatar(new File(['<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50"></svg>'], 'photo.png', { type: 'image/png' })),
    /valid JPG, PNG, or WebP/,
  );
});
