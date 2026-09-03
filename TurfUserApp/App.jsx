import React, { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { store } from './src/redux/store';
import RootNavigator from './src/navigation/RootNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import { COLORS } from './src/utils/theme';
import NoInternetScreen from './src/screens/NoInternetScreen';
import NetInfo from '@react-native-community/netinfo';
import { initCustomAlert } from './src/utils/customAlert';
import { CustomAlertModal } from './src/components/CustomAlertModal';

// Initialize global Alert.alert replacement
initCustomAlert();

export default function App() {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected ?? true);
    });
    return () => unsubscribe();
  }, []);

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
        {isConnected ? <RootNavigator /> : <NoInternetScreen />}
        <CustomAlertModal />
      </SafeAreaProvider>
    </Provider>
  );
}