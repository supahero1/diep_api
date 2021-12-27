# Welcome to diep.api
## Effortlessly interact with diep.io and make your scripts compatible with others.

# Contents

- [Requirements](#requirements)
- [Description](#description)
- [Limitations](#limitations)
- [Usage](#usage)
  - [Events and overrides](#events-and-overrides)
  - [Overriding anyway](#overriding-anyway)
  - [Keyboard and mouse](#keyboard-and-mouse)
  - [Game state](#game-state)
  - [Examples](#examples)

# Requirements
This API must be added to any userscript which wishes to use it. Having said that, it's not recommended to just copy paste the code. Instead, you should tweak your userscript meta information to include the following line:
```js
// @require     https://raw.githubusercontent.com/supahero1/diep_api/main/api.min.js
```
You must also add the following line:
```js
// @run-at      document-body
```
Or modify the existing `run-at` meta with `document-body`. If your script needs to be ran before that, you probably don't need the API. If you do, consider creating 2 userscripts.

The API will keep refreshing the game if the above requirement isn't met. It might also happen from time to time that it will refresh the page right after the page is loaded in case the userscript is loaded too late for some reason. However, most of the time it should work perfectly.

# Description
This API is only canvas-based and will try to always stay like that unless forced otherwise. This means the API is basically unbreakable by new updates, unless they really change a lot about how things are drawn in the client.

Pull requests are more than welcome, but remember to only base on the canvas and not any WASM or memory-related tricks, unless you are sure they will never break, like for instance looking for a specific string in a memory. Even though, remember strings can also be represented as numbers, and endianness needs to be taken care of.

The API has minimal overhead, not noticable on normal performance statistics. Even though, some people might claim that this is not true, because clearly in the performance statistics on chromium the API functions stay on the top. While this might be true for `drawImage` and a few other functions, this is only an illusion - these functions are overridden by the API and that's why the API call will stay on top - if you see more of the stack trace, you will notice that actually over 99% of the call's overhead is the underlying game's code and not the API.

This API is retina-screen-compatible and enables the support for moving diep.io between screens of different pixel density. In addition, screen pixel ratio can be changed at any time, even from the browser console (`devicePixelRatio = some_value`). The script works in all window configurations and sizes and on all screen resolutions. Moreover, using `Ctrl + -/+` doesn't work with the API - use `devicePixelRatio = some_value` instead.

The API doesn't create any name clashes, because it is using [symbols](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol). It is possible to access the API from the window, because there's no built-in way for different userscripts to communicate between each other on the same domain, or no way that I know of. Other than that, the API is creating proxies to not be detected by the game's anti-extension checks.

# Limitations
The API allows for a whole range of interactions, but also has a few restrictions to make it work the way it does. The following actions are **strongly disencouraged**, as they might break the API:
- Using the game's built-in console (accessed using the HOME key),
- Drawing outside of `draw` or `draw.background` events (when using certain canvas functions),
- Overriding existing overrides the API employs (use events instead, see [events and overrides](#events-and-overrides)),
- Somehow turning off the background's grid lines, the background altogether, the minimap's viewport, the minimap altogether, the pattern grid.

As of now, the API silently ignores the request to change grid opacity to 0 and sets it to 0.001 instead. Moreover, viewport is displayed, but is completely hidden by the API, and it's impossible to set `ren_pattern_grid` to false. However, that is only possible due to the `input.set_convar()` and `input.execute()` overrides. If changed otherwise, for instance using the game's built-in console or with `api.execute()`, these overrides won't work and the API will break.

# Usage
To start using the API from a userscript, you first need to get its object:
```js
const api = diep_api();
```

The object cannot have any of its properties modified - it's frozen. It's only a mean of communicating with the core API object. No userscript can directly alter any property of the core API object.

The object is also an event emitter:
```js
api.on("event_name", handler); // Add a handler
api.once("event_name", handler); // Add a handler, remove it after it fires once
api.remove("event_name", handler); // Remove that handler
```

## Events and overrides
Userscripts can listen to 3 events to start themselves up:
- The `canvas` event is fired when the canvas is created,
- The `input` event is fired when `window.input` exists,
- The `ready` event is fired when the game is fully loaded. At this event, `api.module` is fully initialised.

The API overrides the functions listed below and more. You shouldn't override them again - instead, listen to their respective events:
- `canvas.onmousemove`: below
- `window.onmousemove`: `pre.mouse.move` and `mouse.move`
- `canvas.onmousedown`: below
- `window.onmousedown`: `pre.mouse.down` and `mouse.down`
- `canvas.onmouseup`: below
- `window.onmouseup`: `pre.mouse.up` and `mouse.up`
- `window.onkeydown`: `pre.key.down` and `key.down`
- `window.onkeyup`: `pre.key.up` and `key.up`
- `window.onresize`: `resize`

`pre` events are always fired, no matter if the event will actually be passed down to the game. Events without `pre` are only called if the event succeed. See the [Keyboard and mouse](#keyboard-and-mouse) section to learn more about keyboard and mouse events and how to control them.

The `death` and `spawn` events are fired when the player dies or spawns, respectively.

The `draw` event is fired after the game finishes drawing, meaning anything drawn during that event will be layered __on top__ of the game's drawings. **DO NOT** call `requestAnimationFrame` from within the handler to this event and the event below, unless you know what you are doing.

The `draw.background` event is fired right after the game finishes drawing the background (grid and borders) and before anything else is drawn on top. If your code needs to draw something in the background, so that it doesn't stay on top of players, shapes, and the UI, you should use this function.

The API also overrides `input.execute`. If you **must** bypass any checks and behavior triggered by the override, use `api.execute()`. There's no equivalent for `set_convar` - you must use `execute` instead.

# Overriding anyway
If you must override something, the API exposes a few useful functions to do so without being instantly detected by the underlying game's code:
- `api.inject_before(a, b)` calls `b()` before `a()` is called. All arguments of `a()` are also passed to `b()`,
- `api.inject_after(a, b)` is the same as above, but `b()` is called after `a()`,
- `api.override(a, b)` calls `b()` instead of `a()` and passes arguments of `a()` to `b()`,
- `api.override_extended(a, b)` is the same as above, but the first (additional) argument to `b()` is `a` so that it can be called from within `b()`.

For instance, if you wanted to know whenever `input.mouse()` is called and with what arguments, you could do:
```js
input.mouse = api.inject_before(input.mouse, function(x, y) {
  console.log("mouse coords are:", x, y);
});

// or

input.mouse = api.inject_after(input.mouse, function(x, y) {
  console.log("mouse coords are:", x, y);
});

// or

input.mouse = api.override(input.mouse, function(x, y) {
  console.log("mouse coords are:", x, y);
});
// but then the real input.mouse() will never be called

// or

input.mouse = api.override_extended(input.mouse, function(fn, x, y) {
  console.log("mouse coords are:", x, y);
  return fn.apply(this, [x, y]); // calling the original function
});
```

# Keyboard and mouse
The API, due to overriding some keyboard and mouse handlers, supports stopping them altogether:
- Make the game not respond to any keys using `api.preventing_keys = true`,
- Make the game not respond to any mouse presses using `api.preventing_mouse_buttons = true`,
- Make the game not respond to any mouse movement using `api.preventing_mouse_movement = true`.

You can revert any of the above by replacing `true` with `false` and retrying.

Due to stopping of the above, keyboard and mouse events are actually 2 different events. The one with `pre` will always be called before the event is even processed, while the one without `pre` will only be called if the event is deemed valid by the game and if it's not stopped by the above control behavior.

# Game state
The API helps collect information about a bunch of things, for instance the player's position on the map. Any userscript can then use that information in any way.

The full structure of the API's information:
| Member of the API (api.[member]) | Description |
| --- | --- |
| `version` | current version of the API |
| `canvas_ready` | whether or not the `canvas` event has been fired |
| `input_ready` | whether or not the `input` event has been fired |
| `game_ready` | whether or not the `ready` event has been fired |
| `canvas` | the game's canvas element |
| `ctx` | the game's canvas drawing context |
| `scale` | the same as `ratio`, but in range (0, 1] |
| `ui_scale` | the same as above, but takes the UI scale into account. Use this for things like minimap or scoreboard and `scale` for everything else |
| `in_game` | a boolean, "in game" meaning alive, not on deathscreen, not in the main menu |
| `module` | returns the game's Module object. It starts existing before the `ready` event, but isn't fully initialised |
| `player` | an object with player tank's position on the map |
| `camera` | an object with player camera's position on the map and Field of View |
| `mouse` | an object with player mouse's position on the screen and on the map |
| `minimap` | an object with `normal` and `extended` minimap coordinates, as well as map top-left and bottom-right corners |
| `map_size` | a number denoting the map's absolute size in pixels, not counting in the space within the borders |
| `typing` | boolean, if you need to do something specific when the user is typing instead of playing the game. It must be set by userscripts, for userscripts |
| `viewport_color` | `fillStyle` for the viewport |
| `viewport_opacity` | `globalAlpha` for the viewport |
| `to_map(x, y)` | turn coordinates from the screen into in-game map coordinates, like mouse position |
| `to_screen(x, y)` | turn in-game map coordinates into screen coordinates, examples below |
| `to_minimap(x, y)` | turn in-game map coordinates into coordinates on the minimap |
| `execute(str)` | if you ever felt the need of bypassing the API's override of `input.execute()` |
| `on(what, handler)` | look [usage](#usage) and [events and overrides](#events-and-overrides) |
| `once(what, handler)` | look [usage](#usage) and [events and overrides](#events-and-overrides) |
| `remove(what, handler)` | look [usage](#usage) and [events and overrides](#events-and-overrides) |
| `inject_before(fn, cb)` | look [overriding](#overriding-anyway) |
| `inject_after(fn, cb)` | look [overriding](#overriding-anyway) |
| `override(fn, cb)` | look [overriding](#overriding-anyway) |
| `override_extended(fn, cb)` | look [overriding](#overriding-anyway) |

The `player` object consists of:
- `raw_x`: the x coordinate of the player arrow on the minimap,
- `raw_y`: the y coordinate of the player arrow on the minimap,
- `x`: normalized map position of the player's x coordinate,
- `y`: normalized map position of the player's y coordinate.

The `camera` object is the same as `player`, with these differences:
- `fov`: the player's normalized Field of View. The lower it is, the greater the FoV.

The `mouse` object is the same as `player`.

The `minimap` object consists of:
- `start_x`: normalized x coordinate of the map's top-left corner,
- `start_y`: normalized y coordinate of the map's top-left corner,
- `end_x`: normalized x coordinate of the map's bottom-right corner,
- `end_y`: normalized y coordinate of the map's bottom-right corner,
- `normal`:
  - `x`: screen x coordinate of the "normal" (outskirts excluded) minimap's top-left corner,
  - `y`: screen y coordinate of the "normal" minimap's top-left corner,
  - `side`: width and height of the "normal" minimap
- `extended`: 
  - `x`: screen x coordinate of the "extended" (outskirts included) minimap's top-left corner,
  - `y`: screen y coordinate of the "extended" minimap's top-left corner,
  - `side`: width and height of the "extended" minimap.

# Examples
Drawing the user's player, mouse, and camera position on the minimap can be found in [here](examples/1.user.js).

Drawing a dashed circle from the middle of the map all the way to its borders and which rotates when FoV changes can be found in [here](examples/2.user.js).