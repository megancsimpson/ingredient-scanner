import { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import Button from '../components/Button';
import LoadingOverlay from '../components/LoadingOverlay';
import { readIngredientPhoto } from '../services/api';
import { preparePhoto } from '../utils/preparePhoto';

/**
 * Takes a photo of an ingredient list (or picks one from the photo
 * library), reads its text on the server, and opens ReviewTextScreen so
 * the user can fix any mistakes before it's analyzed.
 *
 * expo-camera can't focus on a tapped spot, and phone cameras can't focus
 * closer than about 15-20 cm, so small labels can come out blurry. "Use
 * your phone's camera" opens the phone's own Camera, which has
 * tap-to-focus and close-up handling, and reads that photo the same way.
 */
export default function CameraScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  // Only one camera preview can run at a time, and it uses battery, so the
  // camera is only shown while this screen is the one on top
  const isFocused = useIsFocused();

  const [cameraReady, setCameraReady] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [reading, setReading] = useState(false);
  // True while the phone's own Camera is open (see openPhoneCamera)
  const [phoneCameraOpen, setPhoneCameraOpen] = useState(false);

  // The preview restarts when the user comes back to this screen, so the
  // shutter waits for it to be ready again
  useEffect(() => {
    if (!isFocused) setCameraReady(false);
  }, [isFocused]);

  // Shrinks the photo, sends it for OCR and moves on to the review step
  async function readPhoto(photo) {
    setReading(true);
    try {
      const base64 = await preparePhoto(photo);
      const { text, ingredientsFound } = await readIngredientPhoto(base64);
      setTorchOn(false);
      navigation.navigate('ReviewText', { source: 'photo', initialText: text, ingredientsFound });
    } catch (err) {
      Alert.alert("Couldn't read the photo", err.message);
    } finally {
      setReading(false);
    }
  }

  async function takePhoto() {
    if (!cameraRef.current || !cameraReady || reading) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 1 });
      await readPhoto(photo);
    } catch (err) {
      Alert.alert("Couldn't take the photo", err.message);
    }
  }

  async function choosePhoto() {
    // Opening the photo library doesn't need a permission prompt: the
    // system picker only shares the photo the user chooses
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (!result.canceled) await readPhoto(result.assets[0]);
  }

  async function openPhoneCamera() {
    const { granted, canAskAgain } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) {
      Alert.alert(
        'Camera access needed',
        'Allow Ingredient Scanner to use your camera to photograph ingredient lists.',
        canAskAgain
          ? [{ text: 'OK' }]
          : [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ]
      );
      return;
    }

    // Only one camera can run at a time, so this screen's preview is turned
    // off while the phone's Camera is open
    setPhoneCameraOpen(true);
    setTorchOn(false);
    try {
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
      if (!result.canceled) await readPhoto(result.assets[0]);
    } finally {
      setPhoneCameraOpen(false);
    }
  }

  // Still checking whether the camera is allowed
  if (!permission) return <View style={styles.screen} />;

  // Camera not allowed: explain why it's needed, and offer the photo library
  if (!permission.granted) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Ionicons name="camera-outline" size={48} color="#fff" />
        <Text style={styles.permissionTitle}>Camera access needed</Text>
        <Text style={styles.permissionText}>
          To photograph an ingredient list, allow Ingredient Scanner to use your camera.
        </Text>
        <View style={styles.permissionButtons}>
          {permission.canAskAgain ? (
            <Button title="Allow camera" onPress={requestPermission} />
          ) : (
            // The user said no before, so the phone won't ask again; it can
            // only be turned on in Settings
            <Button title="Open Settings" onPress={() => Linking.openSettings()} />
          )}
          <Button title="Choose a photo instead" variant="secondary" onPress={choosePhoto} />
        </View>
        {reading && <LoadingOverlay message="Reading ingredients…" />}
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {isFocused && !phoneCameraOpen && (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torchOn}
          onCameraReady={() => setCameraReady(true)}
        />
      )}

      {/* A frame to line the ingredient list up with, centered on the
          screen. The tip hangs above it without moving it; the space below
          is kept for the "use your phone's camera" button. */}
      <View style={styles.guide} pointerEvents="none">
        <View style={styles.frame}>
          <Text style={[styles.tip, styles.tipAbove]}>
            Fill the frame with the ingredient list, in good light
          </Text>
        </View>
      </View>

      <Pressable
        onPress={openPhoneCamera}
        style={({ pressed }) => [styles.phoneCamera, pressed && styles.shutterPressed]}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityHint="Opens your phone's Camera, which can focus on small print"
      >
        <Text style={styles.phoneCameraText}>Blurry? Use your phone's camera</Text>
      </Pressable>

      <View style={styles.controls}>
        <ControlButton icon="images-outline" label="Choose a photo" onPress={choosePhoto} />

        <Pressable
          onPress={takePhoto}
          disabled={!cameraReady || reading}
          style={({ pressed }) => [styles.shutter, pressed && styles.shutterPressed]}
          accessibilityRole="button"
          accessibilityLabel="Take photo"
        >
          <View style={styles.shutterInner} />
        </Pressable>

        <ControlButton
          icon={torchOn ? 'flash' : 'flash-off-outline'}
          label={torchOn ? 'Turn flashlight off' : 'Turn flashlight on'}
          onPress={() => setTorchOn((current) => !current)}
        />
      </View>

      {reading && <LoadingOverlay message="Reading ingredients…" />}
    </View>
  );
}

/** A round icon button beside the shutter */
function ControlButton({ icon, label, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.control}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={26} color="#fff" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  permissionTitle: { color: '#fff', fontSize: 20, fontWeight: '600', marginTop: 12 },
  permissionText: { color: '#ddd', fontSize: 15, textAlign: 'center', marginTop: 8, lineHeight: 21 },
  permissionButtons: { alignSelf: 'stretch', gap: 12, marginTop: 24 },
  guide: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: '85%',
    // Leaves room between the frame and the buttons below it, even on small
    // phones
    height: '45%',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 12,
  },
  // Positioned outside the frame's top edge, so the frame stays centered
  tipAbove: { position: 'absolute', bottom: '100%', marginBottom: 10, alignSelf: 'center' },
  tip: {
    color: '#fff',
    fontSize: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden', // needed for the rounded corners on iOS
  },
  controls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  control: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterPressed: { opacity: 0.7 },
  // Sits just above the shutter row
  phoneCamera: {
    position: 'absolute',
    bottom: 116,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  phoneCameraText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff' },
});
