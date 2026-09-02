// app.js — simple CSV parser and dashboard

const csvInput = document.getElementById('csvInput');
const loadSample = document.getElementById('loadSample');
const exportBtn = document.getElementById('exportBtn');
const bigTotalEl = document.getElementById('bigTotal');
const smallTotalEl = document.getElementById('smallTotal');
const numTableBody = document.querySelector('#numTable tbody');
const recentBody = document.getElementById('recentBody');

let bets = [];

csvInput.addEventListener('change', (e) => {
  const f = e.target.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => parseCSV(reader.result);
  reader.readAsText(f);
});

loadSample.addEventListener('click', () => {
  fetch('sample.csv').then(r=>r.text()).then(parseCSV);
});

exportBtn.addEventListener('click', () => {
  const summary = summarize(bets);
  const rows = [ ['side','total'] ];
  rows.push(['Big', summary.big]);
  rows.push(['Small', summary.small]);
  for (let i=0;i<10;i++) rows.push([i, summary.perNumber[i]||0]);
  const csv = rows.map(r=>r.join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download='summary.csv'; a.click();
});

function parseCSV(text){
  // expect header or no header
  const lines = text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  const rows = [];
  for (let i=0;i<lines.length;i++){
    const cols = lines[i].split(',').map(c=>c.trim());
    // handle header detection
    if (i===0 && /period|timestamp|side|amount/i.test(lines[0])){
      continue;
    }
    // expected: period,timestamp,side,number,amount
    if (cols.length<5) continue;
    const row={ period:cols[0], timestamp:cols[1], side:cols[2], number:cols[3]===''?null:parseInt(cols[3],10), amount:parseFloat(cols[4]||0) };
    rows.push(row);
  }
  bets = rows;
  updateUI();
}

function summarize(bets){
  let big=0, small=0;
  const perNumber = {};
  for (const b of bets){
    if (!b || !('amount' in b)) continue;
    const amt = Number(b.amount)||0;
    if (/big/i.test(b.side)) big+=amt;
    else if (/small/i.test(b.side)) small+=amt;
    if (b.number!=null && !Number.isNaN(b.number)){
      perNumber[b.number] = (perNumber[b.number]||0)+amt;
    }
  }
  return {big, small, perNumber};
}

let chart;
function updateUI(){
  const summary = summarize(bets);
  bigTotalEl.textContent = summary.big.toFixed(2);
  smallTotalEl.textContent = summary.small.toFixed(2);

  numTableBody.innerHTML='';
  for (let i=0;i<10;i++){
    const tr = document.createElement('tr');
    const tdn = document.createElement('td'); tdn.textContent = i;
    const tda = document.createElement('td'); tda.textContent = (summary.perNumber[i]||0).toFixed(2);
    tr.appendChild(tdn); tr.appendChild(tda);
    numTableBody.appendChild(tr);
  }

  recentBody.innerHTML='';
  const last = bets.slice(-50).reverse();
  for (const b of last){
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${escapeHtml(b.period)}</td><td>${escapeHtml(b.side)}</td><td>${b.number==null?'-':b.number}</td><td>${(b.amount||0).toFixed(2)}</td>`;
    recentBody.appendChild(tr);
  }

  // Chart: Big vs Small + per-number as secondary bars
  const labels = ['Big','Small','0','1','2','3','4','5','6','7','8','9'];
  const data = [summary.big, summary.small];
  for (let i=0;i<10;i++) data.push(summary.perNumber[i]||0);

  if (chart) chart.destroy();
  const ctx = document.getElementById('mainChart');
  chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets:[{label:'Amount', data, backgroundColor: labels.map(l=> (/Big/i.test(l)?'#f59e0b': /Small/i.test(l)?'#3b82f6':'#10b981'))}]
    },
    options: { responsive:true, plugins:{legend:{display:false}} }
  });
}

function escapeHtml(s){ if (!s) return ''; return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// auto-load sample on first open for quick demo
fetch('sample.csv').then(r=>r.text()).then(t=>{ if (t.trim()) parseCSV(t); }).catch(()=>{});
