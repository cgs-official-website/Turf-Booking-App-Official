import React from 'react';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

// Thin wrapper so the rest of the app imports one thing (`Icon`) instead of
// reaching into react-native-vector-icons directly everywhere — makes it a
// one-line change if we ever swap icon sets. Feather is the default "clean
// line icon" look, no emoji anywhere. Pass family="mci" for sport/amenity
// icons (cricket bat, football, pool, etc.) that Feather doesn't have.
const Icon = ({ name, size = 20, color = '#1A1A2E', style, family = 'feather' }) => {
  if (family === 'mci' || family === 'material-community') {
    return <MaterialCommunityIcons name={name} size={size} color={color} style={style} />;
  }
  return <Feather name={name} size={size} color={color} style={style} />;
};

export default Icon;