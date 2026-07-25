// // src/screens/WishlistScreen.jsx
// import React, { useEffect } from 'react';
// import {
//   View, Text, StyleSheet, FlatList,
//   TouchableOpacity, Image, 
// } from 'react-native';
// import { useDispatch, useSelector } from 'react-redux';
// import { fetchWishlist, toggleWishlist } from '../redux/wishlistSlice';
// import { COLORS, SPACING, RADIUS, FONT } from '../utils/theme';
// import Icon from 'react-native-vector-icons/Ionicons';
// import { SafeAreaView } from 'react-native-safe-area-context';
// const PLACEHOLDER = 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=400';

// export default function WishlistScreen({ navigation }) {
//   const wishlistImg = require('../assets/wishlist.png');
//   const dispatch  = useDispatch();
//   const wishlist  = useSelector((s) => s.wishlist.wishlist);

//   useEffect(() => { dispatch(fetchWishlist()); }, []);

//   return (
//     <SafeAreaView style={styles.safe}>
//       <View style={styles.header}>
//         <Text style={styles.title}>Wishlist</Text>
//         <Text style={styles.count}>{wishlist.length} saved</Text>
//       </View>

//       <FlatList
//         data={wishlist}
//         keyExtractor={(i) => i._id}
//         contentContainerStyle={styles.list}
//         ListEmptyComponent={
//   <View style={styles.empty}>
//     <Image source={wishlistImg} style={{ width: 240, height: 240, marginBottom: 16 }} resizeMode="contain" />
//     <Text style={styles.emptyTitle}>No saved turfs yet</Text>
//     <Text style={styles.emptySub}>Tap the ❤️ icon on any turf to save it here</Text>
//     <TouchableOpacity style={styles.exploreBtn} onPress={() => navigation.navigate('Home')}>
//       <Text style={styles.exploreBtnText}>Start Exploring</Text>
//     </TouchableOpacity>
//   </View>
// }
//         renderItem={({ item }) => (
//           <TouchableOpacity
//             style={styles.card}
//             onPress={() => navigation.navigate('TurfDetail', { id: item._id })}
//             activeOpacity={0.85}
//           >
//             <Image
//               source={{ uri: item.images?.[0] || PLACEHOLDER }}
//               style={styles.image}
//             />
//             <TouchableOpacity
//               style={styles.heartBtn}
//               onPress={() => dispatch(toggleWishlist(item))}
//             >
//               <Icon name="heart" size={18} color={COLORS.red} />
//             </TouchableOpacity>
//             <View style={styles.info}>
//               <View style={styles.titleRow}>
//                 <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
//                 <View style={styles.ratingBadge}>
//                   <Icon name="star" size={13} color={COLORS.yellow} />
//                   <Text style={styles.ratingText}>{item.rating?.toFixed(1) || 'New'}</Text>
//                 </View>
//               </View>
//               <View style={styles.locRow}>
//                 <Icon name="location-outline" size={13} color={COLORS.subtext} />
//                 <Text style={styles.locText} numberOfLines={1}>{item.location?.city}</Text>
//               </View>
//               <View style={styles.bottomRow}>
//                 <View>
//                   <Text style={styles.priceLabel}>Starts from</Text>
//                   <Text style={styles.price}>₹{item.pricePerHour}<Text style={styles.priceUnit}>/hr</Text></Text>
//                 </View>
//                 <TouchableOpacity
//                   style={styles.bookBtn}
//                   onPress={() => navigation.navigate('TurfDetail', { id: item._id })}
//                 >
//                   <Text style={styles.bookBtnText}>Book Now</Text>
//                 </TouchableOpacity>
//               </View>
//             </View>
//           </TouchableOpacity>
//         )}
//       />
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   safe:        { flex: 1, backgroundColor: COLORS.bg },
//   header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: SPACING.md },
//   title:       { fontSize: 24, fontWeight: '800', color: COLORS.text },
//   count:       { color: COLORS.subtext, fontSize: 13 },
//   list:        { padding: SPACING.lg, gap: SPACING.md, paddingBottom: 40 },
//   card:        { backgroundColor: '#fff', borderRadius: RADIUS.xl, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
//   image:       { width: '100%', height: 160, backgroundColor: COLORS.bgSoft },
//   heartBtn:    { position: 'absolute', top: 12, right: 12, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center' },
//   info:        { padding: SPACING.md },
//   titleRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
//   name:        { fontSize: 16, fontWeight: '700', color: COLORS.text, flexShrink: 1 },
//   ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
//   ratingText:  { fontWeight: '700', fontSize: 13, color: COLORS.text },
//   locRow:      { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: SPACING.md },
//   locText:     { color: COLORS.subtext, fontSize: 13, flex: 1 },
//   bottomRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
//   priceLabel:  { color: COLORS.subtext, fontSize: 11 },
//   price:       { color: COLORS.primary, fontSize: 20, fontWeight: '800' },
//   priceUnit:   { color: COLORS.subtext, fontSize: 13, fontWeight: '400' },
//   bookBtn:     { backgroundColor: COLORS.primary, paddingHorizontal: SPACING.lg, paddingVertical: 10, borderRadius: RADIUS.md },
//   bookBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
//   empty:       { alignItems: 'center', paddingTop: 80, gap: SPACING.md, paddingHorizontal: SPACING.xl },
//   emptyTitle:  { fontSize: 20, fontWeight: '700', color: COLORS.text },
//   emptySub:    { color: COLORS.subtext, fontSize: 14, textAlign: 'center', lineHeight: 20 },
//   exploreBtn:  { backgroundColor: COLORS.primary, paddingHorizontal: SPACING.xl, paddingVertical: 14, borderRadius: RADIUS.lg, marginTop: SPACING.md },
//   exploreBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
// });

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { fetchWishlist, toggleWishlist } from '../redux/wishlistSlice';
import { SPACING, RADIUS, FONT } from '../utils/theme';
import useTheme from '../hooks/useTheme';
import Icon from 'react-native-vector-icons/Ionicons';

const PLACEHOLDER = 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=400';

export default function WishlistScreen({ navigation }) {
  const { C, dark } = useTheme();
  const wishlistImg = require('../assets/wishlist.png');
  const dispatch = useDispatch();
  const wishlist = useSelector((s) => s.wishlist.wishlist);
  useEffect(() => { dispatch(fetchWishlist()); }, []);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} backgroundColor={C.bg} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: C.text }]}>Wishlist</Text>
          <Text style={[styles.count, { color: C.subtext }]}>{wishlist.length} saved</Text>
        </View>
        <FlatList
          data={wishlist}
          keyExtractor={(i) => i._id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Image source={wishlistImg} style={{ width: 240, height: 240, marginBottom: 16 }} resizeMode="contain" />
              <Text style={[styles.emptyTitle, { color: C.text }]}>No saved turfs yet</Text>
              <Text style={[styles.emptySub, { color: C.subtext }]}>Tap the ❤️ icon on any turf to save it here</Text>
              <TouchableOpacity style={[styles.exploreBtn, { backgroundColor: C.primary }]} onPress={() => navigation.navigate('Home')}>
                <Text style={styles.exploreBtnText}>Start Exploring</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}
              onPress={() => navigation.navigate('TurfDetail', { id: item._id })}
              activeOpacity={0.85}
            >
              <Image source={{ uri: item.images?.[0] || PLACEHOLDER }} style={styles.image} />
              <TouchableOpacity style={styles.heartBtn} onPress={() => dispatch(toggleWishlist(item))}>
                <Icon name="heart" size={18} color="#EF4444" />
              </TouchableOpacity>
              <View style={styles.info}>
                <View style={styles.titleRow}>
                  <Text style={[styles.name, { color: C.text }]} numberOfLines={1}>{item.name}</Text>
                  <View style={styles.ratingBadge}>
                    <Icon name="star" size={13} color="#F59E0B" />
                    <Text style={[styles.ratingText, { color: C.text }]}>{item.rating?.toFixed(1) || 'New'}</Text>
                  </View>
                </View>
                <View style={styles.locRow}>
                  <Icon name="location-outline" size={13} color={C.subtext} />
                  <Text style={[styles.locText, { color: C.subtext }]} numberOfLines={1}>{item.location?.city}</Text>
                </View>
                <View style={styles.bottomRow}>
                  <View>
                    <Text style={[styles.priceLabel, { color: C.subtext }]}>Starts from</Text>
                    <Text style={[styles.price, { color: C.primary }]}>₹{item.pricePerHour}<Text style={[styles.priceUnit, { color: C.subtext }]}>/hr</Text></Text>
                  </View>
                  <TouchableOpacity style={[styles.bookBtn, { backgroundColor: C.primary }]} onPress={() => navigation.navigate('TurfDetail', { id: item._id })}>
                    <Text style={styles.bookBtnText}>Book Now</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: SPACING.md },
  title:        { fontSize: 24, fontWeight: '800' },
  count:        { fontSize: 13 },
  list:         { padding: SPACING.lg, gap: SPACING.md, paddingBottom: 100 },
  card:         { borderRadius: RADIUS.xl, overflow: 'hidden', borderWidth: 1 },
  image:        { width: '100%', height: 160 },
  heartBtn:     { position: 'absolute', top: 12, right: 12, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center' },
  info:         { padding: SPACING.md },
  titleRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  name:         { fontSize: 16, fontWeight: '700', flexShrink: 1 },
  ratingBadge:  { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText:   { fontWeight: '700', fontSize: 13 },
  locRow:       { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: SPACING.md },
  locText:      { fontSize: 13, flex: 1 },
  bottomRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceLabel:   { fontSize: 11 },
  price:        { fontSize: 20, fontWeight: '800' },
  priceUnit:    { fontSize: 13, fontWeight: '400' },
  bookBtn:      { paddingHorizontal: SPACING.lg, paddingVertical: 10, borderRadius: RADIUS.md },
  bookBtnText:  { color: '#fff', fontWeight: '700', fontSize: 13 },
  empty:        { alignItems: 'center', paddingTop: 80, gap: SPACING.md, paddingHorizontal: SPACING.xl },
  emptyTitle:   { fontSize: 20, fontWeight: '700' },
  emptySub:     { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  exploreBtn:   { paddingHorizontal: SPACING.xl, paddingVertical: 14, borderRadius: RADIUS.lg, marginTop: SPACING.md },
  exploreBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});