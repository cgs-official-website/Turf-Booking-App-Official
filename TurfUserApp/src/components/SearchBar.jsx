import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import useTheme from '../hooks/useTheme';
import { RADIUS, FONT } from '../utils/theme';

export default function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search turfs, locations or sports...',
  onFilterPress,
  onPress,
  editable = true,
  autoFocus = false,
  showFilter = true,
  style,
}) {
  const { C, dark } = useTheme();

  const ContainerComponent = editable ? View : TouchableOpacity;

  return (
    <ContainerComponent
      style={[
        styles.container,
        {
          backgroundColor: dark ? '#131E2F' : '#FFFFFF',
          borderColor: dark ? '#223249' : '#E2E8F0',
        },
        style,
      ]}
      activeOpacity={0.8}
      onPress={!editable ? onPress : undefined}
    >
      <Feather name="search" size={18} color={C.primary} style={styles.searchIcon} />
      <TextInput
        style={[styles.input, { color: C.text }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.subtext}
        editable={editable}
        autoFocus={autoFocus}
        returnKeyType="search"
      />
      {value && value.length > 0 && editable && (
        <TouchableOpacity onPress={() => onChangeText('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="x-circle" size={16} color={C.caption} style={styles.clearIcon} />
        </TouchableOpacity>
      )}
      {showFilter && onFilterPress && (
        <TouchableOpacity
          style={[styles.filterBtn, { backgroundColor: C.primaryLight }]}
          onPress={onFilterPress}
          activeOpacity={0.8}
        >
          <Feather name="sliders" size={16} color={C.primary} />
        </TouchableOpacity>
      )}
    </ContainerComponent>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    ...FONT.body,
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 0,
  },
  clearIcon: {
    marginRight: 8,
  },
  filterBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
});
