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
    version: "v0.1.7",
    
    events: new Map,
    
    canvas_ready: false,
    game_ready: false,
    
    canvas: undefined,
    ctx: undefined,
    
    player_pos_by_viewport: true,
    drew_player_pos: false,
    screen_to_map: 10000,
    ratio: NaN,
    scale: NaN,
    ui_scale: NaN,
    
    background_color: "#cdcdcd",
    grid_color: "#000000",
    grid_opacity: 0.05,
    ui_scaling: 1,
    
    viewport: false,
    viewport_color: "#000000",
    viewport_opacity: 0.1,
    
    pos_phase: 0,
    pos_phase0: [NaN, NaN],
    pos_phase1: [NaN, NaN],
    
    prevent_mouse_movement: false,
    prevent_mouse_buttons: false,
    prevent_keys: false,
    typing: false,
    
    is_in_game: false,
    
    player: {
      x: NaN,
      y: NaN,
      raw_x: NaN,
      raw_y: NaN,
      fov: NaN
    },
    mouse: {
      x: NaN,
      y: NaN,
      raw_x: 0,
      raw_y: 0
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
      },
      start_x: 0.0972,
      start_y: 0.0972,
      end_x: 0.9074,
      end_y: 0.9074
    },
    map_size: NaN,
    transform: { x: 0, y: 0, w: 1, h: 1 },
    
    get_ratio: function() {
      if(canvas.height * 16 / 9 >= canvas.width) {
        this.ratio = canvas.height * this.ui_scaling;
      } else {
        this.ratio = canvas.width / 16 * 9 * this.ui_scaling;
      }
    },
    get_scale: function() {
      if(canvas.height * 16 / 9 >= canvas.width) {
        this.scale = canvas.height / 1080;
      } else {
        this.scale = canvas.width / 1920;
      }
      this.ui_scale = this.scale * this.ui_scaling;
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
      return this.is_in_game;
    },
    within_minimap: function(x, y) {
      return (x >= this.minimap.extended.x && y >= this.minimap.extended.y && x <= this.minimap.extended.x + this.minimap.extended.side && y <= this.minimap.extended.y + this.minimap.extended.side);
    },
    calculate_minimap: function() {
      this.minimap.normal.x = this.canvas.width - this.ratio * 0.180555;
      this.minimap.normal.y = this.canvas.height - this.ratio * 0.180555;
      this.minimap.normal.side = this.ratio * 0.162037;
      
      this.minimap.extended.x = this.canvas.width - this.ratio * 0.2;
      this.minimap.extended.y = this.canvas.height - this.ratio * 0.2;
      this.minimap.extended.side = this.ratio * 0.2;
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
    },
    
    to_map: function(x, y) {
      return {
        x: this.player.x + (x - this.canvas.width / 2) / this.map_size / this.scale / this.player.fov / 1.23456789,
        y: this.player.y + (y - this.canvas.height / 2) / this.map_size / this.scale / this.player.fov / 1.23456789
      };
    },
    to_screen: function(x, y) {
      return {
        x: (x - this.player.x) * this.map_size * this.scale * this.player.fov * 1.23456789 + this.canvas.width / 2,
        y: (y - this.player.y) * this.map_size * this.scale * this.player.fov * 1.23456789 + this.canvas.height / 2
      };
    },
    update_mouse: function() {
      const pos = this.to_map(this.mouse.raw_x, this.mouse.raw_y);
      this.mouse.x = pos.x;
      this.mouse.y = pos.y;
    },
    update_map: function(w, h) {
      this.map_size = win.innerWidth / this.player.fov * this.minimap.normal.side / w;
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
        if(typeof what != "string" || typeof cb != "function") {
          throw new Error("Invalid arguments to api.on()");
          return;
        }
        return api.on(what, cb);
      }
      once(what, cb) {
        if(typeof what != "string" || typeof cb != "function") {
          throw new Error("Invalid arguments to api.once()");
          return;
        }
        return api.once(what, cb);
      }
      remove(what, cb) {
        if(typeof what != "string" || typeof cb != "function") {
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
      
      set viewport_color(color) {
        if(typeof color != "string") {
          throw new Error("Invalid arguments to api.set_viewport_color()");
          return;
        }
        api.viewport_color = color;
      }
      set viewport_opacity(op) {
        if(typeof op != "number" || op < 0 || op > 1) {
          throw new Error("Invalid arguments to api.set_viewport_opacity()");
          return;
        }
        api.viewport_opacity = op;
      }
      
      set position_type(type) {
        api.player_pos_by_viewport = !!type;
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
  
  win.requestAnimationFrame = new Proxy(win.requestAnimationFrame, {
    apply: function(to, what, args) {
      let ok = false;
      if(args[0].toString().startsWith("function Browser_mainLoop_runner()")) {
        ok = true;
        let died = false;
        if(api.is_in_game) {
          died = true;
        }
        api.is_in_game = api.drew_player_pos;
        if(!api.is_in_game && died) {
          api.emit("death");
        } else if(api.is_in_game && !died) {
          api.emit("spawn");
        }
        api.drew_player_pos = false;
      }
      const ret = to.apply(what, args);
      if(ok) {
        api.emit("draw");
      }
      return ret;
    }
  });
  
  await new Promise(function(resolve) {
    new MutationObserver(function(list, observer) {
      list.forEach(function(mut) {
        if(mut.addedNodes[0].id == "canvas") {
          observer.disconnect();
          resolve();
        }
      });
    }).observe(document.body, { childList: true });
  });
  
  api.canvas = document.getElementById("canvas");
  api.ctx = api.canvas.getContext("2d");
  
  api.canvas.width = Math.floor(win.innerWidth * win.devicePixelRatio);
  api.canvas.height = Math.floor(win.innerHeight * win.devicePixelRatio);
  
  api.get_ratio();
  api.get_scale();
  api.calculate_minimap();
  
  api.canvas_ready = true;
  api.emit("canvas");
  
  function dynamic_update() {
    const x = Math.floor(win.innerWidth * win.devicePixelRatio);
    const y = Math.floor(win.innerHeight * win.devicePixelRatio);
    if(api.canvas.width != x || api.canvas.height != y) {
      api.canvas.width = x;
      api.canvas.height = y;
    }
    
    api.get_ratio();
    api.get_scale();
    api.calculate_minimap();
    
    requestAnimationFrame(dynamic_update);
  }
  requestAnimationFrame(dynamic_update);
  
  function modify_diep_methods(to) {
    log("onresize set");
    delete win.onresize;
    win.onresize = api.override(to, function(){});
    win.addEventListener("resize", function() {
      api.canvas.width = Math.floor(win.innerWidth * win.devicePixelRatio);
      api.canvas.height = Math.floor(win.innerHeight * win.devicePixelRatio);
      
      api.get_ratio();
      api.get_scale();
      api.calculate_minimap();
      
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
    api.canvas.onmousemove = api.override(api.canvas.onmousemove, function(){});
    win.onmousemove = function(e) {
      api.emit("pre.mouse.move", e);
      
      api.mouse.raw_x = e.clientX * win.devicePixelRatio;
      api.mouse.raw_y = e.clientY * win.devicePixelRatio;
      api.update_mouse();
      
      if(api.prevent_mouse_movement) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }
      win.input.mouse(api.mouse.raw_x, api.mouse.raw_y);
      
      api.emit("mouse.move", e);
    };
    api.canvas.onmousedown = api.override(api.canvas.onmousedown, function(){});
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
    api.canvas.onmouseup = api.override(api.canvas.onmouseup, function(){});
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
          api.ui_scaling = parseFloat(s[1]);
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
        case "ren_minimap_viewport": {
          if(s[1] != "false" && s[1] != "0") {
            api.viewport = true;
          } else {
            api.viewport = false;
          }
          return;
        }
      }
      return fn.call(this, str);
    });
    win.input.set_convar = api.override(win.input.set_convar, function(...args) {
      return win.input.execute.call(this, args.join(" "));
    });
  }
  
  const c = win.CanvasRenderingContext2D.prototype;
  c.stroke = api.inject_before(c.stroke, function() {
    if(this.fillStyle == api.background_color && this.strokeStyle == api.grid_color) {
      api.player.fov = this.globalAlpha / api.grid_opacity;
    }
    api.pos_phase = 0;
  });
  c.moveTo = api.inject_before(c.moveTo, function(x, y) {
    if(api.pos_phase != 0) {
      api.pos_phase = 0;
      return;
    }
    if(api.within_minimap(x, y)) {
      api.pos_phase0[0] = x;
      api.pos_phase0[1] = y;
      api.pos_phase = 1;
    } else {
      api.pos_phase = 0;
    }
  });
  c.lineTo = api.inject_before(c.lineTo, function(x, y) {
    if(api.pos_phase == 0 || !api.within_minimap(x, y) || Math.hypot(api.pos_phase0[0] - x, api.pos_phase0[1] - y) > 15 * api.ui_scale) {
      api.pos_phase = 0;
      return;
    }
    if(api.pos_phase == 1) {
      api.pos_phase1[0] = x;
      api.pos_phase1[1] = y;
      api.pos_phase = 2;
    } else {
      api.drew_player_pos = true;
      api.pos_phase = 0;
    }
  });
  c.setTransform = api.inject_before(c.setTransform, function(a, b, c, d, e, f) {
    api.transform.x = e;
    api.transform.y = f;
    api.transform.w = a;
    api.transform.h = d;
  });
  c.fillRect = api.override_extended(c.fillRect, function(fn, x, y, w, h) {
    if(api.drew_player_pos && this.fillStyle == "#000000" && api.within_minimap(x + api.transform.x + w * api.transform.w / 2, y + api.transform.y + h * api.transform.h / 2) && this.globalAlpha == 0.1) {
      if(api.player_pos_by_viewport) {
        api.player.raw_x = x + api.transform.x + w * api.transform.w / 2;
        api.player.raw_y = y + api.transform.y + h * api.transform.h / 2;
        api.player.x = (api.player.raw_x - api.minimap.extended.x) / api.minimap.extended.side;
        api.player.y = (api.player.raw_y - api.minimap.extended.y) / api.minimap.extended.side;
        api.update_mouse();
        
        api.drew_player_pos = true;
      }
      api.update_map(w * api.transform.w, h * api.transform.h);
      if(api.viewport) {
        api.ctx.save();
        this.fillStyle = api.viewport_color;
        this.globalAlpha = api.viewport_opacity;
        fn.apply(this, [x, y, w, h]);
        api.ctx.restore();
        return;
      } else {
        return;
      }
    }
    fn.apply(this, [x, y, w, h]);
  });
  
  api.once("input", function() {
    win.input.execute("ren_minimap_viewport 1");
    
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
    if(api.in_game()) {
      api.ctx.save();
      api.ctx.beginPath();
      api.ctx.fillStyle = "#000";
      api.ctx.arc(api.minimap.extended.x + api.mouse.x * api.minimap.extended.side, api.minimap.extended.y + api.mouse.y * api.minimap.extended.side, api.ui_scale * 2, 0, Math.PI * 2);
      api.ctx.fill();
      api.ctx.restore();
      
      api.ctx.save();
      api.ctx.beginPath();
      api.ctx.fillStyle = "#F00";
      api.ctx.arc(api.minimap.extended.x + api.player.x * api.minimap.extended.side, api.minimap.extended.y + api.player.y * api.minimap.extended.side, api.ui_scale * 2, 0, Math.PI * 2);
      api.ctx.fill();
      api.ctx.restore();
      
      api.ctx.save();
      api.ctx.beginPath();
      api.ctx.fillStyle = "#F0F";
      api.ctx.globalAlpha = 0.05;
      const pos = api.to_screen((api.minimap.end_x + api.minimap.start_x) / 2, (api.minimap.end_y + api.minimap.start_y) / 2);
      api.ctx.arc(pos.x, pos.y, api.map_size * 0.5 * api.ui_scale * api.player.fov, 0, Math.PI * 2);
      api.ctx.fill();
      api.ctx.restore();
      
      /*api.ctx.save();
      api.ctx.beginPath();  
      api.ctx.fillStyle = "#F0F";
      api.ctx.globalAlpha = 0.05;
      const pos1 = api.to_screen(api.minimap.start_x, api.minimap.start_y);
      const pos2 = api.to_screen(api.minimap.end_x, api.minimap.end_y);
      api.ctx.fillRect(pos1.x, pos1.y, pos2.x - pos1.x, pos2.y - pos1.y);
      api.ctx.restore();*/
      
      /*api.ctx.save();
      api.ctx.beginPath();
      api.ctx.fillStyle = "#0F0";
      api.ctx.globalAlpha = 0.1;
      api.ctx.fillRect(api.minimap.normal.x, api.minimap.normal.y, api.minimap.normal.side, api.minimap.normal.side);
      api.ctx.restore();*/
    }
  });
  
  api.once("ready", function() {
    log("ready");
    
  });
})();
