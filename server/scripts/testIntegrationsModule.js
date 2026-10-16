const assert = require('assert');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const integrationConfigService = require('../services/integrationConfigService');
const cloudinaryService = require('../services/cloudinaryService');
const razorpayService = require('../services/razorpayService');
const msg91Service = require('../services/msg91Service');
const { encrypt, decrypt, maskSecret, isMasked } = require('../utils/cryptoUtils');

async function runTests() {
  console.log('🧪 Starting API Integration & Usage Monitoring Module Verification...\n');

  // Test 1: Crypto Utils (AES-256-GCM)
  console.log('--- Test 1: AES-256-GCM Encryption, Decryption & Masking ---');
  const secretKey = 'rzp_live_secret_sample_key_9999';
  const encrypted = encrypt(secretKey);
  assert(encrypted.startsWith('enc:'), 'Ciphertext must start with enc: prefix');
  const decrypted = decrypt(encrypted);
  assert.strictEqual(decrypted, secretKey, 'Decrypted text must match original secret');
  const masked = maskSecret(encrypted);
  assert(masked.startsWith('••••••••'), 'Masked output must begin with bullet placeholders');
  assert(masked.endsWith('9999'), 'Masked output must display last 4 characters');
  assert(isMasked(masked), 'isMasked must return true for masked value');
  console.log('✅ Test 1 Passed: Encryption and secret masking verified.\n');

  // Test 2: In-Memory / PostgreSQL Centralized Integration Config
  console.log('--- Test 2: Centralized Integration Configuration Loading ---');
  const maskedConfigs = await integrationConfigService.getAllMasked();
  assert(maskedConfigs.msg91, 'MSG91 provider must exist');
  assert(maskedConfigs.cloudinary, 'Cloudinary provider must exist');
  assert(maskedConfigs.razorpay, 'Razorpay provider must exist');

  // Verify secrets are NOT leaked in maskedConfigs
  assert(!JSON.stringify(maskedConfigs).includes(process.env.CLOUDINARY_API_SECRET), 'Real Cloudinary secret must not appear in masked config payload');
  console.log('✅ Test 2 Passed: Centralized configuration loaded and secrets masked.\n');

  // Test 3: Save Configuration with Secret Preservation
  console.log('--- Test 3: Save Configuration with Secret Preservation ---');
  const initialCloudConfig = await integrationConfigService.getCloudinaryConfig();
  await integrationConfigService.saveConfig('cloudinary', {
    isEnabled: true,
    credentials: {
      cloudName: initialCloudConfig.cloudName,
      apiKey: initialCloudConfig.apiKey,
      apiSecret: '••••••••h4mo', // Pass masked secret to verify preservation
      uploadPreset: 'Turf-App-Updated',
    },
  });

  const updatedCloudConfig = await integrationConfigService.getCloudinaryConfig();
  assert.strictEqual(updatedCloudConfig.uploadPreset, 'Turf-App-Updated', 'Upload preset should be updated');
  assert.strictEqual(updatedCloudConfig.apiSecret, initialCloudConfig.apiSecret, 'Existing API secret must be preserved when masked value is supplied');
  console.log('✅ Test 3 Passed: Dynamic configuration saved and secret preservation verified.\n');

  // Test 4: Cloudinary Live Connection Test & Usage
  console.log('--- Test 4: Cloudinary Connection Test & Live Usage Metrics ---');
  const cloudTest = await cloudinaryService.testConnection();
  assert.strictEqual(cloudTest.success, true, 'Cloudinary test connection should succeed');
  assert.strictEqual(cloudTest.status, 'ok', 'Cloudinary ping status should be ok');
  console.log('Cloudinary Ping Result:', cloudTest);

  const cloudUsage = await cloudinaryService.getUsage();
  assert.strictEqual(cloudUsage.available, true, 'Cloudinary usage should be available');
  assert(typeof cloudUsage.objects?.used === 'number', 'Objects count must be a number');
  console.log(`Cloudinary Assets: ${cloudUsage.objects?.used}, Storage: ${(cloudUsage.storage?.usedBytes / (1024*1024)).toFixed(2)} MB`);
  console.log('✅ Test 4 Passed: Cloudinary connection test & real usage metrics verified.\n');

  // Test 5: Razorpay Live Transaction Stats & Key Retrieval
  console.log('--- Test 5: Razorpay Dynamic Key Retrieval & Transaction Metrics ---');
  const razorKeyId = await razorpayService.getActiveKeyId();
  assert(razorKeyId, 'Razorpay Key ID must be retrievable');

  const razorStats = await razorpayService.getPaymentStats();
  assert.strictEqual(razorStats.available, true, 'Payment statistics should be available from DB');
  console.log('Razorpay Metrics:', razorStats.metrics);
  console.log('✅ Test 5 Passed: Razorpay dynamic adoption and transaction aggregation verified.\n');

  // Test 6: MSG91 Widget Configuration & Verification Interface
  console.log('--- Test 6: MSG91 Widget Configuration & Interface ---');
  const msgConfig = await integrationConfigService.getMsg91Config();
  assert.strictEqual(msgConfig.widgetId, '366a7065614c383633313238', 'Widget ID must match SecureOTPWidgetEJAO default');
  assert.strictEqual(msgConfig.widgetName, 'SecureOTPWidgetEJAO', 'Widget name must match');

  // Verify that empty access token rejects cleanly with helpful message
  try {
    await msg91Service.verifyWidgetAccessToken('');
    assert.fail('Empty access token should throw error');
  } catch (err) {
    assert(err.message.includes('required'), 'Empty access token error must be friendly');
  }
  console.log('✅ Test 6 Passed: MSG91 widget configuration and verification interface validated.\n');

  console.log('🎉 ALL INTEGRATION MODULE TESTS PASSED SUCCESSFULLY! (6/6)');
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  });
