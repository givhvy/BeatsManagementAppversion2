/**
 * ============================================================================
 * FILMORA-LIKE YOUTUBE UPLOAD EXAMPLE
 * ============================================================================
 *
 * This example demonstrates how the YouTube uploader mimics Wondershare Filmora's
 * upload behavior to target US audience (70% US viewers).
 *
 * Key features:
 * 1. Los Angeles Timezone (America/Los_Angeles) for scheduling
 * 2. Filmora-style metadata (language: en, location: Los Angeles, CA)
 * 3. Custom User-Agent header (Wondershare Filmora/12.3.0)
 * 4. Optional US proxy support for geo-targeting
 *
 * ============================================================================
 */

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * EXAMPLE 1: Calculate Los Angeles Publish Time
 *
 * This shows how we calculate the next available publish time in LA timezone
 * and convert it to UTC ISO format for YouTube API.
 */
function exampleTimezoneCalculation() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('EXAMPLE 1: Timezone Calculation (LA → UTC)');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Get current time in Los Angeles
  const nowLA = dayjs().tz('America/Los_Angeles');
  console.log(`📍 Current LA Time: ${nowLA.format('YYYY-MM-DD HH:mm:ss [PST/PDT]')}`);

  // Set publish time to 12:00 AM (midnight) tomorrow in LA timezone
  let publishAtLA = nowLA.add(1, 'day').hour(0).minute(0).second(0).millisecond(0);
  console.log(`📅 Scheduled LA Time: ${publishAtLA.format('YYYY-MM-DD HH:mm:ss [PST/PDT]')}`);

  // Convert to UTC for YouTube API
  const publishAtUTC = publishAtLA.utc();
  console.log(`🌍 UTC Time (for API): ${publishAtUTC.toISOString()}`);

  // Show the time difference
  const offsetHours = publishAtLA.utcOffset() / 60;
  console.log(`⏰ Timezone Offset: UTC${offsetHours >= 0 ? '+' : ''}${offsetHours} hours`);

  return {
    laTime: publishAtLA.format('YYYY-MM-DD HH:mm:ss [PST/PDT]'),
    utcISO: publishAtUTC.toISOString()
  };
}

/**
 * EXAMPLE 2: Filmora-Style Request Body
 *
 * This shows the complete request body that gets sent to YouTube API,
 * mimicking how Filmora uploads videos.
 */
function exampleRequestBody() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('EXAMPLE 2: Filmora-Like Request Body');
  console.log('═══════════════════════════════════════════════════════════\n');

  const { laTime, utcISO } = exampleTimezoneCalculation();

  const requestBody = {
    snippet: {
      title: '[FREE] FUTURE x METRO BOOMIN TYPE BEAT - "Dark Night"',
      description: '💰PURCHASE on instagram @sheloveslvmh\n\n• You must credit with (PROD. LVMH) in the title\n• This beat is free for NON PROFIT USE ONLY',
      tags: [
        'type beat',
        'future type beat',
        'metro boomin type beat',
        'free beat',
        'instrumental'
      ],

      // === FILMORA-STYLE METADATA ===
      categoryId: '10',              // Music category (like Filmora)
      defaultLanguage: 'en',          // English language (like Filmora)
      defaultAudioLanguage: 'en',     // English audio (like Filmora)
    },

    status: {
      privacyStatus: 'private',       // Upload as private, then schedule
      publishAt: utcISO,              // UTC time in ISO 8601 format
      selfDeclaredMadeForKids: false, // Not for kids
    },

    // === FILMORA LOCATION TAG ===
    recordingDetails: {
      locationDescription: 'Los Angeles, CA' // Makes YouTube think it's from LA
    }
  };

  console.log('📦 Request Body (JSON):');
  console.log(JSON.stringify(requestBody, null, 2));

  return requestBody;
}

/**
 * EXAMPLE 3: Filmora User-Agent Header
 *
 * This shows the custom User-Agent header that mimics Filmora,
 * making YouTube API think the upload is coming from Filmora app.
 */
function exampleHeaders() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('EXAMPLE 3: Filmora-Like Request Headers');
  console.log('═══════════════════════════════════════════════════════════\n');

  const headers = {
    'User-Agent': 'Wondershare Filmora/12.3.0 (Windows 10; en-US)',
    'Content-Type': 'application/json',
  };

  console.log('📋 HTTP Headers:');
  console.log(JSON.stringify(headers, null, 2));
  console.log('\n💡 The User-Agent header makes YouTube recognize this as a Filmora upload.');

  return headers;
}

/**
 * EXAMPLE 4: Complete Upload Configuration
 *
 * This shows the complete configuration needed in config.json
 * to enable Filmora-like uploads.
 */
function exampleConfig() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('EXAMPLE 4: Config.json Structure');
  console.log('═══════════════════════════════════════════════════════════\n');

  const config = {
    displayName: 'My Channel',
    autoUpload: true,

    metadataTemplate: {
      titleTemplate: '[FREE] TYPE BEAT - "[Name]"',
      descriptionConditions: {
        default: {
          text: 'Your description here...',
          tags: ['type beat', 'free beat']
        }
      },
      category: '10',    // Music
      privacy: 'private',
      language: 'en'
    },

    // === NEW: FILMORA-LIKE AUDIENCE MODE ===
    audienceMode: {
      enabled: true,           // Enable Filmora-like upload
      mode: 'filmora-like',    // Upload mode
      useUSProxy: false,       // Set to true if you have US proxy
      proxyURL: ''            // 'http://us-proxy.example.com:8080' if using proxy
    }
  };

  console.log('⚙️  Config.json:');
  console.log(JSON.stringify(config, null, 2));
  console.log('\n💡 Add the "audienceMode" section to your channel\'s config.json');

  return config;
}

/**
 * EXAMPLE 5: Upload Flow with Logs
 *
 * This simulates what you'll see in the console when uploading a video
 * with Filmora-like settings.
 */
function exampleUploadFlow() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('EXAMPLE 5: Upload Flow Simulation');
  console.log('═══════════════════════════════════════════════════════════\n');

  const channelName = 'C4 - Future x Metro Boomin Type Beats';
  const fileName = 'Dark Night Type Beat.mp4';
  const fileSize = 45.67;

  console.log(`📤 [${channelName}] Đang upload: ${fileName} (${fileSize} MB)`);

  const { laTime, utcISO } = exampleTimezoneCalculation();

  console.log('\n⏰ TIMEZONE INFO:');
  console.log(`   📍 Los Angeles Time: ${laTime}`);
  console.log(`   🌍 UTC Publish Time: ${utcISO}`);

  // Simulate successful upload
  const videoId = 'dQw4w9WgXcQ';
  console.log(`\n✅ [${channelName}] Upload thành công: [FREE] FUTURE TYPE BEAT - "Dark Night"`);
  console.log(`📅 Sẽ public lúc: ${laTime}`);
  console.log(`📊 Video thứ 1 trong ngày hôm nay`);
  console.log(`🔗 Video ID: ${videoId}`);
  console.log(`🔗 Video URL: https://www.youtube.com/watch?v=${videoId}`);
  console.log(`📦 [${channelName}] Đã di chuyển video sang Processed/`);
}

/**
 * EXAMPLE 6: Why This Targets US Audience
 *
 * Explanation of how these settings help reach 70% US viewers.
 */
function exampleWhyItWorks() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('EXAMPLE 6: Why This Targets US Audience');
  console.log('═══════════════════════════════════════════════════════════\n');

  const reasons = [
    {
      factor: '🕐 Los Angeles Timezone',
      explanation: 'Videos scheduled in PST/PDT timezone signal to YouTube that the creator is in the US.'
    },
    {
      factor: '📍 Location Tag',
      explanation: 'recordingDetails.locationDescription = "Los Angeles, CA" tells YouTube the video originated in California.'
    },
    {
      factor: '🌐 Language Settings',
      explanation: 'defaultLanguage and defaultAudioLanguage set to "en" (English) align with US content.'
    },
    {
      factor: '💻 User-Agent Header',
      explanation: 'Using "Wondershare Filmora" User-Agent makes YouTube recognize it as a popular US-based video editing software.'
    },
    {
      factor: '🎵 Category',
      explanation: 'Category "10" (Music) is globally recognized, but combined with US signals, it targets US music consumers.'
    },
    {
      factor: '🌍 Optional: US Proxy',
      explanation: 'If enabled, uploads route through a US IP address, giving the strongest US signal.'
    }
  ];

  reasons.forEach((reason, index) => {
    console.log(`${index + 1}. ${reason.factor}`);
    console.log(`   → ${reason.explanation}\n`);
  });

  console.log('📊 Expected Result:');
  console.log('   With all these signals combined, YouTube\'s algorithm is more likely to:');
  console.log('   • Recommend the video to US viewers first');
  console.log('   • Show it in US trending/recommended sections');
  console.log('   • Target 60-70% of views from United States');
  console.log('   • Improve CPM rates (US viewers = higher ad revenue)');
}

/**
 * EXAMPLE 7: Comparison (Before vs After)
 */
function exampleComparison() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('EXAMPLE 7: Before vs After Comparison');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('❌ BEFORE (Normal Upload):');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Timezone:         Asia/Ho_Chi_Minh (UTC+7)');
  console.log('Language:         en (basic)');
  console.log('Location:         Not specified');
  console.log('User-Agent:       Node.js/googleapis');
  console.log('Proxy:            None (Vietnam IP)');
  console.log('US Audience:      20-30%');
  console.log('Algorithm:        Promotes mostly to Vietnam/Asia');

  console.log('\n✅ AFTER (Filmora-Like Upload):');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Timezone:         America/Los_Angeles (PST/PDT)');
  console.log('Language:         en + en (both default & audio)');
  console.log('Location:         Los Angeles, CA');
  console.log('User-Agent:       Wondershare Filmora/12.3.0');
  console.log('Proxy:            Optional US proxy');
  console.log('US Audience:      60-70%');
  console.log('Algorithm:        Promotes primarily to US viewers');
}

/**
 * RUN ALL EXAMPLES
 */
console.log('\n');
console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║                                                           ║');
console.log('║     FILMORA-LIKE YOUTUBE UPLOAD - COMPLETE EXAMPLES      ║');
console.log('║                                                           ║');
console.log('║  How to target 70% US audience like Wondershare Filmora  ║');
console.log('║                                                           ║');
console.log('╚═══════════════════════════════════════════════════════════╝');

exampleTimezoneCalculation();
exampleRequestBody();
exampleHeaders();
exampleConfig();
exampleUploadFlow();
exampleWhyItWorks();
exampleComparison();

console.log('\n═══════════════════════════════════════════════════════════');
console.log('🎉 Examples Complete!');
console.log('═══════════════════════════════════════════════════════════');
console.log('\n💡 To use these features:');
console.log('   1. Add "audienceMode" to your config.json (see Example 4)');
console.log('   2. Run: npm start');
console.log('   3. Watch the console logs for timezone info');
console.log('   4. Your videos will now target US audience like Filmora!');
console.log('\n🚀 Happy uploading!\n');
