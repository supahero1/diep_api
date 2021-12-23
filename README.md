# diep_api
Compability &amp; API exposing userscript to diep.io. WIP. All changes published here are the effect of development, not to use in userscripts yet.

# Requirements
`@run-at` must be set to `document-body`.
To include this API, also add `@require` set to `https://cdn.jsdelivr.net/gh/supahero1/diep_api/api.js`.

# Usage
The API can be accessed via:
```js
const api = diep_api();
const win = unsafeWindow || window;

win[api];
```

The `win[api]` object is an EventEmitter:
```js
win[api].on("ready", some_func); // Add a handler
win[api].remove("ready", some_func); // Remove that handler
```

## Startup

Scripts can listen to 2 events denoting different phases of diep.io initialisation:
- `pre.ready` is fired when the canvas element is created,
- `ready` is fired when the game is fully loaded.