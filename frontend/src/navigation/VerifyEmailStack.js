import { createNativeStackNavigator } from '@react-navigation/native-stack';
import VerifyEmailScreen from '../screens/VerifyEmailScreen';

const Stack = createNativeStackNavigator();

/**
 * Shown when logged in but the email isn't verified yet. A stack with one
 * screen, so it gets the same header and safe-area handling as the others.
 */
export default function VerifyEmailStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="VerifyEmail"
        component={VerifyEmailScreen}
        options={{ title: 'Verify your email' }}
      />
    </Stack.Navigator>
  );
}
