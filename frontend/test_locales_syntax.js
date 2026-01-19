try {
    const locales = require('./src/i18n/locales.js');
    console.log('Locales loaded successfully');
    // Also check keys structure if needed
    console.log('Keys in en:', Object.keys(locales.default.en));
    console.log('Keys in ar:', Object.keys(locales.default.ar));
} catch (e) {
    console.error('Error loading locales:', e.message);
    if (e.message.includes('Unexpected token')) {
        console.error('Likely syntax error in locales.js');
    }
}
