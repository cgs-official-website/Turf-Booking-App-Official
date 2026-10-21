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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';
import useTheme from '../hooks/useTheme';
import TournamentCard from '../components/TournamentCard';
import { getAvailableTournamentsApi, getMyTournamentsApi, getCachedAvailableTournaments } from '../api/tournaments';
import { SPACING, RADIUS, SHADOW } from '../utils/theme';

export default function TournamentScreen({ navigation }) {
  const { C, dark } = useTheme();
  const { token, user } = useSelector((s) => s.auth);

  const [activeTab, setActiveTab] = useState('available'); // 'available' | 'my'
  const cachedAvailable = getCachedAvailableTournaments();
  const [availableTournaments, setAvailableTournaments] = useState(cachedAvailable?.tournaments || []);
  const [myTournaments, setMyTournaments] = useState([]);
  const [loadingAvailable, setLoadingAvailable] = useState(!cachedAvailable);
  const [loadingMy, setLoadingMy] = useState(false);
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

  useEffect(() => {
    loadAvailable();
  }, [loadAvailable]);

  useEffect(() => {
    if (activeTab === 'my') {
      loadMy();
    }
  }, [activeTab, loadMy]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (activeTab === 'available') {
      await loadAvailable();
    } else {
      await loadMy();
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

      {/* ── Dual Tab Selector ── */}
      <View style={[styles.tabsWrap, { backgroundColor: C.bgSoft, borderColor: C.border }]}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'available' && [
              styles.tabButtonActive,
              { backgroundColor: C.card, borderColor: '#0F766E' },
              SHADOW.subtle,
            ],
          ]}
          onPress={() => setActiveTab('available')}
          activeOpacity={0.8}
        >
          <Feather
            name="compass"
            size={14}
            color={activeTab === 'available' ? '#0F766E' : C.subtext}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'available' ? '#0F766E' : C.subtext },
              activeTab === 'available' && styles.tabTextActive,
            ]}
          >
            Available ({availableTournaments.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'my' && [
              styles.tabButtonActive,
              { backgroundColor: C.card, borderColor: '#0F766E' },
              SHADOW.subtle,
            ],
          ]}
          onPress={() => setActiveTab('my')}
          activeOpacity={0.8}
        >
          <Feather
            name="user"
            size={14}
            color={activeTab === 'my' ? '#0F766E' : C.subtext}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'my' ? '#0F766E' : C.subtext },
              activeTab === 'my' && styles.tabTextActive,
            ]}
          >
            My Tournaments ({myTournaments.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Tab Content Lists ── */}
      {activeTab === 'available' ? (
        <FlatList
          data={availableTournaments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />
          }
          ListEmptyComponent={renderAvailableEmpty}
          renderItem={({ item }) => (
            <TournamentCard
              tournament={item}
              onPress={() => navigation.navigate('TournamentDetail', { tournamentId: item.id })}
              onShare={handleShare}
            />
          )}
        />
      ) : (
        <FlatList
          data={myTournaments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0F766E']} />
          }
          ListEmptyComponent={renderMyEmpty}
          renderItem={({ item }) => (
            <TournamentCard
              tournament={item}
              onPress={() => navigation.navigate('TournamentDetail', { tournamentId: item.id })}
              onShare={handleShare}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
  tabsWrap: {
    flexDirection: 'row',
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    padding: 4,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  tabButton: {
    flex: 1,
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
    fontSize: 13,
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
