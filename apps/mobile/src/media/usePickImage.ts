import { useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';

export interface PickedImage {
  uri: string;
  type: string;
  size: number;
}

/**
 * Pick one image from the gallery.
 *
 * Quality is capped at 0.7 and the longest edge is left to the OS: the two
 * things this is used for — listing photos and payment receipts — are both
 * viewed on a phone, and a 12MP original costs the agent real money in data to
 * upload for no visible gain.
 */
export function usePickImage() {
  return useCallback(async (): Promise<PickedImage | null> => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return null;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsMultipleSelection: false,
    });
    if (result.canceled) return null;

    const asset = result.assets[0];
    if (!asset) return null;

    return {
      uri: asset.uri,
      type: asset.mimeType ?? 'image/jpeg',
      size: asset.fileSize ?? 0,
    };
  }, []);
}
