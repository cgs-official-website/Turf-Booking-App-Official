import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Share, ScrollView, Linking, Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { bookingsApi } from '../api/bookings';
import { getImageUrl } from '../api/client';
import { COLORS, SPACING, RADIUS, FONT } from '../utils/theme';

const playersImg = require('../assets/players.png');

export default function BookingConfirmScreen({ route, navigation }) {
  const { turfData, sport, date, startTime, endTime } = route.params;
  const [players, setPlayers] = useState(turfData?.minPlayers || 2);
  const [paying,  setPaying]  = useState(false);

  const total     = turfData?.pricePerHour || 0;
  const perPerson = Math.round(total / players);

  const handleBookNow = async () => {
    setPaying(true);
    try {
      const res = await bookingsApi.create({
        turfId:    turfData._id,
        sport,
        date,
        startTime,
        endTime,
        players,
      });
      navigation.replace('RequestPending', { bookingId: res.booking._id });
    } catch (e) {
      Alert.alert('Booking Failed', e.message);
    } finally {
      setPaying(false);
    }
  };

  const handleWhatsApp = () => {
    const msg = `🏟️ Join me for ${sport} at ${turfData?.name}!\n📅 ${date}\n⏰ ${startTime} - ${endTime}\n💰 Each person pays ₹${perPerson} (split among ${players} players)\n\nBook your slot on Namma Ooru Turf!`;
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(msg)}`);
  };

  const handleShare = async () => {
    await Share.share({
      message: `🏟️ ${turfData?.name} | ${date} | ${startTime}-${endTime} | ₹${perPerson}/person`,
    });
  };

  const fmtDate = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-IN', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Confirm booking</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* Turf Info Card — image style like screenshot */}
        <View style={styles.turfCard}>
          {turfData?.images?.[0] ? (
            <Image
              source={{ uri: getImageUrl(turfData.images[0]) }}
              style={styles.turfImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.turfImage, styles.turfImageFallback]}>
              <Icon name="image-outline" size={32} color={COLORS.subtext} />
            </View>
          )}
          <View style={styles.turfInfo}>
            <Text style={styles.turfName}>{turfData?.name}</Text>
            <View style={styles.turfRow}>
              <Icon name="location-outline" size={13} color={COLORS.subtext} />
              <Text style={styles.turfLocation}>
                {turfData?.location?.city}, {turfData?.location?.state}, India
              </Text>
            </View>
            <View style={styles.turfRow}>
              <Icon name="walk-outline" size={13} color={COLORS.subtext} />
              <Text style={styles.turfLocation}>2.4 Km away</Text>
            </View>
          </View>

          {/* Price + Duration dark banner */}
          <View style={styles.priceBanner}>
            <View style={styles.priceBannerCol}>
              <Text style={styles.priceBannerLabel}>PRICE</Text>
              <View style={styles.priceBannerRow}>
                <Text style={styles.priceBannerAmount}>₹{total}</Text>
                <Text style={styles.priceBannerUnit}>/hr</Text>
              </View>
            </View>
            <View style={styles.priceBannerDivider} />
            <View style={styles.priceBannerCol}>
              <Text style={styles.priceBannerLabel}>DURATION</Text>
              <Text style={styles.priceBannerDuration}>{startTime} - {endTime}</Text>
            </View>
          </View>
        </View>

        {/* Players Stepper */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Icon name="people-outline" size={18} color={COLORS.primary} />
            <Text style={styles.cardTitle}>How many players are sharing?</Text>
          </View>
          <Text style={styles.cardSub}>More players, less per person!</Text>
          <View style={styles.stepperRow}>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => setPlayers(Math.max(1, players - 1))}
            >
              <Icon name="remove" size={20} color={COLORS.text} />
            </TouchableOpacity>
            <View style={styles.stepperCount}>
              <Text style={styles.stepperNum}>{players}</Text>
              <Text style={styles.stepperLabel}>Players</Text>
            </View>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => setPlayers(Math.min(turfData?.maxPlayers || 20, players + 1))}
            >
              <Icon name="add" size={20} color={COLORS.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Per Person Card */}
        <View style={styles.perPersonCard}>
          <Image source={playersImg} style={{ width: 160, height: 160 }} resizeMode="contain" />
          <Text style={styles.perPersonLabel}>Each Player Pays</Text>
          <Text style={styles.perPersonAmount}>₹ {perPerson}</Text>
          <View style={styles.perPersonTotal}>
            <Icon name="calendar-outline" size={14} color={COLORS.subtext} />
            <Text style={styles.perPersonTotalText}>
              Total Amount ₹{total} / {players} Players
            </Text>
          </View>
          <Text style={styles.saveMore}>Save more with friends! </Text>
          <Text style={styles.saveMoreSub}>The more players join, the less each person pays.</Text>
        </View>

        {/* Payment Details */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Icon name="card-outline" size={18} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Payment Details</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Amount</Text>
            <Text style={styles.summaryValue}>₹ {total}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Split Among</Text>
            <Text style={styles.summaryValue}>{players} Players</Text>
          </View>
          <View style={[styles.summaryRow, styles.perPersonRow]}>
            <Text style={styles.perPersonRowLabel}>Per Person</Text>
            <Text style={styles.perPersonRowValue}>₹ {perPerson}</Text>
          </View>
        </View>

        {/* WhatsApp Share */}
        <TouchableOpacity style={styles.whatsappBtn} onPress={handleWhatsApp}>
          <View style={styles.whatsappIcon}>
            <Icon name="logo-whatsapp" size={22} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.whatsappTitle}>Share Split Amount</Text>
            <Text style={styles.whatsappSub}>Send to your team on WhatsApp</Text>
          </View>
          <Icon name="chevron-forward" size={18} color={COLORS.subtext} />
        </TouchableOpacity>

        {/* Share Row */}
        <TouchableOpacity style={styles.shareRow} onPress={handleShare}>
          <View style={styles.shareLeft}>
            <View style={styles.shareIconCircle}>
              <Icon name="checkmark-circle-outline" size={22} color={COLORS.primary} />
            </View>
            <View>
              <Text style={styles.shareTitle}>Booking confirmed</Text>
              <Text style={styles.shareSub}>Share your booking details</Text>
            </View>
          </View>
          <Icon name="share-social-outline" size={20} color={COLORS.primary} />
        </TouchableOpacity>

      </ScrollView>

      {/* Book Now Footer */}
      <View style={styles.footer}>
        <View>
          <Text style={styles.footerTotal}>₹{total}</Text>
          <Text style={styles.footerSub}>₹{perPerson}/person</Text>
        </View>
        <TouchableOpacity
          style={styles.payBtn}
          onPress={handleBookNow}
          disabled={paying}
        >
          {paying
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.payBtnText}>Book Now</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:               { flex: 1, backgroundColor: COLORS.bg },

  // Header
  header:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingTop: 50, paddingBottom: SPACING.md },
  backBtn:            { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.bgSoft, justifyContent: 'center', alignItems: 'center' },
  headerTitle:        { ...FONT.h3, color: COLORS.text },

  // Turf Card
  turfCard:           { backgroundColor: '#fff', marginHorizontal: SPACING.lg, marginBottom: SPACING.md, borderRadius: RADIUS.xl, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  turfImage:          { width: '100%', height: 140 },
  turfImageFallback:  { justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bgSoft },
  turfInfo:           { padding: SPACING.md, gap: 4 },
  turfName:           { fontSize: 16, fontWeight: '800', color: COLORS.text },
  turfRow:            { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  turfLocation:       { fontSize: 12, color: COLORS.subtext },

  // Price Banner (dark)
  priceBanner:        { flexDirection: 'row', backgroundColor: '#1a2e20', marginHorizontal: SPACING.md, marginBottom: SPACING.md, borderRadius: RADIUS.lg, padding: SPACING.md, alignItems: 'center' },
  priceBannerCol:     { flex: 1, alignItems: 'center' },
  priceBannerLabel:   { fontSize: 10, color: '#aaa', letterSpacing: 1, fontWeight: '600', marginBottom: 4 },
  priceBannerRow:     { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  priceBannerAmount:  { fontSize: 22, fontWeight: '800', color: '#fff' },
  priceBannerUnit:    { fontSize: 12, color: '#aaa', marginBottom: 3 },
  priceBannerDivider: { width: 1, height: 36, backgroundColor: '#333', marginHorizontal: SPACING.md },
  priceBannerDuration:{ fontSize: 15, fontWeight: '700', color: '#fff' },

  // Generic Card
  card:               { backgroundColor: '#fff', marginHorizontal: SPACING.lg, marginBottom: SPACING.md, borderRadius: RADIUS.xl, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border },
  cardHeaderRow:      { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
  cardTitle:          { fontSize: 15, fontWeight: '700', color: COLORS.text },
  cardSub:            { color: COLORS.subtext, fontSize: 12, marginBottom: SPACING.md, marginTop: -SPACING.sm },

  // Summary rows
  summaryRow:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  summaryLeft:        { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summaryLabel:       { color: COLORS.subtext, fontSize: 13 },
  summaryValue:       { fontWeight: '700', color: COLORS.text, fontSize: 13 },
  perPersonRow:       { borderBottomWidth: 0, backgroundColor: COLORS.greenSoft, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, marginTop: SPACING.sm },
  perPersonRowLabel:  { fontWeight: '700', color: COLORS.text, fontSize: 14 },
  perPersonRowValue:  { fontWeight: '800', color: COLORS.primary, fontSize: 16 },

  // Stepper
  stepperRow:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xl, backgroundColor: COLORS.greenSoft, borderRadius: RADIUS.lg, padding: SPACING.lg },
  stepperBtn:         { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  stepperCount:       { alignItems: 'center' },
  stepperNum:         { fontSize: 28, fontWeight: '800', color: COLORS.primary },
  stepperLabel:       { color: COLORS.subtext, fontSize: 12 },

  // Per Person
  perPersonCard:      { backgroundColor: COLORS.greenSoft, marginHorizontal: SPACING.lg, marginBottom: SPACING.md, borderRadius: RADIUS.xl, padding: SPACING.xl, alignItems: 'center' },
  perPersonLabel:     { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  perPersonAmount:    { fontSize: 48, fontWeight: '800', color: COLORS.primary, marginVertical: SPACING.sm },
  perPersonTotal:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: RADIUS.round },
  perPersonTotalText: { color: COLORS.subtext, fontSize: 12 },
  saveMore:           { color: COLORS.primary, fontWeight: '700', fontSize: 14, marginTop: SPACING.md },
  saveMoreSub:        { color: COLORS.subtext, fontSize: 12, textAlign: 'center', marginTop: 4 },

  // WhatsApp
  whatsappBtn:        { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: '#fff', marginHorizontal: SPACING.lg, marginBottom: SPACING.md, borderRadius: RADIUS.xl, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border },
  whatsappIcon:       { width: 44, height: 44, borderRadius: 22, backgroundColor: '#25D366', justifyContent: 'center', alignItems: 'center' },
  whatsappTitle:      { fontWeight: '700', color: COLORS.text, fontSize: 14 },
  whatsappSub:        { color: COLORS.subtext, fontSize: 12, marginTop: 2 },

  // Share
  shareRow:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', marginHorizontal: SPACING.lg, marginBottom: SPACING.md, borderRadius: RADIUS.xl, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border },
  shareLeft:          { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  shareIconCircle:    { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.greenSoft, justifyContent: 'center', alignItems: 'center' },
  shareTitle:         { fontWeight: '700', color: COLORS.text, fontSize: 14 },
  shareSub:           { color: COLORS.subtext, fontSize: 12, marginTop: 2 },

  // Footer
  footer:             { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.lg, backgroundColor: COLORS.bg, borderTopWidth: 1, borderTopColor: COLORS.border },
  footerTotal:        { fontSize: 20, fontWeight: '800', color: COLORS.text },
  footerSub:          { color: COLORS.subtext, fontSize: 12 },
  payBtn:             { backgroundColor: COLORS.primary, paddingVertical: 14, paddingHorizontal: SPACING.xl, borderRadius: RADIUS.lg, alignItems: 'center' },
  payBtnText:         { color: '#fff', fontSize: 15, fontWeight: '700' },
});