/**
 * Bilingual i18next Configuration (English & Hindi from first commit)
 * NFR: Hindi and English at launch; text scalable to 130%.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { appStorage } from './storage';

const LOCALE_STORAGE_KEY = 'yuvomeet.locale';

export const resources = {
  en: {
    translation: {
      brand: 'Yuvomeet',
      kotaHub: 'Kota, Rajasthan',
      verifiedStudentHub: 'Verified 18+ Community',
      offlineBanner: 'Offline mode · Viewing cached plans & queuing chat messages',
      tabs: {
        feed: 'Discover',
        myPlans: 'My Plans',
        chats: 'Chats',
        account: 'Profile',
      },
      feed: {
        searchPlaceholder: 'Search plans, cafes, or jams...',
        filters: 'Filters',
        all: 'All',
        activeGatherings: 'Active Gatherings',
        spotsLeft: '{{count}} spots left',
        full: 'Full',
        join: 'Join',
        requested: 'Requested',
        joined: 'Joined',
        womenOnlyBadge: 'Women Only · Verified',
        sameCollegeBadge: 'Same Institute',
        partnerVenue: 'Partner Venue',
        emptyTitle: 'No plans match your filters',
        emptySub: 'Try clearing filters or host the first plan in your area!',
        hostCta: 'Host a Plan',
      },
      onboarding: {
        welcomeTitle: 'Find your squad in Kota',
        welcomeSub: 'Verified 18+ group plans at public cafes, riverfront walks & study lounges. No phone numbers shared.',
        getStarted: 'Continue with Phone',
        browseFirst: 'Browse Kota Plans First',
        selectCity: 'Select Your City',
        liveTag: 'Live Now',
        waitlistTag: 'Waitlist',
        waitlistTitle: "We're coming to {{city}} soon!",
        waitlistSub: 'Kota is our first live city. Join the waitlist and we will notify you the day {{city}} opens.',
        phoneTitle: 'Enter your mobile number',
        phoneSub: 'Your number is used only for login and is never shown to any user.',
        sendOtp: 'Send 6-Digit Code',
        otpTitle: 'Verify code',
        otpSub: 'Enter the 6-digit code sent to your mobile',
        verifyContinue: 'Verify & Continue',
        otpLockedTitle: 'Number locked for 30 minutes',
        otpLockedSub: '5 incorrect OTP tries detected (Rule ON-1). Please wait 30 minutes before trying again.',
        consentTitle: 'Your Privacy & Consents',
        consentSub: 'Under DPDP rules, you choose each purpose separately. Nothing is pre-ticked.',
        consentCamera: 'Camera (only when uploading photos or selfie verification)',
        consentLocation: 'One-time Location (only for 150m venue check-in & SOS; never tracked)',
        consentNotifications: 'Notifications (plan approvals, cancellations & group chat)',
        rulesTitle: 'Community Rules',
        rulesSub: 'Yuvomeet is strictly for platonic group plans at approved public venues.',
        rule1: '18+ Verified adults only. Under-18 accounts are permanently blocked.',
        rule2: 'Public approved venues only. Never private flats or residential rooms.',
        rule3: 'Zero tolerance for harassment, creepy behaviour, or sharing phone numbers in group chat.',
        acceptRules: 'I agree to the Community Rules & Safety Policy',
      },
      verify: {
        gateTitle: 'Verify 18+ to Join or Chat',
        gateSub: 'You can browse freely, but joining a plan or chatting requires 1-time DigiLocker 18+ & selfie verification.',
        startVerify: 'Start 60-Second Verification',
        whatWeStore: 'We store only: 18+ verified flag, birth year & gender confirmation.',
        whatWeNeverStore: 'We NEVER store your Aadhaar number, ID photo, full DOB, or address.',
        passTitle: 'You are 18+ Verified!',
        reviewTitle: 'Manual Review in Progress',
        reviewSub: "We're checking your photos by hand. Expect a reply within 24 hours.",
        minorTitle: 'You must be 18 or older',
        minorSub: 'Yuvomeet is for verified adults (18+) only. This account is permanently restricted.',
      },
      safety: {
        sosButton: 'SOS · Emergency',
        sosTitle: 'Emergency & Safety Assistance',
        call112: 'Call 112 Emergency Helpline',
        sendLocationTrusted: 'Send One-Time Location to Trusted Contact',
        sharePlanWhatsapp: 'Share Plan Details on WhatsApp',
        trustedContactTitle: 'Trusted Contact (On-Device Only)',
        trustedContactSub: 'Stored strictly in encrypted storage on your phone. Yuvomeet servers never see this number.',
        reportBlockTitle: 'Report & Block',
        safetyNotice: 'Safety Notice: Meet strictly at public venues. Phone numbers & social handles are blocked in chat.',
      },
    },
  },
  hi: {
    translation: {
      brand: 'युवोमीट (Yuvomeet)',
      kotaHub: 'कोटा, राजस्थान',
      verifiedStudentHub: 'सत्यापित 18+ समुदाय',
      offlineBanner: 'ऑफ़लाइन मोड · सेव किए गए प्लान दिख रहे हैं, चैट संदेश कतार में हैं',
      tabs: {
        feed: 'डिस्कवर',
        myPlans: 'मेरे प्लान',
        chats: 'चैट्स',
        account: 'प्रोफ़ाइल',
      },
      feed: {
        searchPlaceholder: 'प्लान, कैफ़े या स्टडी सेशन खोजें...',
        filters: 'फ़िल्टर',
        all: 'सभी',
        activeGatherings: 'सक्रिय ग्रुप प्लान्स',
        spotsLeft: '{{count}} सीटें बाकी',
        full: 'हाउसफुल',
        join: 'जुड़ें',
        requested: 'अनुरोध भेजा',
        joined: 'शामिल हैं',
        womenOnlyBadge: 'केवल महिलाओं के लिए · सत्यापित',
        sameCollegeBadge: 'समान कोचिंग/कॉलेज',
        partnerVenue: 'पार्टनर कैफ़े',
        emptyTitle: 'कोई प्लान नहीं मिला',
        emptySub: 'फ़िल्टर हटाएँ या अपने एरिया में पहला प्लान होस्ट करें!',
        hostCta: 'प्लान बनाएँ',
      },
      onboarding: {
        welcomeTitle: 'कोटा में अपना सुरक्षित ग्रुप खोजें',
        welcomeSub: 'सार्वजनिक कैफ़े, चंबल रिवरफ्रंट और स्टडी लाउंज में 18+ सत्यापित ग्रुप प्लान्स। बिना फ़ोन नंबर शेयर किए।',
        getStarted: 'मोबाइल नंबर से शुरू करें',
        browseFirst: 'पहले कोटा के प्लान्स देखें',
        selectCity: 'अपना शहर चुनें',
        liveTag: 'लाइव',
        waitlistTag: 'वेटलिस्ट',
        waitlistTitle: 'हम जल्द ही {{city}} आ रहे हैं!',
        waitlistSub: 'कोटा हमारा पहला लाइव शहर है। वेटलिस्ट में जुड़ें, {{city}} शुरू होते ही हम आपको सूचित करेंगे।',
        phoneTitle: 'अपना मोबाइल नंबर दर्ज करें',
        phoneSub: 'आपका नंबर केवल लॉगिन के लिए है और किसी भी यूज़र को कभी नहीं दिखाया जाता।',
        sendOtp: '6-अंकों का कोड भेजें',
        otpTitle: 'कोड सत्यापित करें',
        otpSub: 'आपके मोबाइल पर भेजा गया 6-अंकों का कोड दर्ज करें',
        verifyContinue: 'सत्यापित करें और आगे बढ़ें',
        otpLockedTitle: 'नंबर 30 मिनट के लिए लॉक है',
        otpLockedSub: '5 बार गलत OTP दर्ज किया गया (ON-1)। कृपया 30 मिनट बाद पुनः प्रयास करें।',
        consentTitle: 'आपकी गोपनीयता और सहमति',
        consentSub: 'DPDP नियमों के तहत प्रत्येक अनुमति अलग से चुनें।',
        consentCamera: 'कैमरा (केवल प्रोफ़ाइल फ़ोटो और सेल्फ़ी जांच के समय)',
        consentLocation: 'एक-बार लोकेशन (केवल 150m वेन्यू चेक-इन और SOS के लिए; कभी ट्रैक नहीं होती)',
        consentNotifications: 'नोटिफ़िकेशन (प्लान अपडेट और ग्रुप चैट के लिए)',
        rulesTitle: 'समुदाय के नियम',
        rulesSub: 'युवोमीट केवल सुरक्षित सार्वजनिक स्थानों पर ग्रुप मीटअप के लिए है।',
        rule1: 'केवल 18+ वयस्क। 18 से कम आयु के अकाउंट स्थायी रूप से ब्लॉक किए जाते हैं।',
        rule2: 'केवल अनुमोदित सार्वजनिक कैफ़े और पार्क। निजी कमरे या फ्लैट्स सख्त वर्जित हैं।',
        rule3: 'चैट में फ़ोन नंबर, इंस्टाग्राम हैंडल या अभद्र भाषा पूरी तरह ब्लॉक है।',
        acceptRules: 'मैं समुदाय के नियमों और सुरक्षा नीति से सहमत हूँ',
      },
      verify: {
        gateTitle: 'जुड़ने या चैट करने के लिए 18+ सत्यापन करें',
        gateSub: 'आप प्लान्स देख सकते हैं, लेकिन किसी प्लान में जुड़ने या चैट करने के लिए 1-बार डिजीलॉकर 18+ और सेल्फ़ी जांच आवश्यक है।',
        startVerify: '60-सेकंड सत्यापन शुरू करें',
        whatWeStore: 'हम केवल सहेजते हैं: 18+ सत्यापित स्थिति, जन्म वर्ष और जेंडर पुष्टि।',
        whatWeNeverStore: 'हम आपका आधार नंबर, आईडी फ़ोटो, पूरी जन्मतिथि या पता कभी सेव नहीं करते।',
        passTitle: 'आप 18+ सत्यापित हैं!',
        reviewTitle: 'मैनुअल समीक्षा जारी है',
        reviewSub: 'हम आपकी फ़ोटो की जांच कर रहे हैं। 24 घंटे के भीतर उत्तर मिलेगा।',
        minorTitle: 'आपकी आयु 18 वर्ष या अधिक होनी चाहिए',
        minorSub: 'युवोमीट केवल 18+ वयस्कों के लिए है। यह अकाउंट स्थायी रूप से प्रतिबंधित है।',
      },
      safety: {
        sosButton: 'SOS · आपातकालीन सहायता',
        sosTitle: 'आपातकालीन और सुरक्षा सहायता',
        call112: '112 आपातकालीन हेल्पलाइन पर कॉल करें',
        sendLocationTrusted: 'विश्वसनीय संपर्क को एक-बार लोकेशन भेजें',
        sharePlanWhatsapp: 'व्हाट्सएप पर प्लान का विवरण शेयर करें',
        trustedContactTitle: 'विश्वसनीय संपर्क (केवल आपके फ़ोन पर सुरक्षित)',
        trustedContactSub: 'यह नंबर केवल आपके फ़ोन में एन्क्रिप्टेड रहता है। युवोमीट सर्वर इसे कभी नहीं देखता।',
        reportBlockTitle: 'रिपोर्ट और ब्लॉक करें',
        safetyNotice: 'सुरक्षा सूचना: केवल सार्वजनिक स्थानों पर मिलें। चैट में फ़ोन नंबर और सोशल लिंक ब्लॉक हैं।',
      },
    },
  },
} as const;

const savedLocale = appStorage.getString(LOCALE_STORAGE_KEY);
const initialLocale = savedLocale === 'hi' || savedLocale === 'en' ? savedLocale : 'en';

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: initialLocale,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });
}

export function switchAppLocale(nextLocale: 'en' | 'hi'): void {
  appStorage.set(LOCALE_STORAGE_KEY, nextLocale);
  i18n.changeLanguage(nextLocale);
}

export default i18n;
