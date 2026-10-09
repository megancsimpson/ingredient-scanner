import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { checkHealth } from './src/services/api';

export default function App() {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  // Runs once when the app opens
  useEffect(() => {
    checkHealth()
      .then((data) => setStatus(data.status))
      .catch((err) => {
        setError(err.message);
        setStatus('error');
      });
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ingredient Scanner</Text>

      {status === 'loading' && <ActivityIndicator size="large" />}

      {status === 'ok' && <Text style={styles.success}>Backend connected: ok</Text>}

      {status === 'error' && (
        <Text style={styles.error}>Couldn't reach the backend: {error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  success: { fontSize: 18, color: 'green' },
  error: { fontSize: 16, color: 'red', textAlign: 'center' },
});