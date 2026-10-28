import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Share,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';
import useTheme from '../hooks/useTheme';
import TournamentCard from '../components/TournamentCard';
import Pagination from '../components/Pagination';
import { getAvailableTournamentsApi, getMyTournamentsApi, getCompletedTournamentsApi, getCachedAvailableTournaments } from '../api/tournaments';
import { SPACING, RADIUS, SHADOW } from '../utils/theme';

export default function TournamentScreen({ navigation }) {
  const { C, dark } = useTheme();
  const { token, user } = useSelector((s) => s.auth);

  const [activeTab, setActiveTab] = useState('available'); // 'available' | 'open' | 'completed' | 'my'
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 6;
  const cachedAvailable = getCachedAvailableTournaments();
  const [availableTournaments, setAvailableTournaments] = useState(cachedAvailable?.tournaments || []);
  const [myTournaments, setMyTournaments] = useState([]);
  const [loadingAvailable, setLoadingAvailable] = useState(!cachedAvailable);
  const [completedTournaments, setCompletedTournaments] = useState([]);
  const [loadingMy, setLoadingMy] = useState(false);
  const [loadingCompleted, setLoadingCompleted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadAvailable = useCallback(async () => {
    try {
      const res = await getAvailableTournamentsApi();
      setAvailableTournaments(res?.tournaments || []);
    } catch (err) {
      console.warn('Error loading available tournaments:', err.message);
    } finally {
      setLoadingAvailable(false);
    }
  }, []);

  const loadMy = useCallback(async () => {
    if (!token) return;
    try {
      setLoadingMy(true);
      const res = await getMyTournamentsApi();
      setMyTournaments(res?.tournaments || []);
    } catch (err) {
      console.warn('Error loading my tournaments:', err.message);
    } finally {
      setLoadingMy(false);
    }
  }, [token]);

  const loadCompleted = useCallback(async () => {
    try {
      setLoadingCompleted(true);
      const res = await getCompletedTournamentsApi();
      setCompletedTournaments(res?.tournaments || []);
    } catch (err) {
      console.warn('Error loading completed tournaments:', err.message);
    } finally {
      setLoadingCompleted(false);
    }
  }, []);

  useEffect(() => {
    loadAvailable();
    loadCompleted(); // so the Completed (n) count is right from the start
  }, [loadAvailable, loadCompleted]);

  useEffect(() => {
    if (activeTab === 'my') {
      loadMy();
    }
  }, [activeTab, loadMy]);

  const openTournaments = availableTournaments.filter((t) => t.lifecycleStatus === 'registration_open');

  const matchesSearch = (t) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const hay = [t.name, t.sport, t.turf?.name, t.turfName, t.location, t.city, t.area, t.creatorName]
      .filter(Boolean).join(' ').toLowerCase();
    return hay.includes(q);
  };

  const baseList =
    activeTab === 'my' ? myTournaments
      : activeTab === 'completed' ? completedTournaments
        : activeTab === 'open' ? openTournaments
          : availableTournaments;
  const filteredList = baseList.filter(matchesSearch);
  const totalPages = Math.max(1, Math.ceil(filteredList.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedList = filteredList.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [activeTab, searchQuery]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (activeTab === 'my') {
      await loadMy();
    } else if (activeTab === 'completed') {
      await loadCompleted();
    } else {
      await Promise.all([loadAvailable(), loadCompleted()]);
    }
    setRefreshing(false);
  };

  const handleShare = async (tournament) => {
    try {
      const isCricket = String(tournament.sport || '').toLowerCase().includes('cricket');
      const shareUrl =
        tournament.shareableUrl ||
        `https://turfbookingapp.com/tournament/${tournament.shareableIdentifier || tournament.id}`;
      await Share.share({
        title: tournament.name,
        message: `🏆 Check out "${tournament.name}" (${tournament.sport}) on Namma Ooru Turf!\n\n📅 ${tournament.startDate} to ${tournament.endDate}\n👥 ${tournament.numberOfTeams} Teams (${tournament.playersPerTeam} players/team)${isCricket && tournament.oversPerTeam ? `\n🏏 ${tournament.oversPerTeam} Overs` : ''}\n\nView details:\n${shareUrl}`,
      });
    } catch (_) { }
  };

  const renderAvailableEmpty = () => {
    if (loadingAvailable) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={[styles.loadingText, { color: C.subtext }]}>Loading turf tournaments...</Text>
        </View>
      );
    }

    return (
      <View style={[styles.emptyContainer, { backgroundColor: C.card, borderColor: C.border }, SHADOW.subtle]}>
        <View style={[styles.emptyIconCircle, { backgroundColor: '#CCFBF1' }]}>
          <Feather name="award" size={32} color="#0F766E" />
        </View>
        <Text style={[styles.emptyTitle, { color: C.text }]}>No Turf Tournaments Right Now</Text>
        <Text style={[styles.emptySubtitle, { color: C.subtext }]}>
          Turf owners publish exciting leagues and cups here. Check back soon or create your own community tournament!
        </Text>
        <TouchableOpacity
          style={[styles.createCtaBtn, { backgroundColor: '#0F766E' }]}
          onPress={() => navigation.navigate('CreateTournament')}
          activeOpacity={0.85}
        >
          <Feather name="plus-circle" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.createCtaText}>Create Community Tournament</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderCompletedEmpty = () => {
    if (loadingCompleted) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0F766E" />
          <Text style={[styles.loadingText, { color: C.subtext }]}>Loading completed tournaments...</Text>
        </View>
      );
    }
    return (
      <View style={[styles.emptyContainer, { backgroundColor: C.card, borderColor: C.border }, SHADOW.subtle]}>
        <View style={[styles.emptyIconCircle, { backgroundColor: '#CCFBF1' }]}>
          <Feather name="check-circle" size={32} color="#0F766E" />
        </View>
        <Text style={[styles.emptyTitle, { color: C.text }]}>No Completed Tournaments Yet</Text>
        <Text style={[styles.emptySubtitle, { color: C.subtext }]}>
          Finished tournaments with their results will show up here.
        </Text>
      </View>
    );
  };

  const renderMyEmpty = () => {
    if (!token) {
      return (
        <View style={[styles.emptyContainer, { backgroundColor: C.card, borderColor: C.border }, SHADOW.subtle]}>
          <View style={[styles.emptyIconCircle, { backgroundColor: '#CCFBF1' }]}>
            <Feather name="lock" size={30} color="#0F766E" />
          </View>
          <Text style={[styles.emptyTitle, { color: C.text }]}>Log In to View Your Tournaments</Text>
          <Text style={[styles.emptySubtitle, { color: C.subtext }]}>
            Sign in to create, publish, and manage your community sports tournaments.
          </Text>
          <TouchableOpacity
            style={[styles.createCtaBtn, { backgroundColor: '#0F766E' }]}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.85}
          >
            <Text style={styles.createCtaText}>Log In to Your Account</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (loadingMy) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0F766E" />
          <Text style={[styles.loadingText, { color: C.subtext }]}>Loading your tournaments...</Text>
        </View>
      );
    }

    return (
      <View style={[styles.emptyContainer, { backgroundColor: C.card, borderColor: C.border }, SHADOW.subtle]}>
        <View style={[styles.emptyIconCircle, { backgroundColor: '#CCFBF1' }]}>
          <Ionicons name="trophy-outline" size={32} color="#0F766E" />
        </View>
        <Text style={[styles.emptyTitle, { color: C.text }]}>No Tournaments Created Yet</Text>
        <Text style={[styles.emptySubtitle, { color: C.subtext }]}>
          Host cricket matches, football shootouts, or badminton leagues with your teammates and friends!
        </Text>
        <TouchableOpacity
          style={[styles.createCtaBtn, { backgroundColor: '#0F766E' }]}
          onPress={() => navigation.navigate('CreateTournament')}
          activeOpacity={0.85}
        >
          <Feather name="plus-circle" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.createCtaText}>Create My First Tournament</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.bg }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} backgroundColor={C.bg} />

      {/* ── Top Header ── */}
      <View style={[styles.headerRow, { borderBottomColor: C.border }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: C.card, borderColor: C.border }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={20} color={C.text} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: C.text }]}>Tournaments</Text>
          <Text style={[styles.headerSubtitle, { color: C.subtext }]}>
            Explore turf cups & community leagues
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.headerCreateBtn, { backgroundColor: '#0F766E' }]}
          onPress={() => navigation.navigate('CreateTournament')}
          activeOpacity={0.8}
        >
          <Feather name="plus" size={16} color="#FFFFFF" />
          <Text style={styles.headerCreateBtnText}>Create</Text>
        </TouchableOpacity>
      </View>

      {/* ── Search ── */}
      <View style={[styles.searchBox, { backgroundColor: C.card, borderColor: C.border }]}>
        <Feather name="search" size={16} color={C.subtext} />
        <TextInput
          style={[styles.searchInput, { color: C.text }]}
          placeholder="Search tournaments, sport, turf..."
          placeholderTextColor={C.subtext}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="x-circle" size={16} color={C.subtext} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Tab Selector ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={[styles.tabsWrap, { backgroundColor: C.bgSoft, borderColor: C.border }]}
      >
        {[
          { key: 'available', icon: 'compass', label: `Available (${availableTournaments.length})` },
          { key: 'open', icon: 'unlock', label: `Open (${openTournaments.length})` },
          { key: 'completed', icon: 'check-circle', label: `Completed (${completedTournaments.length})` },
          { key: 'my', icon: 'user', label: `Mine (${myTournaments.length})` },
        ].map((tab) => {
          const on = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tabButton,
                on && [styles.tabButtonActive, { backgroundColor: C.card, borderColor: '#0F766E' }, SHADOW.subtle],
              ]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.8}
            >
              <Feather name={tab.icon} size={13} color={on ? '#0F766E' : C.subtext} style={{ marginRight: 5 }} />
              <Text
                numberOfLines={1}
                style={[styles.tabText, { color: on ? '#0F766E' : C.subtext }, on && styles.tabTextActive]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Tab Content List ── */}
      <FlatList
        data={pagedList}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0F766E']} />
        }
        ListEmptyComponent={
          searchQuery.trim()
            ? (
              <View style={[styles.emptyContainer, { backgroundColor: C.card, borderColor: C.border }, SHADOW.subtle]}>
                <View style={[styles.emptyIconCircle, { backgroundColor: '#CCFBF1' }]}>
                  <Feather name="search" size={30} color="#0F766E" />
                </View>
                <Text style={[styles.emptyTitle, { color: C.text }]}>No Matching Tournaments</Text>
                <Text style={[styles.emptySubtitle, { color: C.subtext }]}>Try a different name, sport or turf.</Text>
              </View>
            )
            : (activeTab === 'my' ? renderMyEmpty() : (activeTab === 'completed' ? renderCompletedEmpty() : renderAvailableEmpty()))
        }
        ListFooterComponent={
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onChange={setPage}
            theme={{ primary: '#0F766E', card: C.card, border: C.border, text: C.text, subtext: C.subtext }}
          />
        }
        renderItem={({ item }) => (
          <TournamentCard
            tournament={item}
            onPress={() => navigation.navigate('TournamentDetail', { tournamentId: item.id })}
            onShare={handleShare}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    gap: 8,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  headerCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.md,
  },
  headerCreateBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 3,
  },
  tabsScroll: {
    flexGrow: 0,
    flexShrink: 0,
    minHeight: 52,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  tabsWrap: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  tabButton: {
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
  },
  tabButtonActive: {
    borderWidth: 1,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tabTextActive: {
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  centerContainer: {
    paddingVertical: 50,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
  },
  emptyContainer: {
    padding: SPACING.xl,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 18,
  },
  createCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  createCtaText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
