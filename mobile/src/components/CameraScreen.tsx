import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

type ReceiptPhoto = {
  uri: string;
};

type CameraScreenProps = {
  onClose: () => void;
  onUsePhoto: (photoUri: string) => void;
};

export function CameraScreen({ onClose, onUsePhoto }: CameraScreenProps) {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState<ReceiptPhoto | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  async function handleTakePhoto() {
    if (!cameraRef.current || isCapturing) {
      return;
    }

    setIsCapturing(true);

    try {
      const nextPhoto = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        shutterSound: false,
        skipProcessing: false,
      });

      if (nextPhoto) {
        setPhoto({ uri: nextPhoto.uri });
      }
    } finally {
      setIsCapturing(false);
    }
  }

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.title}>Kamera izni gerekli.</Text>
        <Text style={styles.subtitle}>
          Fis fotografi cekebilmek icin kameraya erisim vermen gerekiyor.
        </Text>

        <Pressable onPress={requestPermission} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Izin ver</Text>
        </Pressable>

        <Pressable onPress={onClose} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Geri don</Text>
        </Pressable>
      </View>
    );
  }

  if (photo) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: photo.uri }} style={styles.previewImage} />

        <View style={styles.previewActions}>
          <Pressable onPress={() => setPhoto(null)} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Tekrar cek</Text>
          </Pressable>
          <Pressable onPress={() => onUsePhoto(photo.uri)} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Fotografi kullan</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} facing="back" style={styles.camera} />

      <View style={styles.topBar}>
        <Pressable onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>Kapat</Text>
        </Pressable>
      </View>

      <View style={styles.captureArea}>
        <View style={styles.receiptFrame} />
      </View>

      <View style={styles.bottomControls}>
        <View style={styles.captureControls}>
          <Pressable
            disabled={isCapturing}
            onPress={handleTakePhoto}
            style={({ pressed }) => [
              styles.captureButton,
              pressed && styles.pressed,
              isCapturing && styles.disabled,
            ]}
          >
            <View style={styles.captureButtonInner} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#07110d',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 14,
    padding: 24,
    backgroundColor: '#f7faf8',
  },
  title: {
    color: '#12231d',
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 36,
  },
  subtitle: {
    color: '#52645d',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 14,
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  topBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 20,
    elevation: 20,
    paddingHorizontal: 20,
    paddingTop: 48,
    alignItems: 'flex-start',
  },
  closeButton: {
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(7, 17, 13, 0.72)',
    paddingHorizontal: 14,
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  captureArea: {
    ...StyleSheet.absoluteFillObject,
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 174,
    zIndex: 5,
    elevation: 5,
  },
  captureControls: {
    alignItems: 'center',
    gap: 14,
  },
  bottomControls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 30,
    elevation: 30,
    alignItems: 'center',
    backgroundColor: 'rgba(7, 17, 13, 0.82)',
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 26,
  },
  receiptFrame: {
    position: 'absolute',
    top: 116,
    bottom: 204,
    width: '86%',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.82)',
    borderRadius: 8,
  },
  captureButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  captureButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ffffff',
  },
  previewImage: {
    flex: 1,
    resizeMode: 'contain',
  },
  previewActions: {
    gap: 12,
    padding: 20,
    backgroundColor: '#f7faf8',
  },
  primaryButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#21725e',
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#21725e',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: '#21725e',
    fontSize: 16,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.65,
  },
});
