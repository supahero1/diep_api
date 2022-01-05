// ==UserScript==
// @name         diep.api example 1
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

api.on("draw", function() {
  api.begin_path();
  
  api.ctx.beginPath();
  api.ctx.fillStyle = "#000";
  let pos = api.to_minimap(api.mouse.x, api.mouse.y);
  api.ctx.arc(pos.x, pos.y, api.ui_scale * 2, 0, Math.PI * 2);
  api.ctx.fill();

  api.ctx.beginPath();
  api.ctx.fillStyle = "#0FF";
  pos = api.to_minimap(api.player.x, api.player.y);
  api.ctx.arc(pos.x, pos.y, api.ui_scale * 2, 0, Math.PI * 2);
  api.ctx.fill();

  api.ctx.beginPath();
  api.ctx.fillStyle = "#F00";
  pos = api.to_minimap(api.camera.x, api.camera.y);
  api.ctx.arc(pos.x, pos.y, api.ui_scale * 2, 0, Math.PI * 2);
  api.ctx.fill();
  
  api.close_path();
});