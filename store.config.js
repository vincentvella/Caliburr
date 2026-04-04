/** @type {import('@expo/eas-cli').StoreConfig} */
module.exports = {
  configVersion: 0,
  apple: {
    copyright: `${new Date().getFullYear()} Vince Vella`,

    categories: ['FOOD_AND_DRINK', 'LIFESTYLE'],

    advisory: {
      alcoholTobaccoOrDrugUseOrReferences: 'NONE',
      contests: 'NONE',
      gambling: false,
      gamblingSimulated: 'NONE',
      horrorOrFearThemes: 'NONE',
      kidsAgeBand: null,
      matureOrSuggestiveThemes: 'NONE',
      medicalOrTreatmentInformation: 'NONE',
      profanityOrCrudeHumor: 'NONE',
      sexualContentGraphicAndNudity: 'NONE',
      sexualContentOrNudity: 'NONE',
      unrestrictedWebAccess: false,
      violenceCartoonOrFantasy: 'NONE',
      violenceRealistic: 'NONE',
      violenceRealisticProlongedGraphicOrSadistic: 'NONE',
    },

    release: {
      automaticRelease: true,
      phasedRelease: true,
    },

    info: {
      'en-US': {
        title: 'Caliburr',
        subtitle: 'Coffee Dial-In Community',
        description: `Caliburr is the community recipe database for specialty coffee enthusiasts who want to dial in the perfect cup.

Browse thousands of crowd-sourced recipes organized by grinder, bean, and brew method. See exactly what grind setting, dose, yield, and brew time other coffee lovers are using with the same equipment — then dial in your own.

FIND YOUR RECIPE
• Search by grinder model, bean origin, or brew method
• Filter by espresso, pour over, AeroPress, French Press, Chemex, and more
• See aggregated grind settings across the community for your exact grinder

SHARE YOUR DIALS
• Log your grind setting, dose, yield, brew time, water temperature, and tasting notes
• Tag your bean with roaster, origin, process, and roast level
• Your recipes help others with the same gear find a great starting point

YOUR GEAR, YOUR RECIPES
• Add your grinders and machines to your profile
• Get personalized recipe recommendations filtered to your equipment
• Star your default grinder to pre-fill new recipes instantly

COMMUNITY VERIFICATION
• Community members verify equipment listings for accuracy
• 5 confirmations from unique users marks equipment as verified
• Verified equipment data helps everyone dial in faster

Whether you're chasing a floral Ethiopian espresso, a balanced Kenyan pour over, or a classic French Press, Caliburr helps you skip the frustrating guesswork and start brewing great coffee faster.`,

        keywords: [
          'coffee',
          'espresso',
          'grinder',
          'dial in',
          'pour over',
          'brew',
          'recipe',
          'barista',
          'specialty coffee',
          'aeropress',
        ],

        promoText:
          'The community recipe database for dialing in your perfect cup of coffee.',

        marketingUrl: 'https://caliburr.coffee',
        supportUrl: 'https://caliburr.coffee/support',
        privacyPolicyUrl: 'https://caliburr.coffee/privacy',

        releaseNotes: 'Initial release — welcome to Caliburr!',
      },
    },

    review: {
      firstName: 'Vince',
      lastName: 'Vella',
      email: 'vincevella0@gmail.com',
      phone: '+1 (000) 000-0000', // TODO: replace with real phone number
      demoRequired: false,
      notes:
        'This is a community recipe database for specialty coffee. No account is required to browse recipes. To submit or like recipes, sign up with any email address. The app connects to a Supabase backend for authentication and data.',
    },
  },
};
