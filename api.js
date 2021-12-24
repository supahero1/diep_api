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
    err("a script tried launching diep.api without \"@run-at\" set to \"document-body\" or a one-time timing error has occured");
    win.location.reload();
  }
  const api_ = diep_api();
  if(win[api_]) {
    return;
  }
  
  const api = {
    version: "v0.1.6",
    
    events: new Map,
    
    canvas_ready: false,
    game_ready: false,
    
    drew_player_pos: false,
    drawing: false,
    
    background_color: "#cdcdcd",
    grid_color: "#000000",
    grid_opacity: 0.05,
    ui_scale: 1,
    
    pos_phase: 0,
    pos_phase0: [NaN, NaN],
    pos_phase1: [NaN, NaN],
    
    prevent_mouse_movement: false,
    prevent_mouse_buttons: false,
    prevent_keys: false,
    typing: false,
    
    player: {
      x: NaN,
      y: NaN,
      fov: NaN
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
    },
    
    in_game: function() {
      return this.drew_player_pos;
    },
    within_minimap: function(x, y) {
      return (x >= this.minimap.extended.x && y >= this.minimap.extended.y && x <= this.minimap.extended.x + this.minimap.extended.side && y <= this.minimap.extended.y + this.minimap.extended.side);
    },
    
    inject_before: function(fn, cb) {
      return new Proxy(fn, {
        apply: function(to, what, args) {
          cb.apply(what, args);
          return to.apply(what, args);
        }
      });
    },
    inject_after: function(fn, cb) {
      return new Proxy(fn, {
        apply: function(to, what, args) {
          const ret = to.apply(what, args);
          cb.apply(what, args);
          return ret;
        }
      });
    },
    override: function(fn, cb) {
      return new Proxy(fn, {
        apply: function(to, what, args) {
          return cb.apply(what, args);
        }
      });
    },
    override_extended: function(fn, cb) {
      return new Proxy(fn, {
        apply: function(to, what, args) {
          return cb.apply(what, [to, ...args]);
        }
      })
    }
  };
  
  const key = Symbol("diep.api.key");
  Reflect.defineProperty(win, api_, {
    value: new class {
      get version() {
        return api.version;
      }
      get canvas_ready() {
        return api.canvas_ready;
      }
      get game_ready() {
        return api.game_ready;
      }
      
      on(what, cb) {
        if(typeof what == "undefined" || typeof cb != "function") {
          throw new Error("Invalid arguments to api.on()");
          return;
        }
        return api.on(what, cb);
      }
      once(what, cb) {
        if(typeof what == "undefined" || typeof cb != "function") {
          throw new Error("Invalid arguments to api.once()");
          return;
        }
        return api.once(what, cb);
      }
      remove(what, cb) {
        if(typeof what == "undefined" || typeof cb != "function") {
          throw new Error("Invalid arguments to api.remove()");
          return;
        }
        return api.remove(what, cb);
      }
      
      set preventing_mouse_movement(bool) {
        api.prevent_mouse_movement = !!bool;
      }
      set preventing_mouse_buttons(bool) {
        api.prevent_mouse_buttons = !!bool;
      }
      set preventing_keys(bool) {
        api.prevent_keys = !!bool;
      }
      set typing(bool) {
        bool = !!bool;
        win.setTyping(bool);
        api.typing = bool;
      }
      
      inject_before(fn, cb) {
        if(typeof fn != "function" || typeof cb != "function") {
          throw new Error("Invalid arguments to api.inject_before()");
          return;
        }
        return api.inject_before(fn, cb);
      }
      inject_after(fn, cb) {
        if(typeof fn != "function" || typeof cb != "function") {
          throw new Error("Invalid arguments to api.inject_after()");
          return;
        }
        return api.inject_after(fn, cb);
      }
      override(fn, cb) {
        if(typeof fn != "function" || typeof cb != "function") {
          throw new Error("Invalid arguments to api.override()");
          return;
        }
        return api.override(fn, cb);
      }
      override_extended(fn, cb) {
        if(typeof fn != "function" || typeof cb != "function") {
          throw new Error("Invalid arguments to api.override_extended()");
          return;
        }
        return api.override_extended(fn, cb);
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
      api.emit("input");
      
      api.game_ready = true;
      api.emit("ready");
    },
    get: function() {
      return undefined;
    },
    configurable: true
  });
  
  win.Module = {};
  
  win.requestAnimationFrame = new Proxy(win.requestAnimationFrame, {
    apply: function(to, what, args) {
      if(args[0].toString().startsWith("function Browser_mainLoop_runner()")) {
        api.drawing = true;
        api.drew_player_pos = false;
      }
      const ret = to.apply(what, args);
      if(api.drawing) {
        api.drawing = false;
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
          api.emit("canvas");
          observer.disconnect();
          resolve();
        }
      });
    }).observe(document.body, { childList: true });
  });
  
  const c = win.CanvasRenderingContext2D.prototype;
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  
  let pixel_scale = win.devicePixelRatio;
  canvas.width = Math.floor(win.innerWidth * pixel_scale);
  canvas.height = Math.floor(win.innerHeight * pixel_scale);
  
  function get_ratio() {
    if(canvas.height * 16 / 9 >= canvas.width) {
      return canvas.height * api.ui_scale;
    } else {
      return canvas.width / 16 * 9 * api.ui_scale;
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
    const x = Math.floor(win.innerWidth * pixel_scale);
    const y = Math.floor(win.innerHeight * pixel_scale);
    if(canvas.width != x || canvas.height != y) {
      canvas.width = x;
      canvas.height = y;
    }
    
    ratio = get_ratio();
    scale = get_scale();
    
    calculate_minimap();
    
    requestAnimationFrame(dynamic_update);
  }
  requestAnimationFrame(dynamic_update);
  
  function modify_diep_methods(to) {
    log("onresize set");
    delete win.onresize;
    win.onresize = api.override(to, function(){});
    win.addEventListener("resize", function() {
      canvas.width = Math.floor(win.innerWidth * pixel_scale);
      canvas.height = Math.floor(win.innerHeight * pixel_scale);
      
      ratio = get_ratio();
      scale = get_scale();
      
      calculate_minimap();
      
      api.emit("resize");
    });
    win.onerror = api.override(win.onerror, function(){});
    win.onbeforeunload = api.override(win.onbeforeunload, function(e) {
      if(win.input.should_prevent_unload()) {
        e.preventDefault();
        e.returnValue = "";
        return "Are you sure you wanna quit?";
      } else {
        delete e.returnValue;
      }
    });
    canvas.onmousemove = api.override(canvas.onmousemove, function(){});
    win.onmousemove = function(e) {
      api.emit("pre.mouse.move", e);
      if(api.prevent_mouse_movement) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }
      win.input.mouse(e.clientX * pixel_scale, e.clientY * pixel_scale);
      
      api.emit("mouse.move", e);
    };
    canvas.onmousedown = api.override(canvas.onmousedown, function(){});
    win.onmousedown = function(e) {
      api.emit("pre.mouse.down", e);
      
      if(api.prevent_mouse_buttons) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }
      if(e.button >= 0 && e.button <= 2) {
        win.input.keyDown(e.button + 1);
      }
      
      api.emit("mouse.down", e);
    };
    canvas.onmouseup = api.override(canvas.onmouseup, function(){});
    win.onmouseup = function(e) {
      api.emit("pre.mouse.up", e);
      
      if(api.prevent_mouse_buttons) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }
      if(e.button >= 0 && e.button <= 2) {
        win.input.keyUp(e.button + 1);
      }
      
      api.emit("mouse.up", e);
    };
    win.onkeydown = api.override_extended(win.onkeydown, function(fn, e) {
      api.emit("pre.key.down", e);
      
      if(api.prevent_keys) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }
      fn.call(this, e);
      
      api.emit("key.down", e);
    });
    win.onkeyup = api.override_extended(win.onkeyup, function(fn, e) {
      api.emit("pre.key.up", e);
      
      if(api.prevent_keys) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }
      fn.call(this, e);
      
      api.emit("key.up", e);
    });
    
    win.input.execute = api.override_extended(win.input.execute, function(fn, str) {
      str = str.trim().replace(/\s{2,}/g, " ");
      const s = str.split(" ");
      switch(s[0]) {
        case "ren_ui_scale": {
          api.ui_scale = parseFloat(s[1]);
          break;
        }
        case "ren_grid_base_alpha": {
          api.grid_opacity = Math.max(0.001, parseFloat(s[1]) / 2);
          str = str.replace(s[1], (api.grid_opacity * 2).toString());
          break;
        }
        case "ren_grid_color": {
          api.grid_color = "#" + parseInt(s[1]).toString(16).padStart(6, "0");
          break;
        }
        case "ren_background_color": {
          api.background_color = "#" + parseInt(s[1]).toString(16).padStart(6, "0");
          break;
        }
      }
      return fn.call(this, str);
    });
    win.input.set_convar = api.override(win.input.set_convar, function(...args) {
      return win.input.execute.call(this, args.join(" "));
    });
  }
  
  c.stroke = api.inject_before(c.stroke, function() {
    if(this.fillStyle == api.background_color && this.strokeStyle == api.grid_color) {
      api.player.fov = this.globalAlpha / api.grid_opacity;
    }
    api.pos_phase = 0;
  });
  c.moveTo = api.inject_before(c.moveTo, function(x, y) {
    if(api.drawing) {
      if(api.within_minimap(x, y)) {
        api.pos_phase = 1;
        api.pos_phase0 = [x, y];
      } else {
        api.pos_phase = 0;
      }
    }
  });
  c.lineTo = api.inject_before(c.lineTo, function(x, y) {
    if(api.drawing && api.pos_phase > 0 && api.within_minimap(x, y)) {
      if(api.pos_phase == 1) {
        
      } else {
        
      }
    }
  });
  
  api.on("pre.mouse.move", function({ x, y }) {
    x = x * pixel_scale;
    y = y * pixel_scale;
    
    
  });
  
  api.once("input", function() {
    if(win.onresize == undefined) {
      Reflect.defineProperty(win, "onresize", {
        set: modify_diep_methods,
        get: function() {
          return undefined;
        },
        configurable: true,
        enumerable: false
      });
    } else {
      modify_diep_methods(win.onresize);
    }
  });
  
  api.on("draw", function() {
    
  });
  
  api.once("ready", function() {
    log("ready");
    
  });
})();
