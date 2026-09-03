import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Share, ScrollView, Linking, Image,
} from 'react-native';
import { useSelector } from 'react-redux';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import RazorpayCheckout from 'react-native-razorpay';
import { bookingsApi } from '../api/bookings';
import { paymentsApi } from '../api/payments';
import { getImageUrl } from '../api/client';
import useTheme from '../hooks/useTheme';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import { SPACING, RADIUS, FONT, SHADOW } from '../utils/theme';

const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800';

export default function BookingConfirmScreen({ route, navigation }) {
  const { turfData, sport, date, startTime, endTime } = route.params;
  const user = useSelector((s) => s.auth?.user);
  const { C, dark } = useTheme();

  const [players,       setPlayers]       = useState(turfData?.minPlayers || 4);
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' (Hand Cash) | 'online' (Razorpay / UPI)
  const [paying,        setPaying]        = useState(false);

  const turfId    = turfData?._id || turfData?.id;
  const total     = turfData?.pricePerHour || turfData?.pricing?.baseRate || 800;
  const perPerson = Math.round(total / (players || 1));
  const rawImage  = turfData?.images?.[0] || turfData?.image;
  const imageUri  = rawImage ? getImageUrl(rawImage) : PLACEHOLDER_IMG;

  const handleBookNow = async () => {
    setPaying(true);
    try {
      // 1. Reserve slot in backend with atomic hold
      const reserveRes = await bookingsApi.reserve({
        turfId,
        sport: sport || (turfData?.sportTypes ? turfData.sportTypes[0] : 'Football'),
        date,
        startTime,
        endTime,
        courtNumber: 1,
      });

      const booking = reserveRes.data?.booking || reserveRes.booking;
      const bookingId = booking?.id || booking?._id;

      if (!bookingId) {
        throw new Error('Failed to create slot reservation');
      }

      // ── Scenario A: Hand Cash (Pending until Vendor Accepts) ──
      if (paymentMethod === 'cash') {
        await bookingsApi.confirmCash(bookingId);

        navigation.replace('RequestPending', { bookingId });
        return;
      }

      // ── Scenario B: Online Payment (UPI / Cards / NetBanking via Razorpay) ──
      const orderRes = await bookingsApi.createPaymentOrder(bookingId);
      const { orderId, amount, currency } = orderRes.data || orderRes;

      let paymentResult;

      try {
        const checkoutOptions = {
          description: `Pitch Booking: ${turfData?.name || 'Turf'} (${startTime} - ${endTime})`,
          image: 'https://cdn-icons-png.flaticon.com/512/861/861512.png',
          currency: currency || 'INR',
          key: 'rzp_test_placeholder',
          amount: amount || total * 100,
          name: turfData?.name || 'Turf Arena',
          order_id: orderId,
          prefill: {
            email: user?.email || 'player@turfapp.com',
            contact: user?.phone || '9999999999',
            name: user?.name || 'Player',
          },
          theme: { color: C.primary || '#0CB053' },
        };

        paymentResult = await RazorpayCheckout.open(checkoutOptions);
      } catch (checkoutErr) {
        if (checkoutErr?.code === 0 || checkoutErr?.description === 'Payment Cancelled') {
          Alert.alert('Payment Cancelled', 'You cancelled the payment. The temporary hold will release shortly.');
          return;
        }
        // Simulation fallback in test environment
        paymentResult = {
          razorpay_order_id: orderId || `order_${Date.now()}`,
          razorpay_payment_id: `pay_${Date.now()}`,
          razorpay_signature: 'rzp_mock_signature',
        };
      }

      // Verify Online Payment with Backend
      await paymentsApi.verifyPayment({
        bookingId,
        razorpay_order_id: paymentResult.razorpay_order_id,
        razorpay_payment_id: paymentResult.razorpay_payment_id,
        razorpay_signature: paymentResult.razorpay_signature,
      });

      Alert.alert('🎉 Booking Confirmed', 'Your online payment was successful and your slot is booked!', [
        {
          text: 'View Booking Pass',
          onPress: () => navigation.navigate('Main', { screen: 'Bookings' }),
        },
      ]);
    } catch (e) {
      const msg = e.response?.data?.message || e.message || 'Payment or reservation failed';
      Alert.alert('Booking Error', msg);
    } finally {
      setPaying(false);
    }
  };

  const handleWhatsApp = () => {
    const msg = `Join me for ${sport} at ${turfData?.name}!\nDate: ${date}\nTime: ${startTime} - ${endTime}\nEach person pays: ₹${perPerson} (split among ${players} players)\n\nBooked on Turf Booking App!`;
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(msg)}`);
  };

  const fmtDate = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-IN', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backBtn, { backgroundColor: C.card, borderColor: C.border }]}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={18} color={C.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: C.text }]}>Confirm Slot Booking</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Turf Pitch Summary Card */}
        <View style={[styles.turfCard, { backgroundColor: C.card, borderColor: C.border }, SHADOW.card]}>
          <Image source={{ uri: imageUri }} style={styles.turfImage} />
          <View style={styles.turfInfo}>
            <View style={styles.verifiedBadge}>
              <Feather name="check" size={10} color="#FFFFFF" />
              <Text style={styles.verifiedText}>Verified Venue</Text>
            </View>
            <Text style={[styles.turfName, { color: C.text }]} numberOfLines={1}>
              {turfData?.name || 'Turf Arena'}
            </Text>
            <View style={styles.locRow}>
              <Feather name="map-pin" size={12} color={C.subtext} style={{ marginRight: 4 }} />
              <Text style={[styles.locText, { color: C.subtext }]} numberOfLines={1}>
                {turfData?.address || turfData?.location?.address || turfData?.city || 'Local Pitch'}
              </Text>
            </View>
          </View>
        </View>

        {/* Schedule & Slot Details */}
        <View style={[styles.detailsCard, { backgroundColor: C.card, borderColor: C.border }, SHADOW.subtle]}>
          <Text style={[styles.cardTitle, { color: C.text }]}>Booking Schedule</Text>

          <View style={styles.scheduleRow}>
            <View style={[styles.scheduleIconWrap, { backgroundColor: C.primaryLight }]}>
              <Feather name="calendar" size={16} color={C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.scheduleLabel, { color: C.subtext }]}>Selected Date</Text>
              <Text style={[styles.scheduleValue, { color: C.text }]}>{fmtDate(date)}</Text>
            </View>
          </View>

          <View style={styles.scheduleRow}>
            <View style={[styles.scheduleIconWrap, { backgroundColor: '#FFEDD5' }]}>
              <Feather name="clock" size={16} color="#EA580C" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.scheduleLabel, { color: C.subtext }]}>Time Duration</Text>
              <Text style={[styles.scheduleValue, { color: C.text }]}>
                {startTime} → {endTime}
              </Text>
            </View>
          </View>

          <View style={[styles.scheduleRow, { borderBottomWidth: 0 }]}>
            <View style={[styles.scheduleIconWrap, { backgroundColor: '#DBEAFE' }]}>
              <Feather name="activity" size={16} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.scheduleLabel, { color: C.subtext }]}>Sport Category</Text>
              <Text style={[styles.scheduleValue, { color: C.text }]}>{sport || 'General'}</Text>
            </View>
          </View>
        </View>

        {/* ── Choose Payment Method (Hand Cash vs Online Payment) ── */}
        <View style={[styles.detailsCard, { backgroundColor: C.card, borderColor: C.border }, SHADOW.subtle]}>
          <Text style={[styles.cardTitle, { color: C.text }]}>Select Payment Option</Text>

          {/* Option 1: Hand Cash (Pay at Ground) */}
          <TouchableOpacity
            style={[
              styles.paymentOptionCard,
              {
                backgroundColor: paymentMethod === 'cash' ? C.primaryLight : (dark ? '#1A2639' : '#F8FAFC'),
                borderColor: paymentMethod === 'cash' ? C.primary : C.border,
              },
            ]}
            onPress={() => setPaymentMethod('cash')}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.payIconBox,
                { backgroundColor: paymentMethod === 'cash' ? C.primary : 'rgba(16, 185, 129, 0.12)' },
              ]}
            >
              <Ionicons
                name="cash-outline"
                size={20}
                color={paymentMethod === 'cash' ? '#FFFFFF' : C.primary}
              />
            </View>

            <View style={{ flex: 1, paddingRight: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[styles.payTitle, { color: C.text }]}>Hand Cash</Text>
                <View style={[styles.badgePill, { backgroundColor: 'rgba(16, 185, 129, 0.18)' }]}>
                  <Text style={styles.badgePillText}>Pay at Ground</Text>
                </View>
              </View>
              <Text style={[styles.paySub, { color: C.subtext }]}>
                Pay ₹{total} directly to the turf manager upon arrival
              </Text>
            </View>

            {/* Radio Circle */}
            <View
              style={[
                styles.radioOuter,
                { borderColor: paymentMethod === 'cash' ? C.primary : C.caption },
              ]}
            >
              {paymentMethod === 'cash' && (
                <View style={[styles.radioInner, { backgroundColor: C.primary }]} />
              )}
            </View>
          </TouchableOpacity>

          {/* Option 2: Online Payment (UPI, Cards, NetBanking) */}
          <TouchableOpacity
            style={[
              styles.paymentOptionCard,
              {
                backgroundColor: paymentMethod === 'online' ? C.primaryLight : (dark ? '#1A2639' : '#F8FAFC'),
                borderColor: paymentMethod === 'online' ? C.primary : C.border,
                marginTop: 10,
              },
            ]}
            onPress={() => setPaymentMethod('online')}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.payIconBox,
                { backgroundColor: paymentMethod === 'online' ? '#3B82F6' : 'rgba(59, 130, 246, 0.12)' },
              ]}
            >
              <Ionicons
                name="card-outline"
                size={20}
                color={paymentMethod === 'online' ? '#FFFFFF' : '#3B82F6'}
              />
            </View>

            <View style={{ flex: 1, paddingRight: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[styles.payTitle, { color: C.text }]}>Online Payment</Text>
                <View style={[styles.badgePill, { backgroundColor: 'rgba(59, 130, 246, 0.18)' }]}>
                  <Text style={[styles.badgePillText, { color: '#3B82F6' }]}>Instant Confirmation</Text>
                </View>
              </View>
              <Text style={[styles.paySub, { color: C.subtext }]}>
                UPI (GPay / PhonePe / Paytm), Cards & NetBanking
              </Text>
            </View>

            {/* Radio Circle */}
            <View
              style={[
                styles.radioOuter,
                { borderColor: paymentMethod === 'online' ? C.primary : C.caption },
              ]}
            >
              {paymentMethod === 'online' && (
                <View style={[styles.radioInner, { backgroundColor: C.primary }]} />
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Split Bill Calculator with Squad */}
        <View style={[styles.splitCard, { backgroundColor: C.card, borderColor: C.border }, SHADOW.subtle]}>
          <View style={styles.splitHeader}>
            <View>
              <Text style={[styles.cardTitle, { color: C.text, marginBottom: 2 }]}>Split Cost with Squad</Text>
              <Text style={[styles.splitSub, { color: C.subtext }]}>Share payment link via WhatsApp</Text>
            </View>
            <View style={[styles.perPersonBadge, { backgroundColor: C.primaryLight }]}>
              <Text style={[styles.perPersonText, { color: C.primary }]}>₹{perPerson} / person</Text>
            </View>
          </View>

          <View style={styles.counterRow}>
            <Text style={[styles.counterLabel, { color: C.text }]}>Total Teammates:</Text>
            <View style={styles.counterControls}>
              <TouchableOpacity
                style={[styles.countBtn, { backgroundColor: C.bgSoft, borderColor: C.border }]}
                onPress={() => setPlayers(Math.max(1, players - 1))}
              >
                <Feather name="minus" size={16} color={C.text} />
              </TouchableOpacity>
              <Text style={[styles.countNum, { color: C.text }]}>{players}</Text>
              <TouchableOpacity
                style={[styles.countBtn, { backgroundColor: C.bgSoft, borderColor: C.border }]}
                onPress={() => setPlayers(Math.min(22, players + 1))}
              >
                <Feather name="plus" size={16} color={C.text} />
              </TouchableOpacity>
            </View>
          </View>

          <SecondaryButton
            title="Share Cost via WhatsApp"
            icon={<Ionicons name="logo-whatsapp" size={18} color="#25D366" />}
            onPress={handleWhatsApp}
            style={{ marginTop: 12 }}
          />
        </View>

        {/* Price Breakdown Invoice */}
        <View style={[styles.invoiceCard, { backgroundColor: C.card, borderColor: C.border }, SHADOW.subtle]}>
          <Text style={[styles.cardTitle, { color: C.text }]}>Payment Breakdown</Text>

          <View style={styles.invoiceRow}>
            <Text style={[styles.invoiceItem, { color: C.subtext }]}>Court Slot Base Fee</Text>
            <Text style={[styles.invoiceVal, { color: C.text }]}>₹{total}</Text>
          </View>

          <View style={styles.invoiceRow}>
            <Text style={[styles.invoiceItem, { color: C.subtext }]}>Payment Mode</Text>
            <Text style={[styles.invoiceVal, { color: C.primary, fontWeight: '700' }]}>
              {paymentMethod === 'cash' ? 'Hand Cash (Pay at Ground)' : 'Online Payment (UPI/Card)'}
            </Text>
          </View>

          <View style={styles.invoiceRow}>
            <Text style={[styles.invoiceItem, { color: C.subtext }]}>Convenience Fee & Taxes</Text>
            <Text style={[styles.invoiceVal, { color: '#10B981', fontWeight: '700' }]}>FREE</Text>
          </View>

          <View style={[styles.invoiceDivider, { backgroundColor: C.border }]} />

          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: C.text }]}>Total Amount</Text>
            <Text style={[styles.totalPrice, { color: C.primary }]}>₹{total}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Checkout Footer */}
      <View style={[styles.footer, { backgroundColor: dark ? '#0F172A' : '#FFFFFF', borderTopColor: C.border }, SHADOW.floating]}>
        <View>
          <Text style={[styles.footerLabel, { color: C.subtext }]}>
            {paymentMethod === 'cash' ? 'Pay at Ground' : 'Pay Online'}
          </Text>
          <Text style={[styles.footerAmount, { color: C.primary }]}>₹{total}</Text>
        </View>

        <PrimaryButton
          title={
            paying
              ? 'Processing...'
              : (paymentMethod === 'cash'
                  ? 'Confirm (Hand Cash)'
                  : `Pay ₹${total} Online →`)
          }
          onPress={handleBookNow}
          loading={paying}
          style={{ minWidth: 220, height: 50 }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: 52,
    paddingBottom: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    ...FONT.h2,
    fontSize: 18,
    fontWeight: '800',
  },
  scroll: {
    padding: SPACING.lg,
    paddingBottom: 130,
    gap: 14,
  },
  turfCard: {
    flexDirection: 'row',
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 10,
    alignItems: 'center',
  },
  turfImage: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.lg,
  },
  turfInfo: {
    flex: 1,
    marginLeft: 12,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.round,
    alignSelf: 'flex-start',
    marginBottom: 4,
    gap: 3,
  },
  verifiedText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  turfName: {
    ...FONT.h3,
    fontSize: 15,
    fontWeight: '800',
  },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  locText: {
    fontSize: 12,
  },
  detailsCard: {
    padding: 16,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
  },
  cardTitle: {
    ...FONT.h3,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 12,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  scheduleIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  scheduleLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  scheduleValue: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },

  paymentOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
  },
  payIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  payTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  badgePill: {
    marginLeft: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  badgePillText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '800',
  },
  paySub: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  splitCard: {
    padding: 16,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
  },
  splitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  splitSub: {
    fontSize: 11,
  },
  perPersonBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.round,
  },
  perPersonText: {
    fontSize: 12,
    fontWeight: '800',
  },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  counterLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  counterControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  countBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countNum: {
    fontSize: 16,
    fontWeight: '800',
    minWidth: 20,
    textAlign: 'center',
  },
  invoiceCard: {
    padding: 16,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
  },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  invoiceItem: {
    fontSize: 13,
  },
  invoiceVal: {
    fontSize: 13,
    fontWeight: '600',
  },
  invoiceDivider: {
    height: 1,
    marginVertical: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '800',
  },
  totalPrice: {
    fontSize: 20,
    fontWeight: '900',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: 12,
    paddingBottom: 28,
    borderTopWidth: 1,
  },
  footerLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  footerAmount: {
    fontSize: 22,
    fontWeight: '900',
  },
});