/* Site configuration.
 *
 * 1) SIGNUP SHEET (optional): paste your Google Apps Script web-app URL to log
 *    "play without signing in" entries to a Sheet. See SETUP-SIGNUPS.md.
 *
 * 2) FIREBASE (for Google login + cloud profile + points): paste your Firebase
 *    web config below. See SETUP-FIREBASE.md for the step-by-step guide.
 *
 * Until these are set, the app works fully — Google login just won't appear,
 * and play stays on-device.
 */
window.APP_CONFIG = {
  signupEndpoint: '', // e.g. 'https://script.google.com/macros/s/AKfy.../exec'

  // Firebase web app config (from Firebase console).
  firebase: {
    apiKey: 'AIzaSyB6_hMtoGnUbljYEahcOkR-hVylPDPoOvU',
    authDomain: 'pogogy.firebaseapp.com',
    projectId: 'pogogy',
    storageBucket: 'pogogy.firebasestorage.app',
    messagingSenderId: '273851741331',
    appId: '1:273851741331:web:a995ff18095cf799140966',
    measurementId: 'G-8RDTJBKCWP'
  }
};
