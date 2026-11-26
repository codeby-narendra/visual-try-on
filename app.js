"use strict";

(() => {
  const $ = (id) => document.getElementById(id);
  const outfit = $("outfit");
  const dialog = $("crop-dialog");
  const cropCanvas = $("crop-canvas");
  const garments = {};
  const samples = [
    { name: "Coastal stripe", color: "#dce5df", accent: "#849e97", style: "stripe" },
    { name: "Midnight twill", color: "#344650", accent: "#51606a", style: "twill" },
    { name: "Warm linen", color: "#cdbb9c", accent: "#eee2ca", style: "linen" },
    { name: "Forest check", color: "#71816c", accent: "#c2cbb8", style: "check" },
    { name: "Rose cotton", color: "#c99e92", accent: "#e5c4ba", style: "linen" },
    { name: "Cloud white", color: "#efeee6", accent: "#d9d8d0", style: "linen" },
  ];
  const avatarTones = [
    { name: "Porcelain", color: "#f3d9c4" },
    { name: "Light", color: "#e8bd98" },
    { name: "Medium", color: "#cb9168" },
    { name: "Tan", color: "#a86e4a" },
    { name: "Deep", color: "#784832" },
    { name: "Rich", color: "#4d3025" },
  ];
  let selectedAvatarTone = avatarTones[2];
  let crop = null;
  let drag = null;
  let imageRequest = 0;
  let referenceRequest = 0;
  let referenceUrl = null;

  function makeCanvas(size) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    return canvas;
  }

  function makeFabric(sample) {
    const canvas = makeCanvas(128);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = sample.color;
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = sample.accent;
    if (sample.style === "stripe") {
      for (let x = 0; x < 128; x += 32) {
        ctx.fillRect(x, 0, 8, 128);
        ctx.fillRect(x + 11, 0, 2, 128);
      }
    } else if (sample.style === "check") {
      ctx.globalAlpha = 0.6;
      for (let p = 0; p < 128; p += 32) {
        ctx.fillRect(p, 0, 8, 128);
        ctx.fillRect(0, p, 128, 8);
      }
    } else {
      ctx.globalAlpha = sample.style === "twill" ? 0.22 : 0.4;
      ctx.strokeStyle = sample.accent;
      ctx.lineWidth = 1;
      for (let p = -128; p < 256; p += 4) {
        ctx.beginPath();
        ctx.moveTo(p, 0);
        ctx.lineTo(sample.style === "twill" ? p + 128 : p, 128);
        ctx.stroke();
        if (sample.style === "linen") ctx.fillRect(0, p, 128, 0.6);
      }
    }
    return canvas;
  }

  samples.forEach((sample) => { sample.texture = makeFabric(sample); });

  function announce(message) {
    $("status").textContent = message;
    $("error").hidden = true;
  }

  function showError(message) {
    $("status").textContent = "";
    $("error").textContent = message;
    $("error").hidden = false;
  }

  function setSample(part, sample) {
    garments[part] = { texture: sample.texture, color: sample.color, name: sample.name, scale: 70, rotation: 0, custom: false };
    syncControls(part);
  }

  function syncControls(part) {
    const garment = garments[part];
    $(part + "-name").textContent = garment.name;
    $(part + "-name").title = garment.name;
    $(part + "-description").textContent = garment.custom ? "Your photo · fabric patch" : garment.texture ? "Sample fabric · ready to style" : "Solid color · ready to style";
    $(part + "-scale").value = garment.scale;
    $(part + "-rotation").value = garment.rotation;
    $(part + "-color").value = garment.color;
    for (const property of ["scale", "rotation"]) {
      $(part + "-" + property + "-value").value = garment[property] + (property === "scale" ? "%" : "°");
      $(part + "-" + property).disabled = !garment.texture;
    }
    const swatch = $(part + "-swatch");
    const ctx = swatch.getContext("2d");
    ctx.fillStyle = garment.color;
    ctx.fillRect(0, 0, 100, 100);
    if (garment.texture) ctx.drawImage(garment.texture, 0, 0, 100, 100);
  }

  const shirtPath = new Path2D("M272 80 Q300 69 328 80 L339 96 L403 118 Q419 123 427 145 L469 259 Q473 269 465 276 L432 289 Q423 293 417 281 L394 222 L399 349 Q351 366 300 360 Q249 366 201 349 L206 222 L183 281 Q177 293 168 289 L135 276 Q127 269 131 259 L173 145 Q181 123 197 118 L261 96 Z");
  const pantsPath = new Path2D("M203 353 Q300 368 397 353 L407 423 Q410 449 405 481 L382 721 Q360 734 329 723 L304 499 Q301 483 298 499 L271 723 Q240 734 218 721 L195 481 Q190 449 193 423 Z");

  function material(ctx, path, part, bounds) {
    const garment = garments[part];
    ctx.save();
    ctx.clip(path);
    ctx.fillStyle = garment.color;
    ctx.fillRect(...bounds);
    if (garment.texture) {
      const pattern = ctx.createPattern(garment.texture, "repeat");
      const scale = (garment.scale / 100) * 100 / garment.texture.width;
      pattern.setTransform(new DOMMatrix().translate(300, 80).rotate(garment.rotation).scale(scale));
      ctx.fillStyle = pattern;
      ctx.fillRect(...bounds);
    }
    const shading = ctx.createLinearGradient(bounds[0], 0, bounds[0] + bounds[2], 0);
    shading.addColorStop(0, "#10251c35");
    shading.addColorStop(0.18, "#ffffff12");
    shading.addColorStop(0.45, "#ffffff25");
    shading.addColorStop(0.73, "#ffffff00");
    shading.addColorStop(1, "#10251c3d");
    ctx.fillStyle = shading;
    ctx.fillRect(...bounds);
    ctx.restore();
    ctx.strokeStyle = "#26372b9c";
    ctx.lineWidth = 1.4;
    ctx.stroke(path);
  }

  function seam(ctx, data, color = "#22312966", width = 1.2) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke(new Path2D(data));
  }

  function drawAvatar(ctx) {
    ctx.fillStyle = selectedAvatarTone.color;
    ctx.fill(new Path2D("M284 54 Q300 62 316 54 L318 112 L282 112 Z"));
    ctx.fill(new Path2D("M144 273 Q157 279 179 280 L177 321 Q174 332 164 326 L151 316 Q145 307 144 273 Z M456 273 Q443 279 421 280 L423 321 Q426 332 436 326 L449 316 Q455 307 456 273 Z"));

    ctx.save();
    ctx.translate(300, 70);
    ctx.scale(1.1, 1.1);
    ctx.translate(-300, -70);
    ctx.beginPath();
    ctx.ellipse(260, 32, 6, 9, 0, 0, Math.PI * 2);
    ctx.ellipse(340, 32, 6, 9, 0, 0, Math.PI * 2);
    ctx.ellipse(300, 32, 38, 38, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#342922";
    ctx.fill(new Path2D("M262 35 Q254 5 282 -3 Q312 -10 334 11 Q346 27 337 44 L329 30 Q320 17 309 14 Q293 26 269 28 L265 43 Z"));
    ctx.fillStyle = "#332820";
    for (const x of [287, 313]) {
      ctx.beginPath();
      ctx.arc(x, 33, 1.7, 0, Math.PI * 2);
      ctx.fill();
    }
    seam(ctx, "M298 40 L297 48 L302 49 M294 57 Q300 61 306 57", "#70483d99", 1);
    ctx.restore();
  }

  function drawOutfit(canvas) {
    const ctx = canvas.getContext("2d");
    ctx.save();
    ctx.setTransform(canvas.width / 600, 0, 0, canvas.height / 792, 0, 0);
    ctx.fillStyle = "#eeefe7";
    ctx.fillRect(0, 0, 600, 792);
    ctx.strokeStyle = "#e3e6db";
    ctx.lineWidth = 0.5;
    for (let x = 30; x < 600; x += 30) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 792); ctx.stroke();
    }
    for (let y = 12; y < 792; y += 30) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(600, y); ctx.stroke();
    }
    ctx.save();
    ctx.translate(0, 20);
    const shadow = ctx.createRadialGradient(300, 740, 0, 300, 740, 130);
    shadow.addColorStop(0, "#54634a20");
    shadow.addColorStop(1, "#54634a00");
    ctx.save();
    ctx.translate(0, 592);
    ctx.scale(1, 0.2);
    ctx.fillStyle = shadow;
    ctx.fillRect(150, 600, 300, 280);
    ctx.restore();
    drawAvatar(ctx);
    material(ctx, pantsPath, "pants", [185, 350, 230, 390]);
    seam(ctx, "M202 374 Q300 388 398 374 M211 380 Q213 413 196 438 M389 380 Q387 413 404 438 M299 382 L299 459 Q318 456 320 436 L320 385");
    seam(ctx, "M245 444 Q250 540 241 708 M357 444 Q350 540 360 708", "#ffffff28", 2);
    seam(ctx, "M224 715 Q246 724 266 716 M334 716 Q356 724 377 715", "#ffffff65");
    material(ctx, shirtPath, "shirt", [120, 70, 360, 300]);
    seam(ctx, "M197 126 L210 205 M403 126 L390 205 M139 256 L180 273 M461 256 L420 273 M145 264 L177 278 M455 264 L423 278");
    seam(ctx, "M294 124 L294 354 M306 124 L306 354", "#26372b50");
    const collar = new Path2D("M272 80 Q300 69 328 80 L339 98 L324 140 L302 115 L278 140 L261 98 Z");
    material(ctx, collar, "shirt", [255, 70, 90, 75]);
    ctx.fillStyle = "#1c2a273a";
    ctx.fill(new Path2D("M276 85 Q300 78 324 85 L300 115 Z"));
    seam(ctx, "M272 81 L300 115 L328 81 M263 98 L278 132 L294 114 M337 98 L324 132 L307 114");
    ctx.fillStyle = "#ffffff15";
    ctx.fill(new Path2D("M330 177 L376 177 L374 218 L353 231 L331 218 Z"));
    seam(ctx, "M330 177 Q354 180 376 177 L374 218 L353 231 L331 218 Z M332 183 L374 183");
    for (let y = 150; y <= 338; y += 34) {
      ctx.beginPath(); ctx.arc(300, y, 2.4, 0, Math.PI * 2);
      ctx.fillStyle = "#eeeee0"; ctx.fill();
      ctx.strokeStyle = "#44504499"; ctx.lineWidth = 0.8; ctx.stroke();
    }
    seam(ctx, "M211 277 L215 333 M387 277 L385 333", "#23322524");
    ctx.fillStyle = "#15272233";
    ctx.fill(new Path2D("M202 349 Q300 364 398 349 L397 361 Q300 374 203 361 Z"));
    for (const x of [225, 270, 335, 377]) {
      seam(ctx, `M${x} 361 L${x - 1} 377`, "#e6e5d28c", 4);
      seam(ctx, `M${x + 2} 361 L${x + 1} 377`, "#23322566", 1);
    }
    ctx.restore();
    ctx.fillStyle = "#7a8474";
    ctx.font = "9px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("T H R E A D  &  T O N E", 300, 770);
    ctx.restore();
  }

  function render() {
    drawOutfit(outfit);
    outfit.setAttribute("aria-label", `Outfit preview: ${garments.shirt.name} shirt with ${garments.pants.name} trousers on a ${selectedAvatarTone.name.toLowerCase()} skin-tone avatar.`);
  }

  function setPreview(mode) {
    const photoMode = mode !== "fabric";
    if (photoMode && !referenceUrl) return;
    outfit.style.visibility = photoMode ? "hidden" : "visible";
    outfit.setAttribute("aria-hidden", String(photoMode));
    const photo = $("reference-photo");
    photo.hidden = !photoMode;
    photo.dataset.detail = mode;
    $("reference-controls").querySelectorAll("[data-preview]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.preview === mode));
    });
    document.querySelector(".preview-badge").textContent = photoMode ? "PHOTO REFERENCE" : "FABRIC PREVIEW";
    $("preview-disclaimer").textContent = photoMode
      ? "Photo reference only. Selected fabrics update the illustrated preview; this image is not recolored or altered."
      : "Illustrated fabric placement, not a fit simulation. Colors and pattern scale may differ in real life.";
  }

  async function loadReference(file) {
    if (!file) return;
    const request = ++referenceRequest;
    if (!file.type.startsWith("image/")) {
      showError("Please choose an image file, such as a JPEG, PNG, or WebP.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      showError("This photo is larger than 20 MB. Please resize it or choose a smaller photo.");
      return;
    }
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      if (request !== referenceRequest) return;
      if (image.naturalWidth < 16 || image.naturalHeight < 16) {
        showError("This image is too small. Please choose a photo at least 16 × 16 pixels.");
        return;
      }
      if (referenceUrl) URL.revokeObjectURL(referenceUrl);
      referenceUrl = url;
      $("reference-photo").src = referenceUrl;
      $("reference-controls").hidden = false;
      $("reference-controls").querySelectorAll("[data-preview]").forEach((button) => { button.disabled = false; });
      setPreview("full");
      announce("Photo reference loaded. Choose a close-up to inspect the shirt or trousers.");
    } catch (error) {
      if (request === referenceRequest) {
        console.error("Could not open photo reference:", error);
        showError("This image could not be opened. Try a JPEG, PNG, or WebP photo.");
      }
    } finally {
      if (url !== referenceUrl) URL.revokeObjectURL(url);
    }
  }

  function reset() {
    setSample("shirt", samples[0]);
    setSample("pants", samples[1]);
    selectedAvatarTone = avatarTones[2];
    $("avatar-tones").querySelectorAll("button").forEach((button, index) => {
      button.setAttribute("aria-pressed", String(avatarTones[index] === selectedAvatarTone));
    });
    render();
  }

  function cropGeometry() {
    const image = crop.image;
    const fit = Math.min(760 / image.naturalWidth, 480 / image.naturalHeight);
    const width = image.naturalWidth * fit;
    const height = image.naturalHeight * fit;
    const size = Math.min(image.naturalWidth, image.naturalHeight) * crop.size / 100;
    crop.x = Math.max(size / 2, Math.min(image.naturalWidth - size / 2, crop.x));
    crop.y = Math.max(size / 2, Math.min(image.naturalHeight - size / 2, crop.y));
    return { fit, left: (800 - width) / 2, top: (520 - height) / 2, width, height, size };
  }

  function renderCrop() {
    if (!crop) return;
    const ctx = cropCanvas.getContext("2d");
    const g = cropGeometry();
    const x = g.left + (crop.x - g.size / 2) * g.fit;
    const y = g.top + (crop.y - g.size / 2) * g.fit;
    const side = g.size * g.fit;
    ctx.fillStyle = "#dfe3da"; ctx.fillRect(0, 0, 800, 520);
    ctx.drawImage(crop.image, g.left, g.top, g.width, g.height);
    ctx.fillStyle = "#0e1e26a6";
    ctx.beginPath();
    ctx.rect(0, 0, 800, 520);
    ctx.rect(x, y, side, side);
    ctx.fill("evenodd");
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
    ctx.strokeRect(x, y, side, side);
    ctx.strokeStyle = "#ffffff77"; ctx.lineWidth = 1;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(x + side * i / 3, y); ctx.lineTo(x + side * i / 3, y + side);
      ctx.moveTo(x, y + side * i / 3); ctx.lineTo(x + side, y + side * i / 3);
      ctx.stroke();
    }
    $("crop-size-value").value = crop.size + "%";
  }

  async function loadPhoto(part, file) {
    if (!file) return;
    const request = ++imageRequest;
    if (!file.type.startsWith("image/")) {
      showError("Please choose an image file, such as a JPEG, PNG, or WebP.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      showError("This photo is larger than 20 MB. Please resize it or choose a smaller photo.");
      return;
    }
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      if (request !== imageRequest) return;
      if (image.naturalWidth < 16 || image.naturalHeight < 16) {
        showError("This image is too small. Please choose a photo at least 16 × 16 pixels.");
        return;
      }
      crop = { image, part, name: file.name, size: 45, x: image.naturalWidth / 2, y: image.naturalHeight / 2 };
      $("crop-title").textContent = `Choose ${part === "shirt" ? "shirt" : "trouser"} fabric`;
      $("crop-size").value = 45;
      renderCrop();
      $("error").hidden = true;
      if (!dialog.open) dialog.showModal();
    } catch (error) {
      if (request === imageRequest) {
        console.error("Could not open fabric image:", error);
        showError("This image could not be opened. Try a JPEG, PNG, or WebP photo. HEIC support depends on your browser.");
      }
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function pointerPosition(event) {
    const rect = cropCanvas.getBoundingClientRect();
    const displayScale = Math.min(rect.width / 800, rect.height / 520);
    const offsetX = (rect.width - 800 * displayScale) / 2;
    const offsetY = (rect.height - 520 * displayScale) / 2;
    const g = cropGeometry();
    return {
      x: ((event.clientX - rect.left - offsetX) / displayScale - g.left) / g.fit,
      y: ((event.clientY - rect.top - offsetY) / displayScale - g.top) / g.fit,
    };
  }

  cropCanvas.addEventListener("pointerdown", (event) => {
    if (!crop) return;
    event.preventDefault();
    cropCanvas.focus();
    const position = pointerPosition(event);
    const half = cropGeometry().size / 2;
    const inside = Math.abs(position.x - crop.x) <= half && Math.abs(position.y - crop.y) <= half;
    drag = { id: event.pointerId, x: inside ? position.x - crop.x : 0, y: inside ? position.y - crop.y : 0 };
    cropCanvas.setPointerCapture(event.pointerId);
    crop.x = position.x - drag.x;
    crop.y = position.y - drag.y;
    renderCrop();
  });
  cropCanvas.addEventListener("pointermove", (event) => {
    if (!crop || !drag || drag.id !== event.pointerId) return;
    const position = pointerPosition(event);
    crop.x = position.x - drag.x;
    crop.y = position.y - drag.y;
    renderCrop();
  });
  for (const event of ["pointerup", "pointercancel", "lostpointercapture"]) {
    cropCanvas.addEventListener(event, () => { drag = null; });
  }
  cropCanvas.addEventListener("keydown", (event) => {
    if (!crop || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    const step = Math.min(crop.image.naturalWidth, crop.image.naturalHeight) * (event.shiftKey ? 0.05 : 0.01);
    if (event.key === "ArrowLeft") crop.x -= step;
    if (event.key === "ArrowRight") crop.x += step;
    if (event.key === "ArrowUp") crop.y -= step;
    if (event.key === "ArrowDown") crop.y += step;
    renderCrop();
  });
  $("crop-size").addEventListener("input", (event) => {
    if (!crop) return;
    crop.size = Number(event.target.value);
    renderCrop();
  });
  $("cancel-crop").addEventListener("click", () => dialog.close());
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      dialog.close();
    }
  });
  dialog.addEventListener("close", () => { crop = null; drag = null; });
  $("apply-crop").addEventListener("click", () => {
    if (!crop) return;
    const { part, image, name, x, y } = crop;
    const { size } = cropGeometry();
    const texture = makeCanvas(512);
    const ctx = texture.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 512, 512);
    ctx.drawImage(image, x - size / 2, y - size / 2, size, size, 0, 0, 512, 512);
    garments[part] = { ...garments[part], texture, name, custom: true };
    syncControls(part);
    render();
    dialog.close();
    announce(`Your ${part === "shirt" ? "shirt" : "trouser"} fabric is applied. Adjust the pattern size and angle to refine your look.`);
  });

  for (const part of ["shirt", "pants"]) {
    for (const source of ["file", "camera"]) {
      $(part + "-" + source).addEventListener("change", (event) => {
        const file = event.target.files[0];
        event.target.value = "";
        loadPhoto(part, file);
      });
    }
    document.querySelector(`[data-upload="${part}"]`).addEventListener("click", () => $(part + "-file").click());
    document.querySelector(`[data-camera="${part}"]`).addEventListener("click", () => $(part + "-camera").click());
    for (const property of ["scale", "rotation"]) {
      $(part + "-" + property).addEventListener("input", (event) => {
        garments[part][property] = Number(event.target.value);
        syncControls(part);
        render();
      });
    }
    $(part + "-color").addEventListener("input", (event) => {
      garments[part].color = event.target.value;
      garments[part].texture = null;
      garments[part].custom = false;
      garments[part].name = "Solid " + event.target.value.toUpperCase();
      syncControls(part);
      render();
    });
  }

  $("reference-upload").addEventListener("click", () => $("reference-file").click());
  $("reference-file").addEventListener("change", (event) => {
    const file = event.target.files[0];
    event.target.value = "";
    loadReference(file);
  });
  $("reference-controls").addEventListener("click", (event) => {
    const button = event.target.closest("[data-preview]");
    if (button && !button.disabled) setPreview(button.dataset.preview);
  });

  for (const sample of samples) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "sample-button";
    button.setAttribute("aria-label", `Apply ${sample.name} to selected garment`);
    const swatch = makeCanvas(128);
    swatch.getContext("2d").drawImage(sample.texture, 0, 0);
    swatch.setAttribute("aria-hidden", "true");
    button.append(swatch, document.createTextNode(sample.name));
    button.addEventListener("click", () => {
      const part = $("sample-target").value;
      setSample(part, sample);
      render();
      announce(`${sample.name} applied to ${part === "shirt" ? "the shirt" : "the trousers"}.`);
    });
    $("samples").append(button);
  }

  for (const tone of avatarTones) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "avatar-tone";
    button.style.setProperty("--tone", tone.color);
    button.setAttribute("aria-label", `${tone.name} skin tone`);
    button.setAttribute("aria-pressed", String(tone === selectedAvatarTone));
    button.title = `${tone.name} skin tone`;
    button.addEventListener("click", () => {
      selectedAvatarTone = tone;
      $("avatar-tones").querySelectorAll("button").forEach((item) => {
        item.setAttribute("aria-pressed", String(item === button));
      });
      render();
      announce(`${tone.name} skin tone applied to the avatar.`);
    });
    $("avatar-tones").append(button);
  }

  $("reset").addEventListener("click", () => {
    ++imageRequest;
    reset();
    announce("The original pairing has been restored.");
  });

  $("download").addEventListener("click", async () => {
    const button = $("download");
    button.disabled = true;
    try {
      const exported = document.createElement("canvas");
      exported.width = 1800;
      exported.height = 2376;
      drawOutfit(exported);
      const blob = await new Promise((resolve, reject) => {
        exported.toBlob((result) => result ? resolve(result) : reject(new Error("PNG encoding failed")), "image/png");
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `thread-and-tone-${new Date().toISOString().replace(/[:.]/g, "-")}.png`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      announce("Your PNG download has started. On phones, check Downloads or use the browser's save/share option. Save before closing: this pairing is not stored after a reload.");
    } catch (error) {
      console.error("Could not save outfit:", error);
      showError("We couldn't create your PNG. Please try again or use a smaller source photo.");
    } finally {
      button.disabled = false;
    }
  });

  reset();
})();
