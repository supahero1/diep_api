function diep_api() {
  "use strict";
  return Symbol.for("diep.api");
}
(async function() {
  "use strict";
  function log(...a) {
    console.log("[diep.api] " + a.join(""));
  }
  function err(...a) {
    console.log("[diep.api.err] " + a.join(""));
  }
  const win = unsafeWindow || window;
  if(win.input || document.getElementById("canvas") != undefined) {
    return err("a script tried launching diep.api without \"@run-at\" set to \"document-body\" or a one-time timing error has occured");
  }
  const api = diep_api();
  if(win[api]) {
    return;
  }
  
  let event_emitter_safe_switch = false;
  function safe_api_call() {
    event_emitter_safe_switch = true;
  }
  Reflect.defineProperty(win, api, {
    value: new class {
      #events;
      constructor() {
        this.#events = new Map;
        this.version = "v0.1.1";
        
        this.player = {
          x: NaN,
          y: NaN,
          mouse: {
            x: NaN,
            y: NaN
          }
        };
      }
      on(what, cb) {
        let set = this.#events.get(what);
        if(!set) {
          set = new Set([cb]);
          this.#events.set(what, set);
          return;
        }
        set.add(cb);
      }
      emit(what, ...args) {
        if(event_emitter_safe_switch) {
          event_emitter_safe_switch = false;
        } else {
          throw new Error("This function is reserved for internal use.");
          return;
        }
        const set = this.#events.get(what);
        if(!set) {
          return;
        }
        for(const cb of set) {
          cb(...args);
        }
      }
      remove(what, cb) {
        if(typeof cb == "undefined") {
          if(event_emitter_safe_switch) {
            event_emitter_safe_switch = false;
          } else {
            throw new Error("This function is reserved for internal use.");
            return;
          }
          this.#events.delete(what);
          return;
        }
        this.#events.get(what)?.delete(cb);
      }
    },
    configurable: false,
    enumerable: false
  });
  Reflect.preventExtensions(win[api]);
  log("init " + win[api].version);
  
  Reflect.defineProperty(win, "input", {
    set: function(to) {
      delete win.input;
      win.input = to;
      win[api].emit("ready");
      log("ready");
    },
    get: function() {
      return undefined;
    },
    configurable: true
  });
  
  win.Module = {};
  
  await new Promise(function(resolve) {
    new MutationObserver(function(list, observer) {
      list.forEach(function(mut) {
        if(mut.addedNodes[0].id == "canvas") {
          win[api].emit("pre.ready");
          observer.disconnect();
          resolve();
        }
      });
    }).observe(document.body, { childList: true });
  });
  
  const c = win.CanvasRenderingContext2D;
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  
  let pixel_scale = win.devicePixelRatio;
  canvas.width = win.innerWidth * pixel_scale;
  canvas.height = win.innerHeight * pixel_scale;
  let ui_scale = 1;
  
  function get_ratio() {
    if(canvas.height * 16 / 9 >= canvas.width) {
      return canvas.height * ui_scale;
    } else {
      return canvas.width / 16 * 9 * ui_scale;
    }
  }

  function get_scale() {
    if(canvas.height * 16 / 9 >= canvas.width) {
      return canvas.height / 1080;
    } else {
      return canvas.width / 1920;
    }
  }
  
  let ratio = get_ratio();
  let scale = get_scale();
  
  function dynamic_update() {
    pixel_scale = win.devicePixelRatio;
    if(canvas.width != win.innerWidth * pixel_scale || canvas.height != win.innerHeight * pixel_scale) {
      /* Diep.io does not handle this */
      canvas.width = win.innerWidth * pixel_scale;
      canvas.height = win.innerHeight * pixel_scale;
    }
    ratio = get_ratio();
    scale = get_scale();
    
    requestAnimationFrame(dynamic_update);
  }
  requestAnimationFrame(dynamic_update);
})();
