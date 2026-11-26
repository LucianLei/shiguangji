'use strict';
const $ = id => document.getElementById(id);
const SHORTCUT_NAME = '拾光机';
const SHORTCUT_URL = 'shortcuts://run-shortcut?name=' + encodeURIComponent(SHORTCUT_NAME) + '&input=clipboard';
const EMOJIS = [['🌟','闪亮的星'],['💛','温暖的心'],['🙌','为你欢呼'],['👏','掌声送你'],['💪','你很有力量'],['🌈','彩虹能量'],['✨','闪闪发光'],['🏆','冠军奖杯'],['🚀','一起起飞'],['🌻','向阳生长'],['🫶','比心'],['🥳','值得庆祝']];
const state = { image: null, stickers: [], selected: null, nextId: 0, payload: null, imageUrl: null, photoLoading: false, loadVersion: 0 };
const form = $('recognition-form');
let toastTimer;
let announcementTimer;
function announce(text) {
  const status = $('spoken-status');
  status.textContent = '';
  clearTimeout(announcementTimer);
  announcementTimer = setTimeout(() => { status.textContent = text; }, 40);
}
function toast(text) { announce(text); $('toast').textContent = text; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').hidden = true, 3600); }
function setPhotoLoading(loading) { state.photoLoading = loading; $('preview-button').disabled = loading; if (loading) $('preview-button').textContent = '正在处理照片…'; else $('preview-button').innerHTML = '<span aria-hidden="true">✦</span> 预览这份认可'; }
function error(text, field) {
  const message = $('form-error');
  form.querySelectorAll('[aria-invalid]').forEach(input => {
    input.removeAttribute('aria-invalid');
    input.removeAttribute('aria-errormessage');
  });
  message.textContent = text;
  if (field) {
    field.setAttribute('aria-invalid', 'true');
    field.setAttribute('aria-errormessage', message.id);
    field.focus();
  }
}
function createStars() {
  const field = $('starfield'); if (!field) return;
  // Deterministic positions keep every render calm and avoid clustering.
  let seed = 17; const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  for (let i = 0; i < 92; i++) {
    const star = document.createElement('span'); star.className = 'star' + (i % 19 === 0 ? ' cross' : '');
    if (i % 19 === 0) star.textContent = '✧';
    const size = 1 + rand() * 1.8;
    star.style.cssText = `left:${rand()*100}%;top:${rand()*100}%;width:${size}px;height:${size}px;--duration:${4+rand()*5}s;--delay:-${rand()*9}s`;
    field.append(star);
  }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)'); let motion = !reduced.matches;
  function applyMotion() { document.body.classList.toggle('still', !motion); const button = $('motion-toggle'); if(button) { button.setAttribute('aria-pressed', String(motion)); button.setAttribute('aria-label', motion ? '关闭星光动画' : '开启星光动画'); button.querySelector('span').textContent = motion ? '星光已开启' : '星光已暂停'; } }
  $('motion-toggle')?.addEventListener('click', () => { if (reduced.matches) { motion = false; toast('已遵循设备的“减少动态效果”设置'); } else motion = !motion; applyMotion(); });
  reduced.addEventListener('change', () => { motion = !reduced.matches; applyMotion(); }); applyMotion();
}
createStars();
if (form) {
  $('recognition').placeholder = '哪一个瞬间，让你觉得 TA 真棒？\n写下具体的小事，让这份认可更有温度。';
  $('recognition').addEventListener('input', () => $('word-count').textContent = `${$('recognition').value.length} / 1200`);
  document.querySelectorAll('[data-prompt]').forEach(button => button.addEventListener('click', () => {
    const field = $('recognition'); if (field.value.trim()) { toast('保留你写下的心意，继续写就好'); field.focus(); return; }
    field.value = button.dataset.prompt; field.dispatchEvent(new Event('input')); field.focus(); field.setSelectionRange(field.value.length, field.value.length);
  }));
  $('photo-toggle').addEventListener('change', () => { $('photo-section').hidden = !$('photo-toggle').checked; error(''); });
  $('upload-area').addEventListener('click', () => $('photo-input').click());
  form.addEventListener('input', () => { if (form.querySelector('[aria-invalid]')) error(''); });
  form.addEventListener('reset', () => error(''));
  $('replace-photo').addEventListener('click', () => $('photo-input').click());
  $('remove-photo').addEventListener('click', () => { state.loadVersion++; setPhotoLoading(false); state.image = null; state.stickers = []; state.selected = null; $('photo-input').value = ''; $('photo-editor').hidden = true; $('upload-area').hidden = false; $('photo-image').removeAttribute('src'); renderStickers(); error(''); $('upload-area').focus(); announce('已移除照片。'); });
  $('photo-input').addEventListener('change', async event => {
    const file = event.target.files[0]; if (!file) return;
    const version = ++state.loadVersion; setPhotoLoading(false);
    if (!file.type.startsWith('image/') && !/\.(heic|heif)$/i.test(file.name)) { error('请选择一张照片。'); event.target.value = ''; return; }
    if (file.size > 35 * 1024 * 1024) { error('这张照片有些大，请选择 35 MB 以内的照片。'); event.target.value = ''; return; }
    setPhotoLoading(true); error('');
    const url = URL.createObjectURL(file);
    try {
      const image = new Image(); image.src = url; await image.decode();
      const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const ctx = canvas.getContext('2d'); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      const normalized = new Image(); normalized.src = canvas.toDataURL('image/jpeg', .9); await normalized.decode();
      if (version !== state.loadVersion) return;
      state.image = normalized; state.stickers = []; state.selected = null;
      $('photo-image').src = normalized.src; $('photo-editor').hidden = false; $('upload-area').hidden = true; renderStickers(); $('replace-photo').focus(); toast('照片已添加，可以选择贴纸。');
    } catch { if (version === state.loadVersion) error('暂时无法读取这张照片。请尝试 JPEG、PNG，或在相册中将照片导出后重试。'); }
    finally { URL.revokeObjectURL(url); if (version === state.loadVersion) { setPhotoLoading(false); } event.target.value = ''; }
  });
  EMOJIS.forEach(([emoji, label]) => {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = emoji; button.setAttribute('aria-label', '添加贴纸：' + label);
    button.addEventListener('click', () => {
      if (state.stickers.length >= 20) { toast('最多添加 20 个贴纸，已经很可爱啦'); return; }
      const offset = (state.stickers.length % 5 - 2) * .045;
      const sticker = { id: ++state.nextId, emoji, label, x: .5 + offset, y: .5 + offset, size: .16, rotation: 0 };
      state.stickers.push(sticker); state.selected = sticker.id; renderStickers(); announceSticker(sticker, '已添加');
    }); $('sticker-palette').append(button);
  });
  $('photo-stage').addEventListener('pointerdown', event => { if (!event.target.closest('.photo-sticker')) { state.selected = null; syncSelection(); } });
  $('sticker-size').addEventListener('input', event => { const s = selectedSticker(); if (s) { s.size = Number(event.target.value) / 100; clampSticker(s); positionSticker(s); event.target.setAttribute('aria-valuetext', '照片宽度的 ' + event.target.value + '%'); } });
  $('rotate-sticker').addEventListener('click', () => { const s = selectedSticker(); if (s) { s.rotation = (s.rotation + 15) % 360; clampSticker(s); positionSticker(s); announce(s.label + '贴纸，已旋转至' + s.rotation + '度。'); } });
  $('delete-sticker').addEventListener('click', deleteSelected);
  document.querySelectorAll('[data-sticker-move]').forEach(button => {
    button.addEventListener('click', () => {
      const sticker = selectedSticker();
      if (sticker) moveSticker(sticker, button.dataset.stickerMove, .05);
    });
  });
  new ResizeObserver(() => state.stickers.forEach(positionSticker)).observe($('photo-stage'));
  form.addEventListener('submit', event => { event.preventDefault(); preview(); });
  $('close-preview').addEventListener('click', () => $('preview-dialog').close());
  $('edit-recognition').addEventListener('click', () => $('preview-dialog').close());
  $('preview-dialog').addEventListener('close', () => $('preview-button').focus());
  $('handoff-button').addEventListener('click', handoff);
  $('download-json').addEventListener('click', () => { if (state.payload) download(new Blob([JSON.stringify(state.payload)], { type: 'application/json' }), 'shiguangji-recognition.json'); });
  $('download-image').addEventListener('click', () => { if (state.imageUrl) { const a = document.createElement('a'); a.href = state.imageUrl; a.download = 'shiguangji-moment.jpg'; a.click(); } });
}
function selectedSticker() { return state.stickers.find(s => s.id === state.selected); }
function clampSticker(s) {
  const image = state.image; if (!image) return;
  const rotation = s.rotation * Math.PI / 180;
  const bound = s.size * .7 * (Math.abs(Math.cos(rotation)) + Math.abs(Math.sin(rotation)));
  const bx = Math.min(.5, bound), by = Math.min(.5, bound * image.naturalWidth / image.naturalHeight);
  s.x = Math.max(bx, Math.min(1 - bx, s.x)); s.y = Math.max(by, Math.min(1 - by, s.y));
}
function positionSticker(s) {
  const button = document.getElementById('sticker-' + s.id); if (!button) return;
  button.style.left = `${s.x*100}%`; button.style.top = `${s.y*100}%`;
  button.style.fontSize = `${$('photo-stage').clientWidth * s.size}px`; button.style.setProperty('--rotation', `${s.rotation}deg`);
}
function syncSelection() {
  state.stickers.forEach(s => { const button = document.getElementById('sticker-' + s.id); if (button) { button.classList.toggle('selected', s.id === state.selected); button.setAttribute('aria-pressed', String(s.id === state.selected)); } });
  const selected = selectedSticker();
  $('sticker-controls').hidden = !selected;
  if (selected) {
    const size = Math.round(selected.size * 100);
    $('sticker-size').value = size;
    $('sticker-size').setAttribute('aria-valuetext', '照片宽度的 ' + size + '%');
  }
}
function announceSticker(sticker, action) {
  const x = Math.round(sticker.x * 100);
  const y = Math.round(sticker.y * 100);
  announce(action + sticker.label + '贴纸。从左 ' + x + '%，从上 ' + y + '%。');
}
function moveSticker(sticker, direction, step) {
  if (direction === 'left') sticker.x -= step;
  if (direction === 'right') sticker.x += step;
  if (direction === 'up') sticker.y -= step;
  if (direction === 'down') sticker.y += step;
  clampSticker(sticker);
  positionSticker(sticker);
  announceSticker(sticker, '已移动');
}
function deleteSelected() {
  const sticker = selectedSticker();
  if (!sticker) return;
  state.stickers = state.stickers.filter(s => s.id !== sticker.id);
  state.selected = null;
  renderStickers();
  $('sticker-palette').querySelector('button').focus();
  announce('已删除' + sticker.label + '贴纸。');
}
function renderStickers() {
  $('sticker-layer').replaceChildren();
  state.stickers.forEach(s => {
    const button = document.createElement('button'); button.id = 'sticker-' + s.id; button.className = 'photo-sticker'; button.type = 'button'; button.textContent = s.emoji;
    button.setAttribute('aria-label', s.label + '贴纸');
    let drag = null;
    button.addEventListener('pointerdown', event => {
      if (event.button !== 0) return; event.preventDefault(); state.selected = s.id; syncSelection(); button.focus({preventScroll:true});
      const rect = $('photo-stage').getBoundingClientRect();
      drag = { dx: event.clientX - rect.left - s.x * rect.width, dy: event.clientY - rect.top - s.y * rect.height };
      button.setPointerCapture(event.pointerId);
    });
    button.addEventListener('pointermove', event => {
      if (!drag) return; const rect = $('photo-stage').getBoundingClientRect();
      s.x = (event.clientX - rect.left - drag.dx) / rect.width; s.y = (event.clientY - rect.top - drag.dy) / rect.height;
      clampSticker(s); positionSticker(s);
    });
    ['pointerup','pointercancel','lostpointercapture'].forEach(type => button.addEventListener(type, () => drag = null));
    button.addEventListener('click', () => { state.selected = s.id; syncSelection(); announceSticker(s, '已选中'); });
    button.addEventListener('keydown', event => {
      state.selected = s.id; syncSelection(); const step = event.shiftKey ? .05 : .01;
      if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); deleteSelected(); return; }
      if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) return;
      event.preventDefault(); moveSticker(s, event.key.slice(5).toLowerCase(), step);
    });
    $('sticker-layer').append(button); positionSticker(s);
  }); syncSelection();
}
function exportImage() {
  const image = state.image; if (!image || !$('photo-toggle').checked) return null;
  const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
  state.stickers.forEach(s => {
    const size = s.size * canvas.width;
    ctx.save(); ctx.translate(s.x * canvas.width, s.y * canvas.height); ctx.rotate(s.rotation * Math.PI / 180);
    ctx.font = `${size}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowColor = '#00000022'; ctx.shadowBlur = 2; ctx.shadowOffsetY = 1;
    ctx.fillText(s.emoji, 0, 0); ctx.restore();
  });
  return canvas.toDataURL('image/jpeg', .82);
}
function preview() {
  error('');
  const team = form.elements.namedItem('team').value;
  const checks = [
    [$('sender'), $('sender').value.trim(), '请输入你的名字。'],
    [$('colleague'), $('colleague').value.trim(), '请输入对方的名字。'],
    [form.querySelector('input[name="team"]'), team, '请选择对方所属的团队。'],
    [$('recognition'), $('recognition').value.trim(), '请输入想对同事说的话。']
  ];
  const missing = checks.find(([, value]) => !value);
  if (missing) {
    const [field, , message] = missing;
    error(message, field);
    return;
  }
  if (state.photoLoading) { error('照片还在处理中，请稍等一下。'); return; }
  if ($('photo-toggle').checked && !state.image) { error('请选择一张照片，或者关闭“添加照片”选项。', $('upload-area')); return; }
  try {
    const sender = $('sender').value.trim(), colleague = $('colleague').value.trim(), recognition = $('recognition').value.trim();
    const imageUrl = exportImage();
    const message = `✨ 拾光机 · 同事认可\n\n来自：${sender}\n送给：${colleague}\n团队：${team}\n\n${recognition}\n\n🌟 让每一份闪光被看见。`;
    state.imageUrl = imageUrl;
    state.payload = { schemaVersion: 1, source: 'shiguangji', submissionId: crypto.randomUUID(), createdAt: new Date().toISOString(), sender, colleague, team, recognition, message, hasImage: !!imageUrl, imageBase64: imageUrl ? imageUrl.split(',')[1] : '', imageMimeType: imageUrl ? 'image/jpeg' : '', imageFilename: imageUrl ? 'shiguangji-moment.jpg' : '' };
    $('preview-colleague').textContent = colleague; $('preview-team').textContent = team; $('preview-message').textContent = recognition; $('preview-sender').textContent = sender;
    $('preview-image').hidden = !imageUrl; if (imageUrl) $('preview-image').src = imageUrl; else $('preview-image').removeAttribute('src');
    $('download-image').hidden = !imageUrl; $('handoff-status').textContent = ''; $('handoff-fallback').hidden = true; $('manual-copy').hidden = true; $('handoff-button').textContent = '复制数据并打开快捷指令'; $('handoff-button').disabled = false;
    $('preview-dialog').showModal();
    $('preview-title').focus();
  } catch { error('这次图片合成没有完成，请减少贴纸或更换照片再试。'); }
}
async function handoff() {
  if (!state.payload) return;
  const text = JSON.stringify(state.payload); $('handoff-button').disabled = true;
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard not available');
    await navigator.clipboard.writeText(text);
    $('handoff-status').textContent = '已复制，正在尝试打开快捷指令。请在“信息”App 中确认发送结果。';
    $('handoff-fallback').hidden = false; $('manual-copy').hidden = true; $('handoff-button').textContent = '重新复制并打开（可能重复发送）';
    window.location.href = SHORTCUT_URL;
  } catch {
    $('handoff-status').textContent = '浏览器未允许自动复制，请使用下方的手动复制方式。';
    $('payload-text').value = text; $('manual-copy').hidden = false; $('payload-text').focus(); $('payload-text').select();
  } finally { $('handoff-button').disabled = false; }
}
function download(blob, filename) { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
