// ==UserScript==
// @name         diep.api example 2
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

api.on("draw.background", function() {
  api.ctx.save();
  api.ctx.resetTransform();

  api.ctx.beginPath();
  api.ctx.setLineDash([50 * api.scale * api.camera.fov, 50 * api.scale * api.camera.fov]);
  api.ctx.lineWidth = 10 * api.scale * api.camera.fov;
  api.ctx.strokeStyle = "#0FF";
  api.ctx.globalAlpha = 0.5;
  const pos = api.to_screen((api.minimap.end_x + api.minimap.start_x) / 2, (api.minimap.end_y + api.minimap.start_y) / 2);
  api.ctx.translate(pos.x, pos.y);
  api.ctx.rotate(Math.PI * 2 * api.camera.fov);
  api.ctx.arc(0, 0, api.map_size * 0.5 * api.scale * api.camera.fov - api.ctx.lineWidth / 2, 0, Math.PI * 2);
  api.ctx.stroke();

  api.ctx.restore();
});