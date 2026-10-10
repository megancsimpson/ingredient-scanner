import AppTabs from './AppTabs';

/**
 * Chooses which part of the app to show.
 * TODO: once AuthContext exists, show AuthStack (Login/Register) when logged
 * out and AppTabs when logged in. For now there is no login, so it's always
 * AppTabs.
 */
export default function RootNavigator() {
  return <AppTabs />;
}
