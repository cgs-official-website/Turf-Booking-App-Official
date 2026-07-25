import React from 'react';
import { Text } from 'react-native';
import { useTheme } from '../context/ThemeContext';

// Drop-in replacement for RN's <Text>.
// Always inherits the current theme's text color unless you pass
// your own `color` (via style or the `color` prop), so nothing is
// ever left black-on-black / white-on-white when the theme switches.
const AppText = ({ style, color, children, ...rest }) => {
  const { colors } = useTheme();

  const flatStyle = Array.isArray(style) ? style : [style];
  const hasOwnColor =
    color || flatStyle.some((s) => s && s.color);

  return (
    <Text
      style={[{ color: hasOwnColor ? undefined : colors.text }, ...flatStyle, color && { color }]}
      {...rest}
    >
      {children}
    </Text>
  );
};

export default AppText;