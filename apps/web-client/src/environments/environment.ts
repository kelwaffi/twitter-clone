// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  AUTH_API_URI: `http://localhost:4001/api`,
  USER_API_URI: `http://localhost:4002/api`,
  POST_API_URI: `http://localhost:4000/api`,
  GOOGLE_CLIENT_ID:
    '525983998154-k5sq532ue4d0cv9dmrqelsoapnc6m7og.apps.googleusercontent.com',

  WS_POST: 'http://localhost:4000',
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
