const firestoreService = require('../services/firestoreService');
const { sendSuccess, sendError } = require('../utils/response');

const DEFAULT_TURFS = [
  {
    id: 'turf_thunder_arena_perundurai',
    name: 'Thunder Arena Turf',
    city: 'Perundurai',
    address: 'Near Bus Stand, NH-544 Highway, Perundurai, Erode',
    sportTypes: ['Football', 'Cricket', 'Badminton'],
    pricing: { baseRate: 800, weekendRate: 1000, peakHourRate: 1200 },
    images: ['https://images.unsplash.com/photo-1529900241452-f47285514f7b?w=800'],
    rating: { avg: 4.9, count: 64 },
    status: 'active',
  },
  {
    id: 'turf_kickoff_sports_anna_nagar',
    name: 'KickOff Sports Arena',
    city: 'Chennai',
    address: '2nd Avenue, Anna Nagar East, Chennai',
    sportTypes: ['Football', 'Cricket'],
    pricing: { baseRate: 1200, weekendRate: 1500, peakHourRate: 1600 },
    images: ['https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800'],
    rating: { avg: 4.8, count: 92 },
    status: 'active',
  },
  {
    id: 'turf_champions_kodambakkam',
    name: 'Champions Multi-Turf Arena',
    city: 'Chennai',
    address: 'Arcot Road, Near Power House, Kodambakkam, Chennai',
    sportTypes: ['Football', 'Badminton', 'Tennis'],
    pricing: { baseRate: 900, weekendRate: 1100, peakHourRate: 1300 },
    images: ['https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800'],
    rating: { avg: 4.7, count: 53 },
    status: 'active',
  },
  {
    id: 'turf_apex_coimbatore',
    name: 'Apex Sports Arena',
    city: 'Coimbatore',
    address: 'Avinashi Road, Near Peelamedu, Coimbatore',
    sportTypes: ['Football', 'Cricket', 'Volleyball'],
    pricing: { baseRate: 1000, weekendRate: 1200, peakHourRate: 1400 },
    images: ['https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800'],
    rating: { avg: 4.9, count: 71 },
    status: 'active',
  },
  {
    id: 'turf_greenfield_erode',
    name: 'Greenfield Cricket & Football Turf',
    city: 'Erode',
    address: 'Brough Road, Opp. Collectorate, Erode',
    sportTypes: ['Cricket', 'Football'],
    pricing: { baseRate: 750, weekendRate: 950, peakHourRate: 1100 },
    images: ['https://images.unsplash.com/photo-1529900241452-f47285514f7b?w=800'],
    rating: { avg: 4.8, count: 39 },
    status: 'active',
  },
  {
    id: 'turf_smash_goal_velachery',
    name: 'Smash & Goal Sports Complex',
    city: 'Chennai',
    address: '100 Feet Bypass Road, Velachery, Chennai',
    sportTypes: ['Football', 'Cricket', 'Basketball'],
    pricing: { baseRate: 1100, weekendRate: 1350, peakHourRate: 1500 },
    images: ['https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800'],
    rating: { avg: 4.9, count: 85 },
    status: 'active',
  },
];

const wishlistController = {
  /**
   * GET /api/v1/wishlist
   * Fetch complete array of wishlisted turf objects for the authenticated user
   */
  async getWishlist(req, res) {
    const { uid } = req.user;
    const userDoc = await firestoreService.getDoc('users', uid);
    const wishlistIds = userDoc?.wishlist || [];

    const turfObjects = await Promise.all(
      wishlistIds.map(async (id) => {
        let turf = await firestoreService.getDoc('turfs', id);
        if (!turf) {
          turf = DEFAULT_TURFS.find((t) => t.id === id);
        }
        if (!turf) return null;

        const city = turf.city || turf.location?.city || '';
        const address = turf.address || turf.location?.address || '';
        const baseRate = Number(turf.pricing?.baseRate ?? turf.price ?? 800);
        const images = Array.isArray(turf.images) && turf.images.length > 0
          ? turf.images
          : (turf.image ? [turf.image] : ['https://images.unsplash.com/photo-1529900241452-f47285514f7b?w=800']);

        return {
          ...turf,
          _id: turf.id || turf._id,
          id: turf.id || turf._id,
          city,
          address,
          location: { city, address },
          pricing: turf.pricing || { baseRate },
          price: baseRate,
          images,
          image: images[0] || '',
        };
      })
    );

    const validTurfs = turfObjects.filter(Boolean);

    return sendSuccess(res, {
      wishlist: validTurfs,
      count: validTurfs.length,
    });
  },

  /**
   * POST /api/v1/wishlist/:turfId
   * Add a turf to user's saved wishlist
   */
  async addToWishlist(req, res) {
    const { turfId } = req.params;
    const { uid } = req.user;

    const userDoc = await firestoreService.getDoc('users', uid);
    const wishlist = userDoc?.wishlist || [];

    if (!wishlist.includes(turfId)) {
      wishlist.push(turfId);
      await firestoreService.setDoc('users', uid, { wishlist }, true);
    }

    return sendSuccess(res, {
      added: true,
      turfId,
      wishlist,
    });
  },

  /**
   * DELETE /api/v1/wishlist/:turfId
   * Remove a turf from user's saved wishlist
   */
  async removeFromWishlist(req, res) {
    const { turfId } = req.params;
    const { uid } = req.user;

    const userDoc = await firestoreService.getDoc('users', uid);
    let wishlist = userDoc?.wishlist || [];

    wishlist = wishlist.filter((id) => id !== turfId);
    await firestoreService.setDoc('users', uid, { wishlist }, true);

    return sendSuccess(res, {
      added: false,
      turfId,
      wishlist,
    });
  },
};

module.exports = wishlistController;
