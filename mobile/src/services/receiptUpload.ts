import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { supabase } from '../lib/supabase';

const RECEIPT_BUCKET = 'receipt-images';

export type ReceiptUploadResult = {
  path: string;
  publicUrl: string;
};

function createReceiptImagePath(userId: string) {
  return `${userId}/${Date.now()}.jpg`;
}

async function compressReceiptImage(photoUri: string) {
  const context = ImageManipulator.manipulate(photoUri);
  context.resize({ width: 1400 });

  const image = await context.renderAsync();

  return image.saveAsync({
    compress: 0.78,
    format: SaveFormat.JPEG,
  });
}

export async function uploadReceiptImage(photoUri: string, userId: string): Promise<ReceiptUploadResult> {
  if (!supabase) {
    throw new Error('Supabase env bilgileri eklenmeden upload calismaz.');
  }

  const compressedImage = await compressReceiptImage(photoUri);
  const imageResponse = await fetch(compressedImage.uri);
  const imageData = await imageResponse.arrayBuffer();
  const path = createReceiptImagePath(userId);

  const { error } = await supabase.storage.from(RECEIPT_BUCKET).upload(path, imageData, {
    contentType: 'image/jpeg',
    upsert: false,
  });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from(RECEIPT_BUCKET).getPublicUrl(path);

  return {
    path,
    publicUrl: data.publicUrl,
  };
}
