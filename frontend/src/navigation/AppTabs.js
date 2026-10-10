import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import ScanHomeScreen from '../screens/ScanHomeScreen';
import ReviewTextScreen from '../screens/ReviewTextScreen';
import ResultsScreen from '../screens/ResultsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();
const ScanStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();

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
 * The Profile tab's stack.
 * TODO: FlaggingGuideScreen and AboutScreen
 */
function ProfileStackScreen() {
  return (
    <ProfileStack.Navigator>
      <ProfileStack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </ProfileStack.Navigator>
  );
}

// Tab icon for each tab: outline when inactive, filled when selected
const TAB_ICONS = {
  ScanTab: ['scan', 'scan-outline'],
  ProfileTab: ['person', 'person-outline'],
};

/**
 * The bottom tabs shown when logged in.
 * TODO: Saved and Ingredients tabs
 */
export default function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        // Each tab's stack shows its own header, so the tab navigator's is hidden
        headerShown: false,
        tabBarActiveTintColor: '#2f6f5e',
        // On Android the tab bar would otherwise sit on top of the keyboard,
        // taking space from the screen (e.g. the ingredient text box)
        tabBarHideOnKeyboard: true,
        tabBarIcon: ({ focused, color, size }) => {
          const [filled, outline] = TAB_ICONS[route.name];
          return <Ionicons name={focused ? filled : outline} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="ScanTab" component={ScanStackScreen} options={{ title: 'Scan' }} />
      <Tab.Screen name="ProfileTab" component={ProfileStackScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}
