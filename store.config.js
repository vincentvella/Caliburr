module.exports = {
  configVersion: 0,

  apple: {
    copyright: `${new Date().getFullYear()} Vellapps LLC`,

    version: '1.0.0',

    categories: ['FOOD_AND_DRINK', 'UTILITIES'],

    info: {
      'en-US': {
        title: 'Caliburr',
        subtitle: 'Coffee dial-in companion',
        privacyPolicyUrl: 'https://caliburr.coffee/privacy',
        supportUrl: 'https://caliburr.coffee/support',
        marketingUrl: 'https://caliburr.coffee',
        description: `Caliburr is the crowdsourced coffee dial-in companion for espresso enthusiasts.

Log your grinder settings, dose, yield, and brew time — then browse the community's recipes to find the perfect starting point for any bean or machine.

DIAL IN FASTER
• Browse recipes filtered by grinder, bean, and brew method
• See community-aggregated grind settings so you know where to start
• Log your own recipes and track what works

YOUR EQUIPMENT, YOUR RECIPES
• Add your grinder and espresso machine from a verified database
• Save recipes to your profile and build your personal dial-in history
• Like recipes from the community to save them for later

BUILT FOR THE COMMUNITY
• Verify equipment entries to keep the database accurate
• Contribute your own recipes to help others dial in the same setup
• Anonymous community feed keeps recipes visible even after account deletion`,
        keywords: [
          'coffee',
          'espresso',
          'dial in',
          'grinder',
          'barista',
          'recipe',
          'brew',
          'dose',
          'yield',
          'extraction',
        ],
        releaseNotes: 'Initial release.',
        // Screenshots uploaded manually — EAS Metadata doesn't support 6.9" (APP_IPHONE_69) yet.
        // Re-add here when @expo/apple-utils adds APP_IPHONE_69 support.
      },
    },

    review: {
      firstName: 'Vince',
      lastName: 'Vella',
      email: process.env.EXPO_REVIEW_EMAIL || 'vincevella0@gmail.com',
      phone: process.env.EXPO_REVIEW_PHONE || '+13029936460',
      demoUsername: '',
      demoPassword: '',
      notes: 'No login required to browse. Use the Sign Up flow to create a free account and access the full app.',
    },

    advisory: {
      alcoholTobaccoOrDrugUseOrReferences: 'NONE',
      contests: 'NONE',
      gamblingSimulated: 'NONE',
      sexualContentGraphicAndNudity: 'NONE',
      sexualContentOrNudity: 'NONE',
      horrorOrFearThemes: 'NONE',
      matureOrSuggestiveThemes: 'NONE',
      medicalOrTreatmentInformation: 'NONE',
      profanityOrCrudeHumor: 'NONE',
      violenceCartoonOrFantasy: 'NONE',
      violenceRealistic: 'NONE',
      violenceRealisticProlongedGraphicOrSadistic: 'NONE',
      unrestrictedWebAccess: false,
      gambling: false,
      kidsAgeBand: null,
      ageRatingOverride: 'NONE',
      koreaAgeRatingOverride: 'NONE',
      lootBox: false,
    },
  },
};
