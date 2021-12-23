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
  const win = typeof unsafeWindow == "undefined" ? window : unsafeWindow;
  if(win.input || document.getElementById("canvas") != undefined) {
    return err("a script tried launching diep.api without \"@run-at\" set to \"document-body\" or a one-time timing error has occured");
  }
  const api = diep_api();
  if(win[api]) {
    return;
  }
  
  const key = Symbol("diep.api.key");
  Reflect.defineProperty(win, api, {
    value: new class {
      #events;
      constructor() {
        this.#events = new Map;
        this.version = "v0.1.3";
        
        this.player = {
          x: NaN,
          y: NaN,
          mouse: {
            x: NaN,
            y: NaN
          }
        };
        
        this.minimap = {
          normal: {
            x: NaN,
            y: NaN,
            side: NaN
          },
          extended: {
            x: NaN,
            y: NaN,
            side: NaN
          }
        }
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
      emit(k, what, ...args) {
        if(typeof k == "undefined" || k != key) {
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
      remove(what, cb, k) {
        if(typeof cb == "undefined") {
          if(typeof k == "undefined" || k != key) {
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
  
  function diep_api_emit(what, ...args) {
    win[api].emit(key, what, ...args);
  }
  function diep_api_remove(what, cb) {
    win[api].remove(what, cb, key);
  }
  
  Reflect.defineProperty(win, "input", {
    set: function(to) {
      delete win.input;
      win.input = to;
      diep_api_emit("ready");
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
          diep_api_emit(key, "pre.ready");
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
  
  win.minimap = {
    normal: [1.875, 1.75],
    extended: [2, 2],
    drawn: [1.875, 1.75]
  };
  function calculate_minimap() {
    win[api].minimap.normal.x = canvas.width - ratio * win.minimap.drawn[0];
    win[api].minimap.normal.y = canvas.height - ratio * win.minimap.drawn[0];
    win[api].minimap.normal.side = ratio * win.minimap.drawn[1];
    
    
  }
  
  function dynamic_update() {
    pixel_scale = win.devicePixelRatio;
    if(canvas.width != win.innerWidth * pixel_scale || canvas.height != win.innerHeight * pixel_scale) {
      /* Diep.io does not handle this */
      canvas.width = win.innerWidth * pixel_scale;
      canvas.height = win.innerHeight * pixel_scale;
    }
    ratio = get_ratio();
    scale = get_scale();
    
    calculate_minimap();
    
    ctx.save();
    ctx.beginPath();
    ctx.fillStyle = "#800000A0";
    ctx.fillRect(win[api].minimap.normal.x, win[api].minimap.normal.y, win[api].minimap.normal.side, win[api].minimap.normal.side);
    ctx.restore();
    
    requestAnimationFrame(dynamic_update);
  }
  requestAnimationFrame(dynamic_update);
})();
