import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, StatusBar,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchWishlist, toggleWishlist } from '../redux/wishlistSlice';
import useTheme from '../hooks/useTheme';
import TurfCard from '../components/TurfCard';
import EmptyState from '../components/EmptyState';
import { SPACING, FONT } from '../utils/theme';

export default function WishlistScreen({ navigation }) {
  const dispatch  = useDispatch();
  const wishlist  = useSelector((s) => s.wishlist?.wishlist);
  const { C, dark } = useTheme();

  useEffect(() => {
    dispatch(fetchWishlist());
  }, [dispatch]);

  return (
    <View style={[styles.root, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} backgroundColor={C.bg} />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: C.text }]}>Saved Grounds</Text>
          <Text style={[styles.count, { color: C.subtext }]}>{wishlist?.length || 0} Grounds Saved</Text>
        </View>

        {/* Wishlist Grid */}
        <FlatList
          data={wishlist || []}
          keyExtractor={(item) => item._id || item.id || String(Math.random())}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon="heart"
              title="Your Wishlist is Empty"
              description="Tap the heart icon on any turf ground to bookmark it for fast 1-click rebooking."
              actionText="Explore Top Turfs"
              onActionPress={() => navigation.navigate('Home')}
            />
          }
          renderItem={({ item }) => (
            <TurfCard
              turf={item}
              variant="vertical"
              isFavorite={true}
              onToggleFavorite={() => dispatch(toggleWishlist(item))}
              onPress={() => navigation.navigate('TurfDetail', { id: item._id || item.id })}
            />
          )}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: SPACING.lg,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title:  { ...FONT.h1, fontSize: 22, fontWeight: '800' },
  count:  { fontSize: 13, fontWeight: '600' },
  list:   { paddingHorizontal: SPACING.lg, paddingBottom: 100, gap: 12 },
});