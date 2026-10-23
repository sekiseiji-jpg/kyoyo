/* 読み物アプリの本体（古典文学・近現代文学・英米文学・日本人のノーベル賞で同じものを使う）
   作品を持たず人物だけを並べる分野もある（WORKS が空のとき、人物一覧が入口になる）。
   画面は3つ（作品一覧 / 作品の扉 / 本文）。URLのハッシュで行き来する。
     #w=genji            作品の扉
     #w=genji&m=5        第5（巻・帖・章…）
     #w=genji&m=5&t=genbun  原文で開く
   本文は1つずつ別ファイルにしてあり、開いたものだけを <script> で読み込む。
   作品ごとの違いは data-works.js の APP と WORKS に置き、このファイル は触らない。
*/
(function () {
  'use strict';

  var KEY = APP.key;
  var TEXT_VER = APP.textVer;          // 本文URLの ?v=（本文を直したときだけ上げる）
  var CACHE_NAME = APP.textCache;      // 本文用。sw.js の TEXTS と必ず同じ文字列にする
  var U0 = APP.unit || '巻';            // この本棚でのかぞえ方（巻・章など）
  var $ = function (id) { return document.getElementById(id); };
  var el = function (tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  };
  var workById = {};
  WORKS.forEach(function (w) { workById[w.id] = w; });

  /* ---------- 保存（設定と読んだ記録） ---------- */
  var st = { size: 'm', theme: 'auto', lh: 'n', rate: '1', read: {}, last: null };
  try {
    var raw = localStorage.getItem(KEY);
    if (raw) {
      var o = JSON.parse(raw);
      for (var k in st) if (o[k] !== undefined) st[k] = o[k];
    }
  } catch (e) { /* 読めなくても既定値で動かす */ }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {}
  }
  function applySettings() {
    var r = document.documentElement;
    r.setAttribute('data-size', st.size);
    r.setAttribute('data-lh', st.lh);
    if (st.theme === 'auto') r.removeAttribute('data-theme');
    else r.setAttribute('data-theme', st.theme);
  }

  /* ---------- 本文の読み込み ---------- */
  var cache = {};            // 'genji/5' -> {y:[], g:[]}
  var pending = {};
  window.TEXT = function (no, data) {   // 本文ファイルが呼ぶ
    var key = window.__loadingWork + '/' + no;
    cache[key] = data;
    if (pending[key]) { pending[key].forEach(function (f) { f(data); }); delete pending[key]; }
  };
  function textUrl(workId, no) {
    return 'text/' + workId + '/' + (no < 10 ? '0' + no : no) + '.js?v=' + TEXT_VER;
  }
  function loadText(workId, no, cb, onErr) {
    var key = workId + '/' + no;
    if (cache[key]) { cb(cache[key]); return; }
    if (pending[key]) { pending[key].push(cb); return; }
    pending[key] = [cb];
    window.__loadingWork = workId;
    var s = document.createElement('script');
    s.src = textUrl(workId, no);
    s.onerror = function () { delete pending[key]; onErr(); };
    document.head.appendChild(s);
  }

  /* ---------- 本文のまとめ保存（オフラインで通読するため） ---------- */
  /* 本文は開いた巻だけが端末に残る作りなので、作品ごとにまとめて
     Service Worker と同じキャッシュへ入れられるようにする。
     キャッシュ名（CACHE_NAME）と本文URLの ?v= が sw.js とずれると、
     保存したのに使われないという分かりにくい不具合になる。 */
  var canSave = ('caches' in window) && location.protocol.indexOf('http') === 0;
  var dl = null;    // 保存中の様子 {id, done, bad, total, stop}
  var uis = {};     // 作品id -> 設定シート内の部品

  function size2(bytes) {
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + 'MB';
    if (bytes >= 1024) return Math.round(bytes / 1024) + 'KB';
    return bytes + 'B';
  }
  function unitOf(w) { return w.unit || U0; }

  // 保存済みの巻数とおよその容量を数える
  function scanSaved(w) {
    return caches.open(CACHE_NAME).then(function (c) {
      return Promise.all(w.maki.map(function (m) {
        return c.match(textUrl(w.id, m.no)).then(function (res) {
          if (!res) return 0;
          return res.blob().then(function (b) { return b.size || 1; });
        });
      }));
    }).then(function (sizes) {
      var n = 0, size = 0;
      sizes.forEach(function (s) { if (s) { n++; size += s; } });
      return { n: n, size: size, all: w.maki.length };
    });
  }

  // いまの保存の状態を出す
  function showSaved(w) {
    var ui = uis[w.id];
    if (!ui) return Promise.resolve();
    ui.save.disabled = true; ui.del.disabled = true;
    ui.state.textContent = '数えています…';
    return scanSaved(w).then(function (r) {
      ui = uis[w.id];
      if (!ui || (dl && dl.id === w.id)) return;
      ui.bar.classList.add('hidden');
      ui.save.disabled = !!dl;
      ui.del.disabled = !!dl || r.n === 0;
      ui.save.textContent = r.n >= r.all ? '保存しなおす' : '全' + unitOf(w) + 'を保存';
      ui.state.textContent = r.n === 0
        ? 'まだ保存していません'
        : (r.n >= r.all
          ? '保存済み（全' + r.all + unitOf(w) + '・約' + size2(r.size) + '）'
          : r.all + unitOf(w) + '中 ' + r.n + unitOf(w) + 'を保存しています（約' + size2(r.size) + '）');
    }, function () {
      ui = uis[w.id];
      if (!ui) return;
      ui.state.textContent = '保存の状態を調べられませんでした';
      ui.save.disabled = false;
    });
  }

  // 保存中の表示（シートを閉じて開きなおしても続きが見える）
  function showRunning(w) {
    var ui = uis[w.id];
    if (!ui || !dl) return;
    ui.bar.classList.remove('hidden');
    ui.save.textContent = dl.stop ? '止めています…' : '中止';
    ui.save.disabled = !!dl.stop;
    ui.del.disabled = true;
    ui.state.textContent = dl.done + ' / ' + dl.total + ' ' + unitOf(w);
    ui.fill.style.width = Math.round(dl.done / dl.total * 100) + '%';
  }

  // 本文を1件ずつ取って、Service Worker と同じキャッシュに入れる
  function saveWork(w) {
    dl = { id: w.id, done: 0, bad: 0, total: w.maki.length, stop: false };
    showRunning(w);
    caches.open(CACHE_NAME).then(function (c) {
      function next() {
        var i = dl.done + dl.bad;
        if (dl.stop || i >= dl.total) return Promise.resolve();
        var url = textUrl(w.id, w.maki[i].no);
        return fetch(url).then(function (res) {
          if (!res || !res.ok) throw new Error('ng');
          return c.put(url, res.clone());
        }).then(function () { dl.done++; }, function () { dl.bad++; })
          .then(function () { showRunning(w); return next(); });
      }
      return next();
    }).then(function () {
      var bad = dl.bad, stopped = dl.stop;
      dl = null;
      return showSaved(w).then(function () {
        var ui = uis[w.id];
        if (!ui) return;
        if (stopped) ui.state.textContent += '　途中で止めました';
        else if (bad) ui.state.textContent += '　' + bad + unitOf(w) + 'は取り込めませんでした';
        showRoom();
      });
    }, function () {
      dl = null;
      showSaved(w);
    });
  }

  // 本文だけを消す（骨組みは残す）
  function dropWork(w) {
    var ui = uis[w.id];
    ui.save.disabled = true; ui.del.disabled = true;
    ui.state.textContent = '消しています…';
    caches.open(CACHE_NAME).then(function (c) {
      return c.keys().then(function (ks) {
        // 古い ?v= の本文も残っていれば一緒に消す
        var mine = ks.filter(function (rq) { return rq.url.indexOf('/text/' + w.id + '/') >= 0; });
        return Promise.all(mine.map(function (rq) { return c.delete(rq); }));
      });
    }).then(function () { showSaved(w).then(showRoom); }, function () { showSaved(w); });
  }

  // 設定シートの「オフラインで読む」を組み立てる
  function renderSave() {
    var box = $('dl-list');
    box.textContent = '';
    uis = {};
    if (!canSave) {
      box.appendChild(el('p', 'hint',
        'この開き方では本文をまとめて保存できません。http から開くと使えます。'));
      $('dl-hint').textContent = '';
      return;
    }
    WORKS.forEach(function (w) {
      var d = el('div', 'dl');
      var top = el('div', 'dl-top');
      top.appendChild(el('b', null, w.title));
      var state = el('span', 'dl-state', '数えています…');
      top.appendChild(state);
      d.appendChild(top);
      var bar = el('div', 'dl-bar hidden');
      var fill = el('i');
      bar.appendChild(fill);
      d.appendChild(bar);
      var btns = el('div', 'dl-btns');
      var save = el('button', 'mini', '全' + unitOf(w) + 'を保存');
      var del = el('button', 'mini', '保存した本文を消す');
      btns.appendChild(save); btns.appendChild(del);
      d.appendChild(btns);
      box.appendChild(d);
      uis[w.id] = { state: state, bar: bar, fill: fill, save: save, del: del };

      save.onclick = function () {
        if (dl && dl.id === w.id) { dl.stop = true; showRunning(w); return; }
        if (dl) return;
        saveWork(w);
      };
      del.onclick = function () {
        if (dl) return;
        if (!confirm(w.title + 'の保存した本文を消します。よろしいですか。')) return;
        dropWork(w);
      };

      if (dl && dl.id === w.id) showRunning(w);
      else showSaved(w);
    });
    showRoom();
  }

  // 端末の空きに触れる
  function showRoom() {
    var hint = $('dl-hint');
    var base = '保存すると、通信のない場所でも、まだ開いていない巻まで読めます。';
    hint.textContent = base;
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then(function (q) {
        if (!q || !q.quota) return;
        var used = q.usage || 0;
        hint.textContent = base + 'この端末ではいま約' + size2(used) +
          '使っていて、あと約' + size2(Math.max(q.quota - used, 0)) + '保存できます。';
      }).catch(function () {});
    }
  }

  /* ---------- 画面1 作品一覧 ---------- */
  function renderWorks() {
    $('works-lead').textContent = APP.lead;
    var box = $('work-list');
    box.textContent = '';
    WORKS.forEach(function (w) {
      var b = el('button', 'card');
      b.style.setProperty('--wc', w.color);
      b.appendChild(el('div', 'ic', w.icon));
      b.appendChild(el('h2', null, w.title));
      b.appendChild(el('div', 'by', w.author + '　' + w.era));
      b.appendChild(el('div', 'ld', w.lead));
      var read = countRead(w);
      b.appendChild(el('div', 'meta',
        '全' + w.maki.length + unitOf(w) + '　' + fmt(totalChars(w)) + '字' +
        (read ? '　／　読んだ' + unitOf(w) + ' ' + read : '')));
      b.onclick = function () { go('#w=' + w.id); };
      box.appendChild(b);
    });
  }
  function totalChars(w) {
    return w.maki.reduce(function (a, m) { return a + m.chars[0] + m.chars[1]; }, 0);
  }
  function countRead(w) {
    return w.maki.filter(function (m) { return st.read[w.id + '/' + m.no]; }).length;
  }
  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  /* ---------- 画面2 作品の扉 ---------- */
  var curWork = null;
  function renderWork(w) {
    curWork = w;
    var h = $('work-hero');
    h.textContent = '';
    h.appendChild(el('div', 'ic', w.icon));
    h.appendChild(el('h2', null, w.title + '　' + '（' + w.yomi + '）'));
    h.appendChild(el('div', 'by', w.author + '　' + w.era));
    h.appendChild(el('div', 'ld', w.lead));
    var au = HAS_AUTHORS && authorOfWork[w.id];
    if (au) {
      var ab = el('button', 'abtn');
      ab.appendChild(portrait(au, 'tiny'));
      var at = el('span', 'tx');
      at.appendChild(el('b', null, au.name + 'について'));
      at.appendChild(el('span', 'sub', au.lead));
      ab.appendChild(at);
      ab.onclick = function () { go('#a=' + au.id); };
      h.appendChild(ab);
    }

    // 本文の一覧（部ごとにまとめる）
    var mk = $('work-maki');
    mk.textContent = '';
    (w.parts || [null]).forEach(function (p) {     // 部立てのない作品は一続きで並べる
      if (p) {
        var pb = el('div', 'partbox');
        var t = el('div');
        t.appendChild(el('b', null, p.t));
        t.appendChild(el('span', 'rg', p.range));
        pb.appendChild(t);
        pb.appendChild(el('p', null, p.b));
        mk.appendChild(pb);
      }
      var list = el('div', 'makilist');
      w.maki.filter(function (m) { return !p || m.part === p.n; }).forEach(function (m) {
        list.appendChild(makiRow(w, m));
      });
      mk.appendChild(list);
    });

    // この作品について
    var ab = $('work-about');
    ab.textContent = '';
    w.about.forEach(function (p) { ab.appendChild(el('p', 'about', p)); });

    // 本文の出どころ
    var sr = $('work-source');
    sr.textContent = '';
    w.sources.forEach(function (s) {
      var d = el('div', 'src');
      var t2 = el('div');
      t2.appendChild(el('b', null, s.label));
      t2.appendChild(el('span', 'who', s.by));
      d.appendChild(t2);
      d.appendChild(el('p', null, s.note));
      sr.appendChild(d);
    });
  }
  function makiRow(w, m) {
    var b = el('button', 'mk');
    b.appendChild(el('div', 'no', String(m.no)));
    var tx = el('div', 'tx');
    var nm = el('div', 'nm', m.name);
    nm.appendChild(el('span', 'ym', m.yomi));
    tx.appendChild(nm);
    tx.appendChild(el('div', 'ld', m.lead));
    b.appendChild(tx);
    if (st.read[w.id + '/' + m.no]) b.appendChild(el('div', 'rd', '読了'));
    b.onclick = function () { go('#w=' + w.id + '&m=' + m.no); };
    return b;
  }
  document.querySelector('[data-wtab="maki"]').textContent = U0 + '一覧';
  document.querySelectorAll('[data-wtab]').forEach(function (t) {
    t.onclick = function () {
      document.querySelectorAll('[data-wtab]').forEach(function (x) { x.classList.remove('on'); });
      t.classList.add('on');
      ['maki', 'about', 'source'].forEach(function (k) {
        $('work-' + k).classList.toggle('hidden', k !== t.dataset.wtab);
      });
    };
  });

  /* ---------- 画面3 巻 ---------- */
  var curMaki = null, curType = 'yaku';
  // その巻にその種類の本文があるか（chars は [訳の字数, 原文の字数]、
  // 訳が二種類ある作品だけ [訳, 原文, 対照用の訳] の三つ）
  function has(m, type) {
    if (type === 'taisho') {
      if (!(m.chars[1] > 0)) return false;
      // 対照用の訳を別に持つ作品はそれを、持たない作品は aligned のついた訳を並べる
      return m.chars.length > 2 ? m.chars[2] > 0 : (m.chars[0] > 0 && !!m.aligned);
    }
    return (type === 'yaku' ? m.chars[0] : m.chars[1]) > 0;
  }
  // 章を開いたとき最初に出す本文。英米文学のように原文を先に見せたい分野は APP.firstType で変える
  function firstType(m) {
    var pref = APP.firstType === 'genbun' ? 'genbun' : 'yaku';
    var other = pref === 'yaku' ? 'genbun' : 'yaku';
    return has(m, pref) ? pref : other;
  }
  function labelOf(w, type) {
    return type === 'genbun' ? '原文' : (w.yakuLabel || '現代語訳');
  }
  function noteOf(w, type) {
    // 「現代語訳」という語は分野で変わる（英米文学は日本語訳）。APP に出しておく。
    if (type === 'taisho') return w.taishoNote || APP.taishoNote || '原文と現代語訳を一段ずつ並べています。';
    var label = labelOf(w, type);
    for (var i = 0; i < w.sources.length; i++) {
      if (w.sources[i].label === label) {
        return w.sources[i].by === '―' ? '' : label + '：' + w.sources[i].by;
      }
    }
    return '';
  }
  function renderMaki(w, m, type) {
    spStop();
    curWork = w; curMaki = m; curType = type;
    var h = $('maki-head');
    h.textContent = '';
    h.appendChild(el('div', 'no', w.title + '　第' + m.no + unitOf(w)));
    var t = el('h2', null, m.name);
    h.appendChild(t);
    h.appendChild(el('div', 'ym', m.yomi));

    var s = $('maki-summary');
    s.textContent = '';
    s.appendChild(el('b', null, 'この' + unitOf(w) + 'のあらすじ'));
    m.summary.forEach(function (p) { s.appendChild(el('p', null, p)); });

    // 語注。data-notes.js を置いた分野にだけ出る（無い分野は要素もデータも無いので何もしない）。
    var nb = $('maki-notes');
    if (nb) {
      var gl = (typeof NOTES !== 'undefined' && NOTES[w.id + '/' + m.no]) || [];
      nb.textContent = '';
      nb.hidden = !gl.length;
      if (gl.length) {
        nb.appendChild(el('b', null, '語注'));
        var ul = el('ul', 'gloss');
        gl.forEach(function (g) {
          var li = el('li');
          li.appendChild(el('span', 'gw', g.w));
          li.appendChild(el('span', 'gd', g.d));
          ul.appendChild(li);
        });
        nb.appendChild(ul);
      }
    }

    // その巻にある本文だけボタンを出す（作品によって訳だけ・原文だけのものがある）
    var many = (has(m, 'yaku') ? 1 : 0) + (has(m, 'genbun') ? 1 : 0) > 1;
    document.querySelectorAll('[data-text]').forEach(function (b) {
      var avail = has(m, b.dataset.text);
      b.classList.toggle('hidden', !avail || !many);
      b.classList.toggle('on', b.dataset.text === type);
      if (b.dataset.text === 'yaku') b.textContent = labelOf(w, 'yaku');
      b.onclick = function () { go('#w=' + w.id + '&m=' + m.no + '&t=' + b.dataset.text); };
    });
    $('sw-note').textContent = noteOf(w, type);

    var body = $('maki-body');
    body.className = 'body' + (type === 'genbun' ? ' genbun' : (type === 'taisho' ? ' taisho' : ''));
    body.textContent = '';
    body.appendChild(el('div', 'loading', '本文を読み込んでいます…'));

    loadText(w.id, m.no, function (d) {
      if (curMaki !== m || curType !== type) return;    // 読み込み中に別の巻へ移ったとき
      paint(body, d, type);
      st.read[w.id + '/' + m.no] = 1;
      st.last = { w: w.id, m: m.no, t: type };
      save();
    }, function () {
      body.textContent = '';
      body.appendChild(el('div', 'err', '本文を読み込めませんでした。通信を確かめて、もう一度お試しください。'));
    });

    // 前後の巻
    var pg = $('maki-pager');
    pg.textContent = '';
    var i = w.maki.indexOf(m);
    var U = unitOf(w);
    var prev = el('button', null, i > 0 ? '◀ 第' + w.maki[i - 1].no + U + '　' + w.maki[i - 1].name : '◀ 前へ');
    prev.disabled = i <= 0;
    prev.onclick = function () { go('#w=' + w.id + '&m=' + w.maki[i - 1].no + '&t=' + type); };
    var next = el('button', null, i < w.maki.length - 1 ? '第' + w.maki[i + 1].no + U + '　' + w.maki[i + 1].name + ' ▶' : '次へ ▶');
    next.disabled = i >= w.maki.length - 1;
    next.onclick = function () { go('#w=' + w.id + '&m=' + w.maki[i + 1].no + '&t=' + type); };
    pg.appendChild(prev); pg.appendChild(next);
  }
  function paint(body, d, type) {
    body.textContent = '';
    var frag = document.createDocumentFragment();
    if (type === 'taisho') {
      // 対照用の訳（t）を別に持つ作品はそれを並べる。無い作品はふだんの訳をそのまま並べる。
      var ys = d.t || d.y;
      d.g.forEach(function (line, i) {
        var box = el('div', 'pair');
        box.appendChild(el('p', 'gen' + (line.charAt(0) === 'w' ? ' waka' : ''), line.slice(1)));
        if (ys[i]) {
          // 種類つきの段落（rich の訳）は先頭1字が印なので落とす。対照用の訳に印は付けない。
          var yt = (!d.t && curWork && curWork.rich) ? ys[i].slice(1) : ys[i];
          var yp = el('p', 'yak');
          if (curWork && curWork.rich) ruby(yp, yt);
          else yp.textContent = yt;
          box.appendChild(yp);
        }
        frag.appendChild(box);
      });
    } else if (type === 'genbun') {
      d.g.forEach(function (line) {
        var waka = line.charAt(0) === 'w';
        frag.appendChild(el('p', waka ? 'waka' : null, line.slice(1)));
      });
    } else if (curWork && curWork.rich) {
      d.y.forEach(function (p) { frag.appendChild(richPara(p)); });
    } else {
      d.y.forEach(function (p) { frag.appendChild(el('p', null, p)); });
    }
    body.appendChild(frag);
  }

  /* ---------- 読み上げ ----------
     端末に入っている音声で本文を読む。ネットは使わないので、
     保存した本文と同じくオフラインでも動く。
     長い段落はそのまま渡すと途中で切れる端末があるので、文ごとに切って順に渡す。
     音声合成を持たない端末では、操作そのものを出さない。 */
  var SP = window.speechSynthesis || null;
  var spQ = [], spAt = -1;
  // 訳と原文で言語が違う分野がある（英米文学の原文は英語）。APP に出しておく。
  var Y_LANG = APP.speakLang || 'ja-JP';
  var G_LANG = APP.genbunLang || Y_LANG;
  var SP_MAX = 140;                      // 一度に渡す文字数の目安
  var SP_CLOSE = '」』）)”’"\'';          // 句点のあとに続く閉じ記号。ここでは切らない

  /* ルビの読み（<rt>）は親文字と二重に読まれてしまうので、たどらない。 */
  function spText(node) {
    var out = '';
    (function walk(n) {
      for (var i = 0; i < n.childNodes.length; i++) {
        var c = n.childNodes[i];
        if (c.nodeType === 3) out += c.nodeValue;
        else if (c.nodeType === 1 && c.tagName !== 'RT' && c.tagName !== 'RP') walk(c);
      }
    }(node));
    return out.replace(/\s+/g, ' ').trim();
  }

  function spChunks(s) {
    var out = [], buf = '';
    for (var i = 0; i < s.length; i++) {
      var c = s.charAt(i), nx = s.charAt(i + 1), stop = false;
      buf += c;
      if ('。！？'.indexOf(c) >= 0) stop = !nx || SP_CLOSE.indexOf(nx) < 0;
      else if ('.!?'.indexOf(c) >= 0) stop = !nx || nx === ' ';   // 略語や小数で切らない
      if (!stop && buf.length >= SP_MAX && c === ' ') stop = true;
      if (!stop && buf.length >= SP_MAX * 2) stop = true;         // 句点のない長文の保険
      if (stop) { out.push(buf); buf = ''; }
    }
    if (buf) out.push(buf);
    return out;
  }

  function spLangOf(p) {
    if (p.className.indexOf('gen') >= 0) return G_LANG;   // 対照表示の原文の段
    if (p.className.indexOf('yak') >= 0) return Y_LANG;   // 対照表示の訳の段
    return curType === 'genbun' ? G_LANG : Y_LANG;
  }

  function spVoice(lang) {
    var vs = (SP.getVoices && SP.getVoices()) || [];
    var head = lang.split('-')[0], i;
    for (i = 0; i < vs.length; i++) if (vs[i].lang.replace('_', '-') === lang) return vs[i];
    for (i = 0; i < vs.length; i++) if (vs[i].lang.replace('_', '-').split('-')[0] === head) return vs[i];
    return null;
  }

  function spBuild() {
    spQ = [];
    var ps = $('maki-body').querySelectorAll('p, h3');
    for (var i = 0; i < ps.length; i++) {
      var t = spText(ps[i]);
      if (!t) continue;
      var cs = spChunks(t), lang = spLangOf(ps[i]);
      for (var j = 0; j < cs.length; j++) spQ.push({ el: ps[i], text: cs[j], lang: lang });
    }
  }

  function spMark(i) {
    var ps = $('maki-body').querySelectorAll('.sp-now');
    for (var k = 0; k < ps.length; k++) ps[k].classList.remove('sp-now');
    if (i >= 0 && spQ[i]) {
      spQ[i].el.classList.add('sp-now');
      spQ[i].el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }

  /* その言語の音声が端末に入っていないと、別の言語の声で読まれて聞きとれない。
     黙って変な音を出すより、入っていないことを伝える。 */
  var spMiss = '';
  function spWarn() {
    var miss = [];
    for (var i = 0; i < spQ.length; i++) {
      if (!spVoice(spQ[i].lang) && miss.indexOf(spQ[i].lang) < 0) miss.push(spQ[i].lang);
    }
    spMiss = miss.length ? miss.join('・') + ' の音声がこの端末に入っていません' : '';
  }

  function spDraw() {
    var b = $('sp-play');
    if (!b) return;
    var on = spAt >= 0;
    b.textContent = on ? '■ とめる' : '▶ 読み上げ';
    b.classList.toggle('on', on);
    var prog = on ? (spAt + 1) + '／' + spQ.length : '';
    $('sp-note').textContent = prog + (spMiss ? (prog ? '　' : '') + spMiss : '');
  }

  function spStop() {
    if (!SP) return;
    spAt = -1;
    SP.cancel();
    if ($('maki-body')) spMark(-1);
    spDraw();
  }

  function spSay(i) {
    if (i >= spQ.length) { spStop(); return; }
    spAt = i;
    var u = new SpeechSynthesisUtterance(spQ[i].text);
    u.lang = spQ[i].lang;
    var v = spVoice(spQ[i].lang);
    if (v) u.voice = v;
    u.rate = Number(st.rate) || 1;
    // 読み終わりでも、読めずに終わっても次へ進める（声の無い言語で止まらないように）
    u.onend = function () { if (spAt === i) spSay(i + 1); };
    u.onerror = function () { if (spAt === i) spSay(i + 1); };
    spMark(i);
    SP.speak(u);
    spDraw();
  }

  function spSetup() {
    var bar = $('maki-speak');
    if (!bar) return;
    if (!SP || typeof SpeechSynthesisUtterance === 'undefined') { bar.hidden = true; return; }
    $('sp-play').onclick = function () {
      if (spAt >= 0) { spStop(); return; }
      spBuild();
      if (!spQ.length) return;
      spWarn();
      spSay(0);
    };
    var r = $('sp-rate');
    r.value = String(st.rate || '1');
    r.onchange = function () {
      st.rate = this.value; save();
      if (spAt >= 0) { var at = spAt; SP.cancel(); spSay(at); }   // 続きから読み直す
    };
    // 画面を閉じるとき、音声だけ残らないようにする
    window.addEventListener('pagehide', function () { SP.cancel(); });
  }

  /* 種類つきの段落。先頭1字が種類で、大文字は「前を一行あける」。
     p=本文 v=韻文や字下げ c=地から上げ h=小見出し */
  var KIND = { p: ['p', ''], v: ['p', 'verse'], c: ['p', 'right'], h: ['h3', 'sec'] };
  function richPara(src) {
    var k = src.charAt(0);
    var gap = k >= 'A' && k <= 'Z';
    var def = KIND[gap ? k.toLowerCase() : k] || KIND.p;
    var e = document.createElement(def[0]);
    e.className = (def[1] + (gap ? ' gap' : '')).trim();
    ruby(e, src.slice(1));
    return e;
  }

  /* 青空文庫のルビ記法を <ruby> に組む。
     ｜親文字《よみ》 のほか、｜のないものは直前の漢字の並びを親文字とする。 */
  var R_KANJI = /[々〆ヶ一-鿿㐀-䶿豈-﫿]+$/;
  var R_KANA = /[ぁ-ゟ゠-ヿA-Za-z0-9]+$/;
  function ruby(node, s) {
    var buf = '', i = 0;
    function flush() { if (buf) { node.appendChild(document.createTextNode(buf)); buf = ''; } }
    function put(base, yomi) {
      var r = document.createElement('ruby');
      r.appendChild(document.createTextNode(base));
      var rt = document.createElement('rt');
      rt.textContent = yomi;
      r.appendChild(rt);
      node.appendChild(r);
    }
    while (i < s.length) {
      var c = s.charAt(i);
      if (c === '｜' || c === '《') {
        var o = c === '｜' ? s.indexOf('《', i) : i;
        var e = o < 0 ? -1 : s.indexOf('》', o);
        if (e < 0) { buf += c; i++; continue; }
        var yomi = s.slice(o + 1, e);
        if (c === '｜') { flush(); put(s.slice(i + 1, o), yomi); }
        else {
          var m = R_KANJI.exec(buf) || R_KANA.exec(buf);
          if (m) { buf = buf.slice(0, buf.length - m[0].length); flush(); put(m[0], yomi); }
          else { flush(); node.appendChild(document.createTextNode(yomi)); }
        }
        i = e + 1;
        continue;
      }
      buf += c; i++;
    }
    flush();
  }


  /* ---------- 画面4・5 文豪（data-authors.js があるときだけ） ---------- */
  var HAS_AUTHORS = (typeof AUTHORS !== 'undefined') && AUTHORS.length > 0;
  var HAS_WORKS = WORKS.length > 0;          // 人物だけの分野（ノーベル賞一覧など）は作品がない
  var AS = APP.authorSections || {};         // 人物ページの見出し。分野によって呼び名が変わる
  var authorById = {}, authorOfWork = {};
  if (HAS_AUTHORS) {
    AUTHORS.forEach(function (a) {
      authorById[a.id] = a;
      (a.works || []).forEach(function (wid) { authorOfWork[wid] = a; });
    });
  }
  // 肖像は photo を持つ人にだけ出す（写真を載せない分野もある）
  function portrait(a, cls) {
    if (!a.photo) return null;
    var im = document.createElement('img');
    im.className = cls;
    im.src = 'authors/' + a.id + '.jpg';
    im.alt = a.name + 'の肖像';
    im.loading = cls === 'pimg' ? 'lazy' : 'eager';   // 一覧の小さな写真だけ後回し
    im.width = 240; im.height = 320;
    return im;
  }
  function renderAuthors() {
    $('authors-lead').textContent = APP.authorsLead
      || ('この本棚に作品を収めた' + AUTHORS.length + '人です。生まれた年の順に並べています。');
    var box = $('author-list');
    box.textContent = '';
    AUTHORS.forEach(function (a) {
      var b = el('button', 'pcard' + (a.photo ? '' : ' nopic'));
      var im = portrait(a, 'pimg');
      if (im) b.appendChild(im);
      var t = el('div', 'pt');
      t.appendChild(el('h2', null, a.name));
      t.appendChild(el('div', 'ym', a.yomi));
      t.appendChild(el('div', 'yr', a.born + '〜' + (a.died || '')));
      t.appendChild(el('div', 'ld', a.lead));
      t.appendChild(el('div', 'meta', a.meta || ('収録 ' + (a.works || []).length + '作品')));
      b.appendChild(t);
      b.onclick = function () { go('#a=' + a.id); };
      box.appendChild(b);
    });
  }
  function renderAuthor(a) {
    var h = $('author-hero');
    h.textContent = '';
    var bim = portrait(a, 'bimg');
    if (bim) h.appendChild(bim);
    var t = el('div', 'ph');
    t.appendChild(el('h2', null, a.name));
    t.appendChild(el('div', 'ym', a.yomi + (a.real ? '　本名 ' + a.real : '')));
    t.appendChild(el('div', 'yr', a.life));
    t.appendChild(el('div', 'yr', '出身　' + a.home));
    var tg = el('div', 'tags');
    (a.tags || []).forEach(function (x) { tg.appendChild(el('span', 'tag', x)); });
    t.appendChild(tg);
    t.appendChild(el('p', 'ld', a.lead));
    h.appendChild(t);

    var d = $('author-body');
    d.textContent = '';
    function sect(title, cls) {
      var s = el('section', 'asect' + (cls ? ' ' + cls : ''));
      s.appendChild(el('h3', null, title));
      d.appendChild(s);
      return s;
    }
    function paras(s, xs) { xs.forEach(function (p) { s.appendChild(el('p', null, p)); }); }
    paras(sect(AS.bio || '略歴'), a.bio);
    paras(sect(AS.person || 'どういう人物か'), a.person);
    paras(sect(AS.style || 'どんな作品を書いたか'), a.style);

    if (HAS_WORKS) {
    var s1 = sect(AS.works || 'この本棚に入っている作品');
    var g = el('div', 'awork');
    (a.works || []).forEach(function (wid) {
      var w = workById[wid];
      if (!w) return;
      var b = el('button', 'wbtn');
      b.appendChild(el('span', 'ic', w.icon));
      var tx = el('span', 'tx');
      tx.appendChild(el('b', null, w.title));
      tx.appendChild(el('span', 'sub', w.era + (w.genre ? '　' + w.genre : '')));
      b.appendChild(tx);
      b.onclick = function () { go('#w=' + w.id); };
      g.appendChild(b);
    });
    s1.appendChild(g);
    }

    var s2 = sect(AS.books || 'ほかの代表作');
    var bl = el('div', 'books');
    (a.books || []).forEach(function (bk) {
      var r = el('div', 'bk');
      var hd = el('div', 'bh');
      hd.appendChild(el('b', null, bk.t));
      hd.appendChild(el('span', 'y', bk.y));
      r.appendChild(hd);
      r.appendChild(el('p', null, bk.b));
      bl.appendChild(r);
    });
    s2.appendChild(bl);

    if (a.photo) {
      var s3 = sect('写真について', 'src');
      s3.appendChild(el('p', null,
        'ウィキメディア・コモンズ「' + a.photo.file + '」（' + a.photo.lic
        + '）。著作権の保護期間が満了した写真です。'));
    }
  }

  /* ---------- 画面の切り替え ---------- */
  function show(v) {
    spStop();
    ['works', 'work', 'maki', 'authors', 'author'].forEach(function (k) {
      var e = $('view-' + k);                 // 文豪の画面は無い分野もある
      if (e) e.classList.toggle('hidden', k !== v);
    });
    var sw = $('top-switch');
    if (sw) {
      sw.classList.toggle('hidden', !HAS_WORKS || (v !== 'works' && v !== 'authors'));
      sw.querySelectorAll('[data-top]').forEach(function (b) {
        b.classList.toggle('on', b.dataset.top === v);
      });
    }
  }
  function go(hash) {
    if (location.hash === hash) route();
    else location.hash = hash;
  }
  function parse() {
    var o = {};
    location.hash.replace(/^#/, '').split('&').forEach(function (kv) {
      var i = kv.indexOf('=');
      if (i > 0) o[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1));
    });
    return o;
  }
  function route() {
    var q = parse();
    // ポータル検索からは #u=<作品id>-<巻番号>、文豪は #u=a-<文豪id> の形で来る
    if (q.u && !q.w && !q.a) {
      if (HAS_AUTHORS && q.u.indexOf('a-') === 0 && authorById[q.u.slice(2)]) {
        q.a = q.u.slice(2);
      } else {
        var mu = /^(.+)-(\d+)$/.exec(q.u);
        if (mu && workById[mu[1]]) { q.w = mu[1]; q.m = mu[2]; }
      }
    }
    if (HAS_AUTHORS && q.a && authorById[q.a]) {
      renderAuthor(authorById[q.a]);
      show('author');
      $('bar-title').textContent = authorById[q.a].name;
      window.scrollTo(0, 0);
      return;
    }
    if (HAS_AUTHORS && q.p === 'authors') {
      renderAuthors();
      show('authors');
      $('bar-title').textContent = APP.authorWord || '文豪';
      window.scrollTo(0, 0);
      return;
    }
    var w = q.w && workById[q.w];
    if (w && q.m) {
      var m = w.maki.filter(function (x) { return String(x.no) === String(q.m); })[0];
      if (m) {
        // URL で指定がなければ、その分野の既定（APP.firstType）に従う
        var want = (q.t === 'genbun' || q.t === 'taisho' || q.t === 'yaku') ? q.t : firstType(m);
        if (!has(m, want)) want = firstType(m);
        renderMaki(w, m, want);
        show('maki');
        $('bar-title').textContent = w.title + '　' + m.name;
        window.scrollTo(0, 0);
        return;
      }
    }
    if (w) {
      renderWork(w);
      show('work');
      $('bar-title').textContent = w.title;
      window.scrollTo(0, 0);
      return;
    }
    if (!HAS_WORKS && HAS_AUTHORS) {       // 人物だけの分野は、人物一覧が入口になる
      renderAuthors();
      show('authors');
      $('bar-title').textContent = APP.title;
      return;
    }
    renderWorks();
    show('works');
    $('bar-title').textContent = APP.title;
  }
  window.addEventListener('hashchange', route);

  $('btn-back').onclick = function () {
    var q = parse();
    if (q.m) location.hash = '#w=' + q.w;
    else if (q.a) location.hash = '#p=authors';
    else if (q.w || q.p) location.hash = '';
    else location.href = '../';
  };
  if ($('top-switch')) {
    $('top-switch').querySelectorAll('[data-top]').forEach(function (b) {
      b.onclick = function () { go(b.dataset.top === 'authors' ? '#p=authors' : ''); };
    });
  }

  /* ---------- 設定 ---------- */
  $('btn-set').onclick = function () {
    $('set-size').value = st.size;
    $('set-theme').value = st.theme;
    $('set-lh').value = st.lh;
    var n = 0;
    for (var k in st.read) n++;
    $('read-hint').textContent = '読んだ' + U0 + 'は ' + n;
    renderSave();
    $('setwrap').classList.remove('hidden');
  };
  $('btn-close').onclick = function () { $('setwrap').classList.add('hidden'); };
  $('setwrap').onclick = function (e) { if (e.target === $('setwrap')) $('setwrap').classList.add('hidden'); };
  $('set-size').onchange = function () { st.size = this.value; applySettings(); save(); };
  $('set-theme').onchange = function () { st.theme = this.value; applySettings(); save(); };
  $('set-lh').onchange = function () { st.lh = this.value; applySettings(); save(); };
  $('btn-clear').onclick = function () {
    if (!confirm('読んだ' + U0 + 'の記録を消します。よろしいですか。')) return;
    st.read = {}; st.last = null; save(); route();
    $('read-hint').textContent = '読んだ' + U0 + 'は 0';
  };

  /* ---------- 起動 ---------- */
  applySettings();
  spSetup();
  route();
  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }
})();
