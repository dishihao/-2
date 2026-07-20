(() => {
  'use strict';

  const CLOUD_KEY = 'specimen_cloud_config_v1';
  let cloudTimer = null;
  let cloudBusy = false;

  // ---------- UI injection ----------
  const style = document.createElement('style');
  style.textContent = `
    .cloudline{font-size:11px;margin-top:3px;opacity:.95}
    .cloudbox{border:1px solid #bfdbfe;background:#eff6ff;border-radius:14px;padding:13px;margin:14px 0}
    .cloudbox h3{margin:0 0 8px;color:#1e3a8a}
    .cloudstatus{font-size:13px;color:#1e40af;margin:6px 0}
    .cloudactions{display:flex;gap:8px}
    .cloudactions button{flex:1}
    .bluebtn{background:#1d4ed8!important;color:white!important;border-color:#1d4ed8!important}
  `;
  document.head.appendChild(style);

  const saveEl = document.getElementById('save');
  const cloudTop = document.createElement('div');
  cloudTop.id = 'cloudTop';
  cloudTop.className = 'cloudline';
  cloudTop.textContent = '云同步：未启用';
  saveEl.insertAdjacentElement('afterend', cloudTop);

  const toolsSheet = document.querySelector('#toolsMask .sheet');
  const closeBtn = toolsSheet.lastElementChild;
  const cloudBox = document.createElement('div');
  cloudBox.className = 'cloudbox';
  cloudBox.innerHTML = `
    <h3>☁️ 多设备自动同步</h3>
    <div id="cloudStatus" class="cloudstatus">未启用</div>
    <div class="field"><label>Supabase 项目网址</label><input id="cloudUrl" placeholder="https://xxxx.supabase.co" autocomplete="off"></div>
    <div class="field"><label>Publishable / anon key</label><input id="cloudKey" type="password" placeholder="粘贴项目的公开密钥" autocomplete="off"></div>
    <div class="field"><label>同步密码</label><input id="cloudCode" type="password" placeholder="手机和电脑填写同一个密码" autocomplete="off"><div class="hint">同步内容会先在设备上用此密码加密，再上传云端；密码不会上传。</div></div>
    <div class="cloudactions"><button class="btn" id="disableCloudBtn">关闭云同步</button><button class="btn bluebtn" id="enableCloudBtn">启用并立即同步</button></div>
    <div class="hint">首次使用前，需要在 Supabase 的 SQL Editor 中执行仓库里的 <b>supabase-setup.sql</b>。</div>
  `;
  toolsSheet.insertBefore(cloudBox, closeBtn);

  const cloudStatus = document.getElementById('cloudStatus');
  const cloudUrl = document.getElementById('cloudUrl');
  const cloudKey = document.getElementById('cloudKey');
  const cloudCode = document.getElementById('cloudCode');

  function setCloudStatus(text) {
    cloudStatus.textContent = text;
    cloudTop.textContent = '云同步：' + text;
  }

  function cloudConfig() {
    try { return JSON.parse(localStorage.getItem(CLOUD_KEY) || '{}'); }
    catch (_) { return {}; }
  }

  function configured() {
    const c = cloudConfig();
    return Boolean(c.url && c.key && c.code);
  }

  function loadForm() {
    const c = cloudConfig();
    cloudUrl.value = c.url || '';
    cloudKey.value = c.key || '';
    cloudCode.value = c.code || '';
    setCloudStatus(configured() ? '已启用，等待同步' : '未启用');
  }

  function normalizeUrl(value) {
    return String(value || '').trim().replace(/\/+$/, '');
  }

  // Keep the form current whenever the existing Data button opens the sheet.
  const oldOpenTools = openTools;
  openTools = function () {
    loadForm();
    oldOpenTools();
  };

  document.getElementById('enableCloudBtn').addEventListener('click', async () => {
    const cfg = {
      url: normalizeUrl(cloudUrl.value),
      key: cloudKey.value.trim(),
      code: cloudCode.value,
    };
    if (!/^https:\/\/.+\.supabase\.co$/i.test(cfg.url)) return toast('Supabase 项目网址格式不正确');
    if (cfg.key.length < 20) return toast('请填写 Publishable / anon key');
    if (cfg.code.length < 8) return toast('同步密码至少8位');
    localStorage.setItem(CLOUD_KEY, JSON.stringify(cfg));
    setCloudStatus('正在连接…');
    await cloudSync(true);
  });

  document.getElementById('disableCloudBtn').addEventListener('click', () => {
    if (!confirm('确定关闭云同步吗？本机数据不会删除。')) return;
    localStorage.removeItem(CLOUD_KEY);
    clearTimeout(cloudTimer);
    loadForm();
    toast('云同步已关闭');
  });

  // ---------- Encryption ----------
  function bytesToB64(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return btoa(binary);
  }

  function b64ToBytes(value) {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  async function shaHex(text) {
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(hash)].map(x => x.toString(16).padStart(2, '0')).join('');
  }

  async function aesKey(code, syncId) {
    const material = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(code),
      'PBKDF2',
      false,
      ['deriveKey'],
    );
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: new TextEncoder().encode('specimen-sync-v1:' + syncId),
        iterations: 180000,
        hash: 'SHA-256',
      },
      material,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    );
  }

  async function encryptCloud(object, code, syncId) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await aesKey(code, syncId);
    const plain = new TextEncoder().encode(JSON.stringify(object));
    const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain);
    return JSON.stringify({
      v: 1,
      iv: bytesToB64(iv),
      cipher: bytesToB64(new Uint8Array(cipher)),
    });
  }

  async function decryptCloud(payload, code, syncId) {
    const packed = JSON.parse(payload);
    const key = await aesKey(code, syncId);
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: b64ToBytes(packed.iv) },
      key,
      b64ToBytes(packed.cipher),
    );
    return JSON.parse(new TextDecoder().decode(plain));
  }

  // ---------- Supabase RPC ----------
  async function rpc(functionName, body) {
    const cfg = cloudConfig();
    const response = await fetch(cfg.url + '/rest/v1/rpc/' + functionName, {
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

  function mergeRemote(remoteItems) {
    const remoteMap = new Map((remoteItems || []).map(item => [item.name, item]));
    let localNewer = false;
    let remoteApplied = false;

    data = data.map(local => {
      const remote = remoteMap.get(local.name);
      if (!remote) {
        if ((Number(local.updatedAt) || 0) > 0) localNewer = true;
        return local;
      }

      const localTime = Number(local.updatedAt) || 0;
      const remoteTime = Number(remote.updatedAt) || 0;
      if (remoteTime > localTime) {
        remoteApplied = true;
        return {
          ...local,
          category: remote.category || '',
          location: remote.location || '',
          note: remote.note || '',
          classified: Boolean(remote.classified),
          updatedAt: remoteTime,
        };
      }
      if (localTime > remoteTime) {
        localNewer = true;
        return local;
      }

      const localValues = [local.category || '', local.location || '', local.note || '', Boolean(local.classified)];
      const remoteValues = [remote.category || '', remote.location || '', remote.note || '', Boolean(remote.classified)];
      const localFields = JSON.stringify(localValues);
      const remoteFields = JSON.stringify(remoteValues);
      if (localFields !== remoteFields) {
        const score = values => (values[0] ? 2 : 0) + (values[1] ? 2 : 0) + (values[2] ? 1 : 0) + (values[3] ? 3 : 0);
        const localScore = score(localValues);
        const remoteScore = score(remoteValues);
        if (remoteScore > localScore || (remoteScore === localScore && remoteFields > localFields)) {
          remoteApplied = true;
          return {
            ...local,
            category: remoteValues[0],
            location: remoteValues[1],
            note: remoteValues[2],
            classified: remoteValues[3],
            updatedAt: remoteTime,
          };
        }
        localNewer = true;
      }
      return local;
    });

    return { localNewer, remoteApplied };
  }

  async function cloudSync(manual = false) {
    if (!configured() || cloudBusy || !navigator.onLine) return;
    if (!Array.isArray(data) || data.length !== SPECIMEN_DATA.length) {
      setTimeout(() => cloudSync(manual), 350);
      return;
    }
    cloudBusy = true;
    const cfg = cloudConfig();

    try {
      setCloudStatus('正在同步…');
      const syncId = await shaHex('specimen-id:' + cfg.code);

      for (let attempt = 0; attempt < 3; attempt++) {
        const got = await rpc('get_specimen_blob', { p_sync_id: syncId });
        const row = Array.isArray(got) ? got[0] : got;
        const expected = row ? Number(row.updated_at) : 0;
        let remoteState = { items: [] };

        if (row) {
          try {
            remoteState = await decryptCloud(row.payload, cfg.code, syncId);
          } catch (_) {
            throw new Error('同步密码不正确，或云端数据损坏');
          }
        }

        const merged = mergeRemote(remoteState.items);
        if (merged.remoteApplied) {
          await originalPersist(false);
          render();
        }

        if (row && !merged.localNewer) {
          setCloudStatus('已同步 · ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          return;
        }

        const payload = await encryptCloud({ version: 6, items: data }, cfg.code, syncId);
        const newTime = Date.now();
        const put = await rpc('compare_put_specimen_blob', {
          p_sync_id: syncId,
          p_payload: payload,
          p_expected_updated_at: expected,
          p_new_updated_at: newTime,
        });
        const result = Array.isArray(put) ? put[0] : put;

        if (result && result.success) {
          setCloudStatus('已同步 · ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          if (manual) toast('云同步成功');
          return;
        }

        if (result && result.payload) {
          const latest = await decryptCloud(result.payload, cfg.code, syncId);
          mergeRemote(latest.items);
          await originalPersist(false);
          render();
        }
      }

      throw new Error('手机和电脑同时修改过多，请稍后重试');
    } catch (error) {
      console.error(error);
      setCloudStatus('失败：' + String(error.message || error).slice(0, 70));
      if (manual) toast('云同步失败，请检查设置');
    } finally {
      cloudBusy = false;
    }
  }

  function scheduleCloud() {
    if (!configured()) return;
    clearTimeout(cloudTimer);
    cloudTimer = setTimeout(() => cloudSync(false), 900);
  }

  // Hook the existing local save routine, preserving all existing behavior.
  const originalPersist = persist;
  persist = async function (show = true) {
    await originalPersist(show);
    scheduleCloud();
  };

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) cloudSync(false);
  });
  window.addEventListener('online', () => cloudSync(false));
  setInterval(() => cloudSync(false), 15000);

  loadForm();
  if (configured()) cloudSync(false);
})();
