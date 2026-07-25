// src/screens/NotificationsScreen.jsx
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Image,
  TouchableOpacity, RefreshControl, Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { notificationsApi } from '../api/notifications';
import { SPACING, RADIUS } from '../utils/theme';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import useTheme from '../hooks/useTheme'; // <-- Dark mode custom hook import panniyachu

const notifImg = require('../assets/notifications.png');

const FILTER_OPTIONS = [
  { label: 'Newest First',       value: 'newest' },
  { label: 'Older First',        value: 'oldest' },
  { label: 'Read Notification',  value: 'read' },
  { label: 'Unread Notification',value: 'unread' },
];

export default function NotificationsScreen({ navigation }) {
  const { C } = useTheme(); // <-- Dynamic custom theme extract pannyachu
  const [notifications, setNotifications] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [showFilter,    setShowFilter]    = useState(false);
  const [filter,        setFilter]        = useState('newest');

  // Dynamic status mapping config 
  const TYPE_ICON = {
    BookingConfirmed: { icon: 'checkmark-circle', color: C.primary },
    BookingRejected:  { icon: 'close-circle',     color: C.red },
    BookingExpired:   { icon: 'time',             color: C.orange },
    BookingReminder:  { icon: 'alarm',            color: C.yellow },
    Promo:            { icon: 'gift',             color: C.primary },
    General:          { icon: 'notifications',    color: C.subtext },
  };

  // Same logic remains completely untouched machii
  const load = useCallback(() => {
    setLoading(true);
    notificationsApi.getAll()
      .then((r) => setNotifications(r.notifications || []))
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const markRead = async (id) => {
    try {
      await notificationsApi.markRead(id);
    } catch {}
    setNotifications((prev) =>
      prev.map((n) => n._id === id ? { ...n, read: true } : n)
    );
  };

  const markAll = async () => {
    try {
      await notificationsApi.markAllRead();
    } catch {}
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const filtered = [...notifications].filter((n) => {
    if (filter === 'read')   return n.read;
    if (filter === 'unread') return !n.read;
    return true;
  }).sort((a, b) => {
    if (filter === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.bg }]}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: C.bgSoft }]}>
          <Icon name="arrow-back" size={20} color={C.text} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.title, { color: C.text }]}>Notifications</Text>
          {unreadCount > 0 && (
            <Text style={[styles.unreadCount, { color: C.primary }]}>{unreadCount} unread</Text>
          )}
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={[styles.filterBtn, { backgroundColor: C.greenSoft, borderColor: C.primary + '30' }]} onPress={() => setShowFilter(true)}>
            <Icon name="options-outline" size={18} color={C.primary} />
            <Text style={[styles.filterBtnText, { color: C.primary }]}>Filter</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Mark all read */}
      {unreadCount > 0 && (
        <TouchableOpacity style={styles.markAllRow} onPress={markAll}>
          <Icon name="checkmark-done-outline" size={16} color={C.primary} />
          <Text style={[styles.markAll, { color: C.primary }]}>Mark all as read</Text>
        </TouchableOpacity>
      )}

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(n) => n._id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={C.primary} />}
        contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.sm, flexGrow: 1 }}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Image
                source={notifImg}
                style={{ width: 150, height: 150, marginBottom: 16 }}
                resizeMode="contain"
              />
              <Text style={[styles.emptyText, { color: C.text }]}>No notifications yet</Text>
              <Text style={[styles.emptySub, { color: C.subtext }]}>
                We'll notify you when vendor confirms your booking
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const meta = TYPE_ICON[item.type] || TYPE_ICON.General;
          return (
            <TouchableOpacity
              style={[
                styles.card, 
                { backgroundColor: C.bg, borderColor: C.border },
                !item.read && { backgroundColor: C.greenSoft, borderColor: C.primary + '40' }
              ]}
              onPress={() => markRead(item._id)}
              activeOpacity={0.85}
            >
              <View style={[styles.iconCircle, { backgroundColor: meta.color + '18' }]}>
                <Icon name={meta.icon} size={22} color={meta.color} />
              </View>
              <View style={styles.content}>
                <Text style={[styles.cardTitle, { color: C.text }]}>{item.title}</Text>
                <Text style={[styles.cardMsg, { color: C.subtext }]}>{item.message}</Text>
                <Text style={[styles.cardTime, { color: C.subtext }]}>
                  {new Date(item.createdAt).toLocaleDateString('en-IN', {
                    day: '2-digit', month: 'short',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </Text>
              </View>
              {!item.read && <View style={[styles.unreadDot, { backgroundColor: C.primary }]} />}
            </TouchableOpacity>
          );
        }}
      />

      {/* Filter Modal */}
      <Modal visible={showFilter} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFilter(false)}
        >
          <View style={[styles.filterCard, { backgroundColor: C.card }]}>
            <Text style={[styles.filterTitle, { color: C.text }]}>Notification Filter</Text>
            <Text style={[styles.filterSub, { color: C.text }]}>Sort By</Text>
            {FILTER_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.filterOption, { borderBottomColor: C.border }]}
                onPress={() => { setFilter(opt.value); setShowFilter(false); }}
              >
                <Text style={[
                  styles.filterOptionText,
                  { color: C.text },
                  filter === opt.value && { color: C.text, fontWeight: '600' },
                ]}>
                  {opt.label}
                </Text>
                <View style={[
                  styles.radio,
                  { borderColor: C.border },
                  filter === opt.value && { borderColor: C.primary },
                ]}>
                  {filter === opt.value && (
                    <View style={[styles.radioDot, { backgroundColor: C.primary }]} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:           { flex: 1 },
  header:              { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.md },
  backBtn:             { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  title:               { fontSize: 18, fontWeight: '700' },
  unreadCount:         { fontSize: 12, fontWeight: '600', marginTop: 2 },
  headerRight:         { alignItems: 'flex-end' },
  filterBtn:           { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: RADIUS.round, borderWidth: 1 },
  filterBtnText:       { fontSize: 13, fontWeight: '600' },
  markAllRow:          { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm },
  markAll:             { fontSize: 13, fontWeight: '600' },
  card:                { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md, borderWidth: 1, borderRadius: RADIUS.lg, padding: SPACING.md },
  iconCircle:          { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  content:             { flex: 1 },
  cardTitle:           { fontWeight: '700', fontSize: 14 },
  cardMsg:             { fontSize: 13, marginTop: 2, lineHeight: 18 },
  cardTime:            { fontSize: 11, marginTop: 4 },
  unreadDot:           { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  empty:               { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText:           { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptySub:            { fontSize: 13, textAlign: 'center', paddingHorizontal: 32 },
  modalOverlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  filterCard:          { borderRadius: RADIUS.xl, padding: SPACING.xl, width: '85%' },
  filterTitle:         { fontSize: 16, fontWeight: '700', marginBottom: 4, textAlign: 'center' },
  filterSub:           { fontSize: 14, fontWeight: '600', marginBottom: SPACING.md, marginTop: SPACING.sm },
  filterOption:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1 },
  filterOptionText:    { fontSize: 14 },
  radio:               { width: 22, height: 22, borderRadius: 11, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  radioDot:            { width: 10, height: 10, borderRadius: 5 },
});