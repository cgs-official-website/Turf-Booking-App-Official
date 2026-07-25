// import React from 'react';
// import { Provider } from 'react-redux';
// import { store } from './src/redux/store';
// import RootNavigator from './src/navigation/RootNavigator';
// import { SafeAreaProvider } from 'react-native-safe-area-context';
// import { StatusBar } from 'react-native';
// import { COLORS } from './src/utils/theme';

// export default function App() {
//   return (
//     <Provider store={store}>
//       <SafeAreaProvider>
//         <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
//         <RootNavigator />
//       </SafeAreaProvider>
//     </Provider>
//   );
// }

import React from 'react';
import { Provider } from 'react-redux';
import { store } from './src/redux/store';
import RootNavigator from './src/navigation/RootNavigator';
import { StatusBar } from 'react-native';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

// Small inner component so it can read the theme via the hook
// (StatusBar needs to react to isDark, and hooks can't be used
// directly inside the component that renders ThemeProvider itself).
const ThemedApp = () => {
  const { colors, isDark } = useTheme();
  return (
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      <RootNavigator />
    </>
  );
};

const App = () => {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <ThemedApp />
      </ThemeProvider>
    </Provider>
  );
};

export default App;