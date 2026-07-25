// @theme-ready ✅
import React, { useEffect, useLayoutEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMyTurfs, deleteTurf } from '../redux/vendorSlice';
import TurfCard from '../components/TurfCard';
import { SIZES, SHADOWS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import Feather from 'react-native-vector-icons/Feather';

const MyTurfsScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { turfs, loading } = useSelector((s) => s.vendor);

  const { colors, isDark } = useTheme();
  const styles = getStyles(colors);

  // Update Header Colors based on Theme to fix any white space issues
  useLayoutEffect(() => {
    navigation.setOptions({
      headerStyle: {
        backgroundColor: colors.background,
        elevation: 0,
        shadowOpacity: 0,
        borderBottomWidth: 1,
        borderBottomColor: colors.border || 'transparent',
      },
      headerTintColor: colors.text,
      headerTitleStyle: {
        color: colors.text,
        fontWeight: '700',
      },
    });
  }, [navigation, colors]);

  useEffect(() => { dispatch(fetchMyTurfs()); }, []);

  const handleDelete = (id, name) => {
    Alert.alert('Delete Turf', `Are you sure you want to delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => dispatch(deleteTurf(id)),
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={turfs}
        keyExtractor={(t) => t._id}
        refreshControl={
          <RefreshControl 
            refreshing={loading} 
            onRefresh={() => dispatch(fetchMyTurfs())} 
            colors={[colors.primary]} 
            tintColor={colors.primary} 
          />
        }
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>My Turfs ({turfs.length})</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddTurf')}>
              <Feather name="plus" size={16} color={colors.onAccent} style={{ marginRight: 4 }} />
              <Text style={styles.addText}>Add Turf</Text>
            </TouchableOpacity>
          </View>
        }
        ListEmptyComponent={
          !loading && (
            <View style={styles.empty}>
              <View style={styles.iconContainer}>
                <Feather name="map" size={48} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No turfs listed yet</Text>
              <Text style={styles.emptySubtitle}>Add your first turf to start accepting bookings</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('AddTurf')}>
                <Feather name="plus-circle" size={18} color={colors.onAccent} style={{ marginRight: 8 }} />
                <Text style={styles.emptyBtnText}>Add Turf</Text>
              </TouchableOpacity>
            </View>
          )
        }
        renderItem={({ item }) => (
          <TurfCard
            turf={item}
            onPress={() => navigation.navigate('TurfDetail', { turfId: item._id })}
            onEdit={() => navigation.navigate('EditTurf', { turfId: item._id })}
            onDelete={() => handleDelete(item._id, item.name)}
          />
        )}
      />
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: SIZES.padding, paddingBottom: 40 },
  
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 20,
    marginTop: 8,
  },
  title: { fontSize: SIZES.xl, fontWeight: '800', color: colors.text },
  addBtn: { 
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary, 
    borderRadius: SIZES.radius, 
    paddingHorizontal: 16, 
    paddingVertical: 10,
    ...SHADOWS.sm,
  },
  addText: { color: colors.onAccent, fontWeight: '700', fontSize: SIZES.sm },
  
  empty: { alignItems: 'center', paddingVertical: 60 },
  iconContainer: {
    backgroundColor: colors.primary + '15',
    padding: 24,
    borderRadius: 60,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: { fontSize: SIZES.lg + 2, fontWeight: '700', color: colors.text, marginBottom: 8 },
  emptySubtitle: { fontSize: SIZES.sm, color: colors.textSecondary, textAlign: 'center', marginBottom: 28, lineHeight: 20 },
  emptyBtn: { 
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary, 
    borderRadius: SIZES.radius, 
    paddingHorizontal: 28, 
    paddingVertical: 14,
    ...SHADOWS.sm,
  },
  emptyBtnText: { color: colors.onAccent, fontWeight: '700', fontSize: SIZES.base },
});

export default MyTurfsScreen;