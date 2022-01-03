// ==UserScript==
// @name         diep.api example 2
// @namespace    https://github.com/supahero1
// @version      1.0
// @author       Shädam
// @description  API for diep.io
// @source       https://github.com/supahero1/diep_api
// @icon         https://www.google.com/s2/favicons?domain=diep.io
// @match        https://diep.io/*
// @require      https://raw.githubusercontent.com/supahero1/diep_api/main/api.min.js
// @grant        none
// @run-at       document-body
// ==/UserScript==

const api = diep_api();

api.on("draw.background", function() {
  api.ctx.beginPath();
  api.ctx.setLineDash([50 * api.scale * api.camera.fov, 50 * api.scale * api.camera.fov]);
  api.ctx.lineWidth = 10 * api.scale * api.camera.fov;
  api.ctx.strokeStyle = "#0FF";
  api.ctx.globalAlpha = 0.5;
  const pos = api.to_screen((api.minimap.end_x + api.minimap.start_x) / 2, (api.minimap.end_y + api.minimap.start_y) / 2);
  api.ctx.translate(pos.x, pos.y);
  api.ctx.rotate(Math.PI * 2 * api.camera.fov);
  /* Scaling the radius with fov so that the stroke gets thinner the more we see,
  and scaling with api.scale to scale the radius with the window's size. Not using
  api.ui_scale, because we are drawing on the screen, not on any of the UI elements. */
  api.ctx.arc(0, 0, api.map_size * 0.5 * api.scale * api.camera.fov - api.ctx.lineWidth / 2, 0, Math.PI * 2);
  api.ctx.stroke();
});