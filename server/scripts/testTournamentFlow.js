const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your_long_random_jwt_secret_key_minimum_32_characters';
const BASE_URL = 'http://localhost:5000/api/v1';

const adminToken = jwt.sign(
  {
    uid: 'superadmin_test',
    email: 'admin@zuna.com',
    role: 'superadmin',
    admin: true,
  },
  JWT_SECRET,
  { expiresIn: '1h' }
);

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`,
    ...options.headers,
  };

  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function runTests() {
  console.log('--- Testing Tournament Management API Flow ---');

  // 1. GET tournaments (empty or existing)
  const listRes1 = await request('/admin/tournaments');
  console.log('1. GET /admin/tournaments:', listRes1.status, 'Total:', listRes1.data.data?.total);
  if (listRes1.status !== 200) throw new Error('GET /admin/tournaments failed');

  // 2. Validation Test: missing name and invalid dates
  const badRes = await request('/admin/tournaments', {
    method: 'POST',
    body: JSON.stringify({
      name: '',
      sport: 'Cricket',
      startDate: '2026-11-20',
      endDate: '2026-11-10', // End date before start date!
      registrationStartDate: '2026-11-01',
      registrationEndDate: '2026-11-05',
    }),
  });
  console.log('2. Validation rejection test (expect 400):', badRes.status, badRes.data.error?.message);
  if (badRes.status !== 400) throw new Error('Validation failed to reject invalid tournament');

  // 3. Create Tournament
  const createPayload = {
    name: 'Tamil Nadu Premier Turf Cup 2026',
    description: 'Annual inter-district 7v7 box cricket championship. Professional live streaming and trophies.',
    sport: 'Cricket',
    venueName: 'Kovai Champions Turf Arena',
    city: 'Coimbatore',
    startDate: '2026-11-20',
    endDate: '2026-11-22',
    registrationStartDate: '2026-10-15',
    registrationEndDate: '2026-11-15',
    entryFee: 1500,
    prizePool: 50000,
    prizeDetails: {
      firstPrize: '₹30,000 + Championship Trophy',
      secondPrize: '₹15,000 + Silver Cup',
      thirdPrize: '₹5,000',
      manOfTheSeries: 'Custom Cricket Kit',
    },
    participantCapacity: 16,
    format: 'knockout',
    rules: '1. 7 overs per side.\n2. Only turf shoes permitted.\n3. Umpire decisions are final.\n4. Reporting time: 8:00 AM.',
    bannerUrl: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=800&q=80',
    status: 'draft',
    contactPhone: '9876543210',
    contactEmail: 'tournaments@nammaooruturf.com',
  };

  const createRes = await request('/admin/tournaments', {
    method: 'POST',
    body: JSON.stringify(createPayload),
  });
  console.log('3. POST /admin/tournaments:', createRes.status, 'Created ID:', createRes.data.data?.tournament?.id);
  if (createRes.status !== 201) throw new Error('Create tournament failed: ' + JSON.stringify(createRes.data));
  const createdId = createRes.data.data.tournament.id;

  // 4. GET by ID
  const getRes = await request(`/admin/tournaments/${createdId}`);
  console.log('4. GET /admin/tournaments/:id:', getRes.status, 'Name:', getRes.data.data?.tournament?.name);
  if (getRes.status !== 200) throw new Error('GET tournament by ID failed');

  // 5. Update tournament (Edit information)
  const updateRes = await request(`/admin/tournaments/${createdId}`, {
    method: 'PUT',
    body: JSON.stringify({
      prizePool: 60000,
      description: 'Updated description: Added grand award ceremony.',
      participantCapacity: 24,
    }),
  });
  console.log('5. PUT /admin/tournaments/:id:', updateRes.status, 'New prizePool:', updateRes.data.data?.tournament?.prizePool);
  if (updateRes.status !== 200 || Number(updateRes.data.data.tournament.prizePool) !== 60000) {
    throw new Error('Update tournament failed');
  }

  // 6. Update Status (Publish)
  const statusRes = await request(`/admin/tournaments/${createdId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'published' }),
  });
  console.log('6. PATCH /admin/tournaments/:id/status (Publish):', statusRes.status, 'New status:', statusRes.data.data?.tournament?.status);
  if (statusRes.status !== 200 || statusRes.data.data.tournament.status !== 'published') {
    throw new Error('Update tournament status failed');
  }

  // 7. Search & Filter
  const searchRes = await request('/admin/tournaments?search=Tamil&status=published');
  console.log('7. GET /admin/tournaments?search=Tamil&status=published:', searchRes.status, 'Found:', searchRes.data.data?.tournaments?.length);
  if (searchRes.status !== 200 || searchRes.data.data?.tournaments?.length !== 1) {
    throw new Error('Search/filter failed');
  }

  // 8. Delete Tournament
  const deleteRes = await request(`/admin/tournaments/${createdId}`, {
    method: 'DELETE',
  });
  console.log('8. DELETE /admin/tournaments/:id:', deleteRes.status, deleteRes.data.data?.message);
  if (deleteRes.status !== 200) throw new Error('Delete tournament failed');

  // 9. Confirm Deleted
  const verifyRes = await request(`/admin/tournaments/${createdId}`);
  console.log('9. Verification GET deleted (expect 404):', verifyRes.status);
  if (verifyRes.status !== 404) throw new Error('Tournament was not deleted');

  console.log('\n🎉 ALL TOURNAMENT API TESTS PASSED SUCCESSFULLY! 🎉\n');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
