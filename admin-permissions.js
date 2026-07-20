(() => {
'use strict';
if (window.__specimenPermissionsLoaded) return;
window.__specimenPermissionsLoaded = true;
const CLOUD_KEY = 'specimen_cloud_config_v1';
const ADMIN_SESSION_KEY = 'specimen_admin_session_v1';
let adminConfigured = false;
let adminUnlocked = false;
let adminPassword = '';
let permissionBusy = false;
let permissionTimer = null;
let localPersist = null;
function cloudConfig() {
try { return JSON.parse(localStorage.getItem(CLOUD_KEY) || '{}'); }
catch (_) { return {}; }
}
function configured() {
const cfg = cloudConfig();
return Boolean(cfg.url && cfg.key && cfg.code);
}
async function shaHex(text) {
const bytes = new TextEncoder().encode(text);
const digest = await crypto.subtle.digest('SHA-256', bytes);
return [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, '0')).join('');
}
async function currentSyncId() {
const cfg = cloudConfig();
return shaHex('specimen-id:' + cfg.code);
}
async function rpc(name, body) {
const cfg = cloudConfig();
const response = await fetch(cfg.url.replace(/\/+$/, '') + '/rest/v1/rpc/' + name, {
method: 'POST',
headers: {
'Content-Type': 'application/json',
apikey: cfg.key,
Authorization: 'Bearer ' + cfg.key,
},
body: JSON.stringify(body),
});
const text = await response.text();
if (!response.ok) throw new Error(text || ('HTTP ' + response.status));
return text ? JSON.parse(text) : null;
}
function scalar(value) {
return Array.isArray(value) ? value[0] : value;
}
function restoreSession() {
try {
const saved = JSON.parse(sessionStorage.getItem(ADMIN_SESSION_KEY) || '{}');
if (saved.password) {
adminPassword = saved.password;
adminUnlocked = true;
}
} catch (_) {}
}
function saveSession() {
if (adminUnlocked && adminPassword) {
sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({ password: adminPassword }));
} else {
sessionStorage.removeItem(ADMIN_SESSION_KEY);
}
}
function initializeUi() {
const toolsSheet = document.querySelector('#toolsMask .sheet');
if (!toolsSheet || document.getElementById('adminPermissionBox')) return;
const style = document.createElement('style');
style.textContent = `
.adminbox{border:1px solid #fed7aa;background:#fff7ed;border-radius:14px;padding:13px;margin:14px 0}
.adminbox h3{margin:0 0 8px;color:#9a3412}
.adminstatus{font-size:13px;color:#9a3412;margin:6px 0}
.adminactions{display:flex;gap:8px;flex-wrap:wrap}
.adminactions button{flex:1;min-width:120px}
.orangebtn{background:#c2410c!important;color:white!important;border-color:#c2410c!important}
`;
document.head.appendChild(style);
const box = document.createElement('div');
box.id = 'adminPermissionBox';
box.className = 'adminbox';
box.innerHTML = `
<h3>🔐 管理员权限</h3>
<div id="adminPermissionStatus" class="adminstatus">正在检查…</div>
<div class="adminactions">
<button class="btn orangebtn" id="setAdminPasswordBtn">首次设置管理员密码</button>
<button class="btn orangebtn" id="unlockAdminBtn">管理员解锁</button>
<button class="btn" id="lockAdminBtn">退出管理员</button>
</div>
<div class="hint">普通人员可以分类上架；只有管理员可以把已分类品种退回待分类、导入备份或恢复初始数据。关闭浏览器后会自动退出管理员模式。</div>
`;
const closeButton = toolsSheet.lastElementChild;
toolsSheet.insertBefore(box, closeButton);
document.getElementById('setAdminPasswordBtn').addEventListener('click', setAdminPassword);
document.getElementById('unlockAdminBtn').addEventListener('click', () => promptAdminPassword());
document.getElementById('lockAdminBtn').addEventListener('click', lockAdmin);
}
function toolButtonContaining(text) {
return [...document.querySelectorAll('#toolsMask .tool')].find(button => button.textContent.includes(text));
}
function updateBackButton() {
const button = document.getElementById('backBtn');
if (!button) return;
const current = typeof item === 'function' ? item() : null;
button.style.display = current && current.classified && adminUnlocked ? 'block' : 'none';
}
function updateUi() {
const status = document.getElementById('adminPermissionStatus');
const setButton = document.getElementById('setAdminPasswordBtn');
const unlockButton = document.getElementById('unlockAdminBtn');
const lockButton = document.getElementById('lockAdminBtn');
if (!status || !setButton || !unlockButton || !lockButton) return;
if (!configured()) {
status.textContent = '请先启用云同步';
setButton.style.display = 'none';
unlockButton.style.display = 'none';
lockButton.style.display = 'none';
} else if (!adminConfigured) {
status.textContent = '尚未设置管理员密码，请由负责人立即设置';
setButton.style.display = 'block';
unlockButton.style.display = 'none';
lockButton.style.display = 'none';
} else if (adminUnlocked) {
status.textContent = '管理员已解锁';
setButton.style.display = 'none';
unlockButton.style.display = 'none';
lockButton.style.display = 'block';
} else {
status.textContent = '普通模式：可以分类上架，不能退回已分类品种';
setButton.style.display = 'none';
unlockButton.style.display = 'block';
lockButton.style.display = 'none';
}
const importButton = toolButtonContaining('导入备份');
const resetButton = toolButtonContaining('恢复初始');
if (importButton) importButton.style.display = adminUnlocked ? '' : 'none';
if (resetButton) resetButton.style.display = adminUnlocked ? '' : 'none';
updateBackButton();
}
async function refreshAdminStatus(showError = false) {
if (!configured()) {
adminConfigured = false;
updateUi();
return false;
}
try {
const syncId = await currentSyncId();
adminConfigured = Boolean(scalar(await rpc('specimen_admin_exists', { p_sync_id: syncId })));
if (adminConfigured && adminUnlocked && adminPassword) {
const valid = Boolean(scalar(await rpc('verify_specimen_admin', {
p_sync_id: syncId,
p_password: adminPassword,
})));
if (!valid) lockAdmin(false);
}
updateUi();
return adminConfigured;
} catch (error) {
console.error(error);
adminConfigured = false;
const status = document.getElementById('adminPermissionStatus');
if (status) status.textContent = '权限功能未初始化，请执行 supabase-permissions.sql';
if (showError) toast('请先在 Supabase 执行权限数据库脚本');
return false;
}
}
async function setAdminPassword() {
if (!configured()) return toast('请先启用云同步');
const first = prompt('请设置管理员密码（至少8位，只有你自己保管）');
if (!first) return;
if (first.length < 8) return toast('管理员密码至少8位');
const second = prompt('请再次输入管理员密码');
if (first !== second) return toast('两次输入的密码不一致');
try {
const syncId = await currentSyncId();
const success = Boolean(scalar(await rpc('set_specimen_admin_once', {
p_sync_id: syncId,
p_password: first,
})));
if (!success) {
adminConfigured = true;
updateUi();
return toast('管理员密码已经设置，不能重复设置');
}
adminConfigured = true;
adminUnlocked = true;
adminPassword = first;
saveSession();
updateUi();
toast('管理员密码设置成功');
await syncClassificationLocks(true);
} catch (error) {
console.error(error);
toast('设置失败，请确认已执行权限数据库脚本');
}
}
async function promptAdminPassword(message = '请输入管理员密码') {
if (!configured()) {
toast('请先启用云同步');
return false;
}
if (!adminConfigured && !(await refreshAdminStatus(true))) return false;
const password = prompt(message);
if (!password) return false;
try {
const syncId = await currentSyncId();
const valid = Boolean(scalar(await rpc('verify_specimen_admin', {
p_sync_id: syncId,
p_password: password,
})));
if (!valid) {
toast('管理员密码不正确');
return false;
}
adminPassword = password;
adminUnlocked = true;
saveSession();
updateUi();
toast('管理员已解锁');
return true;
} catch (error) {
console.error(error);
toast('管理员验证失败');
return false;
}
}
function lockAdmin(showToast = true) {
adminUnlocked = false;
adminPassword = '';
saveSession();
updateUi();
if (showToast) toast('已退出管理员模式');
}
async function setClassificationLock(itemId, classified, password = '') {
if (!configured()) return false;
const syncId = await currentSyncId();
return Boolean(scalar(await rpc('set_specimen_classification_lock', {
p_sync_id: syncId,
p_item_id: Number(itemId),
p_classified: Boolean(classified),
p_admin_password: password || null,
p_new_updated_at: Date.now(),
})));
}
async function syncClassificationLocks(manual = false) {
if (!configured() || permissionBusy || !navigator.onLine || !Array.isArray(data) || !data.length) return;
permissionBusy = true;
try {
const syncId = await currentSyncId();
const rows = await rpc('get_specimen_classification_locks', { p_sync_id: syncId });
const locks = new Map((rows || []).map(row => [Number(row.item_id), {
classified: Boolean(row.classified),
updatedAt: Number(row.updated_at) || 0,
}]));
const needClassify = [];
let changed = false;
for (const specimen of data) {
const lock = locks.get(Number(specimen.id));
const localTime = Number(specimen.updatedAt) || 0;
if (!lock) {
if (specimen.classified) needClassify.push(specimen.id);
continue;
}
if (lock.classified && !specimen.classified) {
specimen.classified = true;
specimen.updatedAt = Math.max(localTime, lock.updatedAt);
changed = true;
} else if (!lock.classified && specimen.classified) {
if (localTime > lock.updatedAt) {
needClassify.push(specimen.id);
} else {
specimen.classified = false;
specimen.updatedAt = lock.updatedAt;
changed = true;
}
}
}
for (const itemId of needClassify) {
try { await setClassificationLock(itemId, true, ''); }
catch (error) { console.error(error); }
}
if (changed) {
await localPersist(false);
render();
}
if (manual) toast('权限状态已同步');
} catch (error) {
console.error(error);
if (manual) toast('权限同步失败，请执行 supabase-permissions.sql');
} finally {
permissionBusy = false;
}
}
function schedulePermissionSync() {
clearTimeout(permissionTimer);
if (configured()) permissionTimer = setTimeout(() => syncClassificationLocks(false), 700);
}
function installHooks() {
const originalEdit = edit;
edit = function (id) {
originalEdit(id);
updateBackButton();
};
const originalClassify = classify;
classify = async function () {
const current = item();
const itemId = current ? current.id : 0;
await originalClassify();
if (!itemId || !configured()) return;
try {
await setClassificationLock(itemId, true, '');
schedulePermissionSync();
} catch (error) {
console.error(error);
toast('已在本机保存，联网后会继续同步');
}
};
const originalMarkPending = markPending;
markPending = async function () {
const current = item();
if (!current || !current.classified) return;
if (!adminUnlocked && !(await promptAdminPassword('退回已分类品种需要管理员密码'))) return;
try {
const allowed = await setClassificationLock(current.id, false, adminPassword);
if (!allowed) {
lockAdmin(false);
return toast('没有退回权限或管理员密码不正确');
}
await originalMarkPending();
schedulePermissionSync();
} catch (error) {
console.error(error);
toast('退回失败，请检查网络');
}
};
const originalImportJSON = importJSON;
importJSON = async function (event) {
if (!adminUnlocked && !(await promptAdminPassword('导入备份需要管理员密码'))) {
event.target.value = '';
return;
}
originalImportJSON(event);
};
resetAll = async function () {
if (!adminUnlocked && !(await promptAdminPassword('恢复初始数据需要管理员密码'))) return;
if (!confirm('此操作会将全部品种退回待分类，确定继续吗？')) return;
try {
const syncId = await currentSyncId();
const allowed = Boolean(scalar(await rpc('admin_reset_specimen_classification', {
p_sync_id: syncId,
p_admin_password: adminPassword,
p_new_updated_at: Date.now(),
})));
if (!allowed) return toast('管理员验证失败');
data = base();
await persist();
render();
closeSheet('toolsMask');
toast('已恢复初始数据');
} catch (error) {
console.error(error);
toast('恢复失败，请检查网络');
}
};
localPersist = persist;
persist = async function (show = true) {
await localPersist(show);
schedulePermissionSync();
};
}
async function start() {
if (typeof data === 'undefined' || typeof persist !== 'function' || !document.querySelector('#toolsMask .sheet')) {
setTimeout(start, 100);
return;
}
initializeUi();
restoreSession();
installHooks();
updateUi();
await refreshAdminStatus(false);
await syncClassificationLocks(false);
const oldOpenTools = openTools;
openTools = function () {
refreshAdminStatus(false);
oldOpenTools();
};
window.addEventListener('online', () => {
refreshAdminStatus(false);
syncClassificationLocks(false);
});
document.addEventListener('visibilitychange', () => {
if (!document.hidden) {
refreshAdminStatus(false);
syncClassificationLocks(false);
}
});
setInterval(() => syncClassificationLocks(false), 12000);
}
start();
})();
