// ==UserScript==
// @name         diep.api example 1
// @namespace    https://github.com/supahero1
// @version      1.0
// @author       Shädam
// @description  API for diep.io
// @source       https://github.com/supahero1/diep_api
// @icon         https://www.google.com/s2/favicons?domain=diep.io
// @match        https://diep.io
// @require      https://github.com/supahero1/diep_api/api.js
// @grant        none
// @run-at       document-body
// ==/UserScript==

const api = diep_api();

api.on("draw", function() {
  api.ctx.save();
  api.ctx.resetTransform();

  api.ctx.beginPath();
  api.ctx.fillStyle = "#000";
  api.ctx.arc(api.minimap.extended.x + api.mouse.x * api.minimap.extended.side, api.minimap.extended.y + api.mouse.y * api.minimap.extended.side, api.ui_scale * 2, 0, Math.PI * 2);
  api.ctx.fill();

  api.ctx.beginPath();
  api.ctx.fillStyle = "#0FF";
  api.ctx.arc(api.minimap.extended.x + api.player.x * api.minimap.extended.side, api.minimap.extended.y + api.player.y * api.minimap.extended.side, api.ui_scale * 2, 0, Math.PI * 2);
  api.ctx.fill();

  api.ctx.beginPath();
  api.ctx.fillStyle = "#F00";
  api.ctx.arc(api.minimap.extended.x + api.camera.x * api.minimap.extended.side, api.minimap.extended.y + api.camera.y * api.minimap.extended.side, api.ui_scale * 2, 0, Math.PI * 2);
  api.ctx.fill();

  api.ctx.restore();
});