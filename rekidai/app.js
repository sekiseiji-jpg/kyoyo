'use strict';

/* =========================================================
   歴代と名家 ― 一般教養Note の「歴代と名家」分野から開く別アプリ。
     #tenno 歴代天皇 ／ #buke 将軍と執権 ／ #souri 歴代総理大臣
     #meika-jp 日本の名家 ／ #meika-world 世界の名家
     あとに & でつなぐと、開いた形を指定できる。解説カードから飛んでくるときに使う。
       n=50      … その代を開く（#tenno&n=50）
       e=heian   … その時代だけに絞る（#tenno&e=heian）
       q=院政     … その言葉で探した形にする（#tenno&q=院政）

   一覧は2種類ある。代が順に続くもの（kind なし）と、家を並べるもの（kind: 'house'）。
   家のほうは代も在位も持たないので、行の作りとまとめの数字を分けてある。

   データは代ごとに in / out の年だけを持ち、
   「何年から何年まで」「何年続いたか」「人数」「最長・最短」は
   すべてこの app.js が数える。手で書いた数字と食い違わないようにするため。
   ========================================================= */
(function () {
  const $ = (id) => document.getElementById(id);
  const LISTS = [window.REK_TENNO, window.REK_BUKE, window.REK_SOURI,
    window.REK_MEIKA_JP, window.REK_MEIKA_WORLD];
  const isHouse = () => cur.kind === 'house';

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rich = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // いま（在任中の人の長さを数えるのに使う）
  const NOW = (() => { const d = new Date(); return d.getFullYear() + d.getMonth() / 12; })();

  function toast(msg) {
    const el = $('toast');
    el.textContent = msg; el.classList.add('show');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => el.classList.remove('show'), 1800);
  }

  // =========================================================
  // 年の読み方と書き方
  //   数値 … 西暦の年。負の数は紀元前。
  //   'YYYY-MM' … 月まで分かっているもの（総理大臣）。
  //   null … いまも続いている。
  // =========================================================
  function yv(v) {
    if (v === null || v === undefined) return NOW;
    if (typeof v === 'number') return v;
    const m = /^(\d{4})-(\d{2})$/.exec(v);
    return m ? Number(m[1]) + (Number(m[2]) - 1) / 12 : Number(v);
  }
  function fmtY(v) {
    if (v === null || v === undefined) return '現在';
    if (typeof v === 'number') return v < 0 ? `前${-v}年` : `${v}年`;
    const m = /^(\d{4})-(\d{2})$/.exec(v);
    return m ? `${Number(m[1])}年${Number(m[2])}月` : String(v);
  }
  const spanText = (it) => `${fmtY(it.from)}〜${fmtY(it.to)}`;
  const len = (it) => yv(it.to) - yv(it.from);
  /** 人を数えるときの鍵。重祚や再任（same つき）は前に出たその人と同じ人として数える */
  const who = (it) => it.same || it.name;
  const peopleOf = (items) => {
    const a = [];
    items.forEach((i) => { if (!a.includes(who(i))) a.push(who(i)); });
    return a;
  };

  /** 長さを日本語にする。月まで分かっているものは月で言う。 */
  function fmtLen(it) {
    const L = len(it);
    const byMonth = typeof it.from === 'string';
    if (byMonth) {
      const mo = Math.round(L * 12);
      if (mo < 12) return `約${Math.max(mo, 1)}か月`;
      const y = Math.floor(mo / 12); const r = mo % 12;
      return r ? `約${y}年${r}か月` : `約${y}年`;
    }
    const y = Math.round(L);
    return y <= 0 ? '1年に満たない' : `約${y}年`;
  }
  function fmtMonths(mo) {
    if (mo < 12) return `約${Math.max(Math.round(mo), 1)}か月`;
    const y = Math.floor(mo / 12); const r = Math.round(mo % 12);
    return r ? `約${y}年${r}か月` : `約${y}年`;
  }

  /** 表に出す名前。天皇は「○○天皇」と読ませたいので、一覧ごとの title を足す。 */
  function dispName(list, it) {
    if (it.disp) return it.disp;
    const era = list.eras.find((e) => e.id === it.era);
    const title = (era && era.title !== undefined) ? era.title : (list.title || '');
    return it.name + (title || '');
  }
  const seqText = (it) => (it.seq ? `（${it.seq}）` : '');

  // =========================================================
  // いまの状態
  // =========================================================
  let cur = LISTS[0];
  let q = '';
  let eraPick = '';        // '' はすべて
  let tagPick = '';
  let sel = null;          // 開いている項目の通し番号（cur.items の添字）

  const allTags = (list) => {
    const seen = [];
    list.items.forEach((i) => (i.tags || []).forEach((t) => { if (!seen.includes(t)) seen.push(t); }));
    return seen;
  };

  function shown() {
    const key = q.trim().toLowerCase();
    return cur.items.filter((it) => {
      if (eraPick && it.era !== eraPick) return false;
      if (tagPick && !(it.tags || []).includes(tagPick)) return false;
      if (!key) return true;
      const hay = [it.name, it.yomi, it.note || '', it.party || '', it.seq || '',
        it.rank || '', it.sub || '', it.years || '',
        dispName(cur, it), String(it.n)].join(' ').toLowerCase();
      return hay.includes(key);
    });
  }

  // =========================================================
  // 一覧を描く
  // =========================================================
  function draw() {
    const list = shown();
    const maxLen = Math.max(...cur.items.map(len), 1);
    const total = cur.items.length;

    $('count').textContent = list.length === total
      ? `${total}件`
      : `${list.length}件（全${total}件のうち）`;

    if (!list.length) {
      $('list').innerHTML = '<p class="empty">あてはまるものがありません。検索の言葉を変えるか、⟳ で絞り込みを外してください。</p>';
      return;
    }

    let html = '';
    let lastEra = null;
    list.forEach((it) => {
      if (it.era !== lastEra) {
        lastEra = it.era;
        const e = cur.eras.find((x) => x.id === it.era);
        const n = list.filter((x) => x.era === it.era).length;
        html += `<p class="group-head">${esc(e ? e.name : '')}<em>${esc(e && e.sub ? e.sub : '')}`
          + `${list.length === total ? '' : ` ／ ${n}件`}</em></p>`;
      }
      const i = cur.items.indexOf(it);
      const badges = (it.tags || []).map((t) => `<span class="badge">${esc(t)}</span>`).join('');
      html += `<button class="prow${i === sel ? ' on' : ''}" data-i="${i}">`
        + `<span class="pn">${isHouse() ? esc(it.rank || '') : `第${it.n}代`}</span>`
        + `<span class="pname">${esc(dispName(cur, it))}${esc(seqText(it))}<em>${esc(it.yomi)}</em>${badges}</span>`
        + `<span class="pyear">${isHouse() ? esc(it.sub || '') : esc(spanText(it))}</span>`
        + (isHouse() ? ''
          : `<span class="pbar"><i style="width:${Math.max((len(it) / maxLen) * 100, 1.5).toFixed(1)}%"></i></span>`)
        + '</button>';
      if (i === sel) html += detailHtml(it, list);
    });
    $('list').innerHTML = html;
    $('list').querySelectorAll('.prow').forEach((b) => {
      b.onclick = () => { const i = Number(b.dataset.i); sel = (sel === i) ? null : i; draw(); };
    });
    $('list').querySelectorAll('[data-go]').forEach((b) => {
      b.onclick = (ev) => {
        ev.stopPropagation();
        sel = Number(b.dataset.go);
        draw();
        const el = $('list').querySelector(`.prow[data-i="${sel}"]`);
        if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      };
    });
  }

  /** 開いた項目の中身。前後の代へ動けるようにする（絞り込んだ並びのなかで動く）。 */
  function detailHtml(it, list) {
    const at = list.indexOf(it);
    const prev = list[at - 1];
    const next = list[at + 1];
    const era = cur.eras.find((e) => e.id === it.era);
    const rows = [];
    if (isHouse()) {
      const cols = cur.cols || {};
      if (it.rank) rows.push([cols.rank || '区分', esc(it.rank)]);
      if (era) rows.push(['分け方', esc(era.name)]);
      if (it.sub) rows.push([cols.sub || '人', esc(it.sub)]);
      if (it.years) rows.push(['続いた年', esc(it.years)]);
    } else {
      rows.push(['在位・在職', esc(spanText(it)) + (it.to === null ? '<span class="badge">いまも</span>' : '')]);
      rows.push(['長さ', esc(fmtLen(it)) + (it.reignNote ? `<em class="yomi"> ／ ${esc(it.reignNote)}</em>` : '')]);
      if (era) rows.push([era.role ? '職' : '時代', esc(era.role || era.name)]);
      if (it.party) rows.push(['よりどころ', esc(it.party)]);
    }
    if (it.same) {
      const src = cur.items.find((x) => x.name === it.same);
      rows.push(['同じ人', src ? `第${src.n}代 ${esc(dispName(cur, src))}` : esc(it.same)]);
    }
    if (cur.showNth) rows.push(['人数のうえでは', `${personNth(it)}人目`]);

    return '<div class="detail">'
      + `<h3>${esc(dispName(cur, it))}${esc(seqText(it))}</h3>`
      + `<p class="yomi">${esc(it.yomi)}${isHouse() ? '' : ` ／ 第${it.n}代`}</p>`
      + `<dl>${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join('')}</dl>`
      + (it.note ? `<p class="note">${rich(it.note)}</p>` : '')
      + '<div class="nav">'
      + `<button ${prev ? `data-go="${cur.items.indexOf(prev)}"` : 'disabled'}>◀ ${prev ? esc(dispName(cur, prev)) : 'これが最初'}</button>`
      + `<button ${next ? `data-go="${cur.items.indexOf(next)}"` : 'disabled'}>${next ? esc(dispName(cur, next)) : 'これが最後'} ▶</button>`
      + '</div></div>';
  }

  /** 同じ名前が前に出ていなければ新しい人。何人目かを数える。 */
  function personNth(it) {
    const seen = [];
    for (const x of cur.items) {
      if (!seen.includes(who(x))) seen.push(who(x));
      if (x === it) return seen.indexOf(who(x)) + 1;
    }
    return 0;
  }

  // =========================================================
  // この一覧の数字（すべてデータから数える）
  // =========================================================
  function drawSums() {
    if (isHouse()) return drawSumsHouse();
    const items = cur.items;
    const people = peopleOf(items);

    // 最長・最短は「伝承の時代」など、年が伝えにすぎないものを外して数える
    const skip = cur.statsSkip || [];
    const real = items.filter((i) => !skip.includes(i.era));
    const sorted = real.slice().sort((a, b) => len(b) - len(a));
    const longest = sorted[0];
    const shortest = sorted[sorted.length - 1];
    const skipNote = '';

    const rows = [];
    // 将軍と執権のように数えが別のものは、まとめの数字も分けて出す
    const groups = cur.statsGroups
      || [{ name: '', eras: cur.eras.map((e) => e.id) }];
    const part = (g) => {
      const a = items.filter((i) => g.eras.includes(i.era));
      return { g, n: a.length, p: peopleOf(a).length };
    };
    const parts = groups.map(part);
    rows.push(['代の数', parts.map((x) => `${x.g.name}${x.n}代`).join('・')]);
    rows.push(['人数', parts.map((x) => `${x.g.name}${x.p}人`).join('・')
      + (people.length === items.length ? '' : '（同じ人が何度も就いている）')]);

    const women = people.filter((nm) => items.some((i) => who(i) === nm && (i.tags || []).includes('女性')));
    if (women.length) {
      const daisu = items.filter((i) => (i.tags || []).includes('女性')).length;
      rows.push(['女性', `${women.length}人${daisu !== women.length ? `・${daisu}代` : ''}（${women.join('・')}）`]);
    }

    if (longest) rows.push([`いちばん長い${skipNote}`, `${esc(dispName(cur, longest))} ${fmtLen(longest)}`]);
    if (shortest) {
      const ties = real.filter((i) => Math.abs(len(i) - len(shortest)) < 1 / 24);
      rows.push([`いちばん短い${skipNote}`,
        `${ties.slice(0, 2).map((i) => esc(dispName(cur, i))).join('・')}${ties.length > 2 ? 'ほか' : ''} ${fmtLen(shortest)}`]);
    }

    const sames = items.filter((i) => i.same);
    if (sames.length) {
      rows.push(['同じ人', sames.map((i) => {
        const src = items.find((x) => x.name === i.same);
        return `${esc(src ? src.name : i.same)}＝${esc(i.name)}`;
      }).join(' ／ ')]);
    }

    // 内閣のように代と人数が大きくずれる一覧では、通算の長さも出す
    if (cur.showNth) {
      const sum = people.map((nm) => ({
        nm,
        mo: items.filter((i) => who(i) === nm).reduce((a, i) => a + len(i) * 12, 0),
      })).sort((a, b) => b.mo - a.mo).slice(0, 3);
      rows.push(['通算が長い人', sum.map((s) => `${esc(s.nm)} ${fmtMonths(s.mo)}`).join(' ／ ')]);
    }

    $('sums').innerHTML = rows.map(([k, v]) => `<div><b>${esc(k)}</b><span>${v}</span></div>`).join('')
      + (skip.length ? `<p class="skipnote">※ いちばん長い・短いは、${esc(cur.statsSkipNote || '伝承の時代')}を除いて数えた。</p>` : '');
  }

  /** 家の一覧のまとめ。代も在位も無いので、数と内わけだけを出す。 */
  function drawSumsHouse() {
    const items = cur.items;
    const rows = [['家の数', `${items.length}家`]];
    cur.eras.forEach((e) => {
      const n = items.filter((i) => i.era === e.id).length;
      // 見出しの頭に書いた数は、ここでは数え直すので省く
      const sub = (e.sub || '').replace(/^\d+(か国|家|代)\s*(／\s*)?/, '');
      if (n) rows.push([e.name, `${n}家${sub ? `　${sub}` : ''}`]);
    });
    allTags(cur).forEach((t) => {
      const a = items.filter((i) => (i.tags || []).includes(t));
      rows.push([t, a.map((i) => esc(i.name)).join('・')]);
    });
    $('sums').innerHTML = rows.map(([k, v]) => `<div><b>${esc(k)}</b><span>${v}</span></div>`).join('')
      + (cur.asof ? `<p class="skipnote">※ いまの君主と即位の年は、${esc(cur.asof)}に確かめたもの。</p>` : '');
  }

  // =========================================================
  // 切り替え
  // =========================================================
  function setList(id, keepHash, opt) {
    const o = opt || {};
    const l = LISTS.find((x) => x.id === id) || LISTS[0];
    cur = l; q = ''; eraPick = ''; tagPick = ''; sel = null;
    $('q').value = '';
    document.querySelectorAll('[data-list]').forEach((b) => b.classList.toggle('on', b.dataset.list === l.id));
    $('bar-title').textContent = l.name;
    document.title = l.name;
    document.querySelector('.bar-title .logo').textContent = l.emoji;
    $('list-lead').innerHTML = rich(l.lead);
    $('facts').innerHTML = rich(l.note);

    $('era-chips').innerHTML = `<button class="chip on" data-era="">すべて</button>`
      + l.eras.map((e) => `<button class="chip" data-era="${esc(e.id)}">${esc(e.name)}</button>`).join('');
    $('tag-chips').innerHTML = allTags(l)
      .map((t) => `<button class="chip" data-tag="${esc(t)}">${esc(t)}だけ</button>`).join('');
    $('q').placeholder = l.kind === 'house' ? '家名・よみ・ことがらで探す' : '名前・よみ・ことがらで探す';
    bindChips();

    $('cards').innerHTML = l.cards && l.cards.length
      ? '<h2>この一覧と関係する解説カード</h2>'
        + '<p class="lead">一般教養Note の読み物に移ります。読み終えたら「学ぶ」から戻れます。</p>'
        + `<div class="links">${l.cards.map(([id, nm]) => `<a href="../#t=${esc(id)}">${esc(nm)}</a>`).join('')}</div>`
      : '';

    // ハッシュで指定された開き方を当てる（カードから飛んできたとき）
    if (o.e && l.eras.some((x) => x.id === o.e)) {
      eraPick = o.e;
      document.querySelectorAll('[data-era]').forEach((x) => x.classList.toggle('on', x.dataset.era === o.e));
    }
    if (o.q) { q = o.q; $('q').value = o.q; }
    if (o.n) {
      const i = l.items.findIndex((x) => String(x.n) === String(o.n));
      if (i >= 0) sel = i;
    }
    draw(); drawSums();
    if (!keepHash) location.hash = '#' + l.id;
  }

  function bindChips() {
    document.querySelectorAll('[data-era]').forEach((b) => {
      b.onclick = () => {
        eraPick = b.dataset.era; sel = null;
        document.querySelectorAll('[data-era]').forEach((x) => x.classList.toggle('on', x === b));
        draw();
      };
    });
    document.querySelectorAll('[data-tag]').forEach((b) => {
      b.onclick = () => {
        const on = tagPick === b.dataset.tag;
        tagPick = on ? '' : b.dataset.tag; sel = null;
        document.querySelectorAll('[data-tag]').forEach((x) => x.classList.toggle('on', !on && x === b));
        draw();
      };
    });
  }

  // =========================================================
  // 起動
  // =========================================================
  $('list-switch').innerHTML = LISTS
    .map((l) => `<button class="sw" data-list="${esc(l.id)}">${l.emoji} ${esc(l.name)}</button>`).join('');
  document.querySelectorAll('[data-list]').forEach((b) => { b.onclick = () => setList(b.dataset.list); });

  $('q').oninput = () => { q = $('q').value; sel = null; draw(); };
  $('btn-reset').onclick = () => {
    q = ''; eraPick = ''; tagPick = ''; sel = null;
    $('q').value = '';
    document.querySelectorAll('[data-era]').forEach((x) => x.classList.toggle('on', x.dataset.era === ''));
    document.querySelectorAll('[data-tag]').forEach((x) => x.classList.remove('on'));
    draw(); toast('絞り込みを外しました');
  };
  $('btn-back').onclick = () => { location.href = '../#rekidai'; };

  function fromHash(keepHash) {
    const h = location.hash.replace('#', '');
    const [id, ...rest] = h.split('&');
    const get = (k) => {
      const v = rest.find((x) => x.startsWith(k + '='));
      try { return v ? decodeURIComponent(v.slice(k.length + 1)) : ''; } catch (e) { return ''; }
    };
    setList(id || LISTS[0].id, keepHash, { n: get('n'), e: get('e'), q: get('q') });
  }
  window.addEventListener('hashchange', () => fromHash(true));

  $('foot').textContent = '代の数え方は宮内庁の歴代表・各幕府の歴代一覧・内閣制度の歴代内閣にならった。'
    + '年と人数はこの一覧のデータから数えている。名家の一覧は主なものを選んだもので、全部ではない。';
  fromHash(true);

  if ('serviceWorker' in navigator && window.isSecureContext) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { /* 失敗しても動く */ }));
  }
})();
