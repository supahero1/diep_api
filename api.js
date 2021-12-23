function diep_api() {
  "use strict";
  return Symbol.for("diep.api");
}
(async function() {
  "use strict";
  function log(...a) {
    console.log("[diep.api]", ...a);
  }
  function err(...a) {
    console.log("[diep.api.err]", ...a);
  }
  const win = typeof unsafeWindow == "undefined" ? window : unsafeWindow;
  if(!document.body || win.input || document.getElementById("canvas")) {
    return err("a script tried launching diep.api without \"@run-at\" set to \"document-body\" or a one-time timing error has occured");
  }
  const api_ = diep_api();
  if(win[api_]) {
    return;
  }
  
  const api = {
    version: "v0.1.5",
    
    events: new Map,
    
    canvas_ready: false,
    game_ready: false,
    
    player: {
      x: NaN,
      y: NaN
    },
    mouse: {
      x: NaN,
      y: NaN
    },
    minimap: {
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
    },
    
    on: function(what, cb) {
      let set = this.events.get(what);
      if(!set) {
        set = new Set([cb]);
        this.events.set(what, set);
        return;
      }
      set.add(cb);
    },
    once: function(what, cb) {
      const func = function() {
        this.remove(what, func);
        cb();
      }.bind(this);
      this.on(what, func);
    },
    emit: function(what, ...args) {
      const set = this.events.get(what);
      if(!set) {
        return;
      }
      for(const cb of set) {
        cb(...args);
      }
    },
    remove: function(what, cb) {
      if(typeof cb == "undefined") {
        this.events.delete(what);
        return;
      }
      this.events.get(what)?.delete(cb);
    }
  };
  
  const key = Symbol("diep.api.key");
  Reflect.defineProperty(win, api_, {
    value: {
      version: function() {
        return api.version;
      },
      canvas_ready: function() {
        return api.canvas_ready;
      },
      game_ready: function() {
        return api.game_ready;
      },
      on: function(what, cb) {
        if(typeof what == "undefined" || typeof cb != "function") {
          throw new Error("Invalid arguments to api.on()");
          return;
        }
        return api.on(what, cb);
      },
      once: function(what, cb) {
        if(typeof what == "undefined" || typeof cb != "function") {
          throw new Error("Invalid arguments to api.once()");
          return;
        }
        return api.once(what, cb);
      },
      remove: function(what, cb) {
        if(typeof what == "undefined" || typeof cb != "function") {
          throw new Error("Invalid arguments to api.remove()");
          return;
        }
        return api.remove(what, cb);
      }
    },
    configurable: false,
    enumerable: false
  });
  Object.freeze(win[api_]);
  win.api = api;
  win.api_ = win[api_];
  log("init " + api.version);
  
  Reflect.defineProperty(win, "input", {
    set: function(to) {
      delete win.input;
      win.input = to;
      api.game_ready = true;
      api.emit("ready");
    },
    get: function() {
      return undefined;
    },
    configurable: true
  });
  
  win.Module = {};
  
  const rAF = win.requestAnimationFrame;
  win.requestAnimationFrame = new Proxy(win.requestAnimationFrame, {
    apply: function(to, what, args) {
      const ret = Reflect.apply(to, what, args);
      if(args[0].toString().startsWith("function Browser_mainLoop_runner()")) {
        api.emit("draw");
      }
      return ret;
    }
  });
  
  await new Promise(function(resolve) {
    new MutationObserver(function(list, observer) {
      list.forEach(function(mut) {
        if(mut.addedNodes[0].id == "canvas") {
          api.canvas_ready = true;
          api.emit("pre.ready");
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
  
  function calculate_minimap() {
    api.minimap.normal.x = canvas.width - ratio * 0.179;
    api.minimap.normal.y = canvas.height - ratio * 0.179;
    api.minimap.normal.side = ratio * 0.159;
    
    api.minimap.extended.x = canvas.width - ratio * 0.2;
    api.minimap.extended.y = canvas.height - ratio * 0.2;
    api.minimap.extended.side = ratio * 0.2;
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
    
    requestAnimationFrame(dynamic_update);
  }
  requestAnimationFrame(dynamic_update);
  
  api.once("ready", function() {
    log("ready");
    
  });
})();
