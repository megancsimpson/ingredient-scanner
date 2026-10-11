import { Platform, Pressable, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import ScanHomeScreen from '../screens/ScanHomeScreen';
import ReviewTextScreen from '../screens/ReviewTextScreen';
import ResultsScreen from '../screens/ResultsScreen';
import SaveProductModal from '../screens/SaveProductModal';
import SavedProductsScreen from '../screens/SavedProductsScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import EditProductModal from '../screens/EditProductModal';
import IngredientSearchScreen from '../screens/IngredientSearchScreen';
import IngredientDetailScreen from '../screens/IngredientDetailScreen';
import ProfileScreen from '../screens/ProfileScreen';
import FlaggingGuideScreen from '../screens/FlaggingGuideScreen';
import AboutScreen from '../screens/AboutScreen';

const Tab = createBottomTabNavigator();
const ScanStack = createNativeStackNavigator();
const SavedStack = createNativeStackNavigator();
const IngredientsStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();

/**
 * Screen options for a form shown as a modal: a sheet that slides up on
 * iOS, a normal screen on Android. iOS modals have no back button, so a
 * Cancel button is added (the sheet can also be swiped down); Android shows
 * its usual back arrow.
 */
function modalOptions(title) {
  return ({ navigation }) => ({
    title,
    presentation: 'modal',
    headerLeft:
      Platform.OS === 'ios'
        ? () => (
            <Pressable onPress={navigation.goBack} hitSlop={10} accessibilityRole="button">
              <Text style={{ color: '#2f6f5e', fontSize: 17 }}>Cancel</Text>
            </Pressable>
          )
        : undefined,
  });
}

/**
 * The Scan tab's own stack of screens. Each tab has its own stack, so
 * switching tabs keeps your place in this one.
 * TODO: CameraScreen
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
      <ScanStack.Screen
        name="SaveProduct"
        component={SaveProductModal}
        options={modalOptions('Save product')}
      />
    </ScanStack.Navigator>
  );
}

/**
 * The Saved tab's stack.
 */
function SavedStackScreen() {
  return (
    <SavedStack.Navigator>
      <SavedStack.Screen
        name="SavedProducts"
        component={SavedProductsScreen}
        options={{ title: 'Saved products' }}
      />
      <SavedStack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        // Replaced with the product's name once it loads
        options={{ title: 'Product' }}
      />
      <SavedStack.Screen
        name="EditProduct"
        component={EditProductModal}
        options={modalOptions('Edit product')}
      />
    </SavedStack.Navigator>
  );
}

/**
 * The Ingredients tab's stack.
 */
function IngredientsStackScreen() {
  return (
    <IngredientsStack.Navigator>
      <IngredientsStack.Screen
        name="IngredientSearch"
        component={IngredientSearchScreen}
        options={{ title: 'Ingredients' }}
      />
      <IngredientsStack.Screen
        name="IngredientDetail"
        component={IngredientDetailScreen}
        // Replaced with the ingredient's name once it loads
        options={{ title: 'Ingredient' }}
      />
    </IngredientsStack.Navigator>
  );
}

/**
 * The Profile tab's stack.
 */
function ProfileStackScreen() {
  return (
    <ProfileStack.Navigator>
      <ProfileStack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
      <ProfileStack.Screen
        name="FlaggingGuide"
        component={FlaggingGuideScreen}
        options={{ title: 'How flagging works' }}
      />
      <ProfileStack.Screen name="About" component={AboutScreen} options={{ title: 'About' }} />
    </ProfileStack.Navigator>
  );
}

// Tab icon for each tab: outline when inactive, filled when selected
const TAB_ICONS = {
  ScanTab: ['scan', 'scan-outline'],
  SavedTab: ['bookmark', 'bookmark-outline'],
  IngredientsTab: ['flask', 'flask-outline'],
  ProfileTab: ['person', 'person-outline'],
};

/**
 * The bottom tabs shown when logged in.
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
      <Tab.Screen name="SavedTab" component={SavedStackScreen} options={{ title: 'Saved' }} />
      <Tab.Screen
        name="IngredientsTab"
        component={IngredientsStackScreen}
        options={{ title: 'Ingredients' }}
      />
      <Tab.Screen name="ProfileTab" component={ProfileStackScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}
