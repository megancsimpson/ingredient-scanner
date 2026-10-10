import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ScanHomeScreen from '../screens/ScanHomeScreen';
import ReviewTextScreen from '../screens/ReviewTextScreen';
import ResultsScreen from '../screens/ResultsScreen';

const Tab = createBottomTabNavigator();
const ScanStack = createNativeStackNavigator();

/**
 * The Scan tab's own stack of screens. Each tab has its own stack, so
 * switching tabs keeps your place in this one.
 * TODO: CameraScreen and SaveProductModal
 */
function ScanStackScreen() {
  return (
    <ScanStack.Navigator>
      <ScanStack.Screen name="ScanHome" component={ScanHomeScreen} options={{ title: 'Scan' }} />
      <ScanStack.Screen
        name="ReviewText"
        component={ReviewTextScreen}
        options={{ title: 'Ingredient list' }}
      />
      <ScanStack.Screen name="Results" component={ResultsScreen} options={{ title: 'Results' }} />
    </ScanStack.Navigator>
  );
}

/**
 * The bottom tabs shown when logged in.
 * TODO: Saved, Ingredients and Profile tabs
 */
export default function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        // Each tab's stack shows its own header, so the tab navigator's is hidden
        headerShown: false,
        tabBarActiveTintColor: '#2f6f5e',
        // On Android the tab bar would otherwise sit on top of the keyboard,
        // taking space from the screen (e.g. the ingredient text box)
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen name="ScanTab" component={ScanStackScreen} options={{ title: 'Scan' }} />
    </Tab.Navigator>
  );
}
