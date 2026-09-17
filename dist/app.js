const rows=[
['4500012841','10','PT Nusantara Steel','MAT-STEEL-12','120 EA','18,450,000','IDR','+4.8%'],
['4500012841','20','PT Nusantara Steel','MAT-BOLT-M8','2,400 EA','3,720,000','IDR','−1.2%'],
['4500012917','10','CV Sinar Abadi','MAT-COPPER-4','350 M','9,625,000','IDR','+8.4%'],
['4500012933','10','PT Global Parts','MAT-BEARING-2','48 EA','12,960,000','IDR','0.0%'],
['4500012948','30','PT Prima Teknik','MAT-VALVE-8','24 EA','21,840,000','IDR','−3.6%'],
['4500012972','10','CV Karya Logam','MAT-PIPE-10','80 M','7,280,000','IDR','+2.1%']];
const body=document.querySelector('#gridBody');
body.innerHTML=rows.map(r=>`<tr>${r.map((v,i)=>`<td class="${i===7?(v.startsWith('+')?'variance up':v.startsWith('−')?'variance down':'variance'):''}">${v}</td>`).join('')}<td>⋮</td></tr>`).join('');
const toast=document.querySelector('#toast');let timer;
function notify(message){toast.textContent=message;toast.classList.add('show');clearTimeout(timer);timer=setTimeout(()=>toast.classList.remove('show'),2400)}
document.querySelector('#runQuery').onclick=e=>{e.currentTarget.innerHTML='<span>◌</span> Running…';setTimeout(()=>{e.currentTarget.innerHTML='<span>▶</span> Run query';document.querySelector('#rowCount').textContent='2,486 rows';notify('Query completed in 0.84 seconds')},900)};
document.querySelector('#validate').onclick=()=>notify('Join logic valid · No timeout risk detected');
document.querySelector('#saveVariant').onclick=()=>notify('Variant “Default Analysis” saved');
document.querySelector('#export').onclick=()=>notify('Export prepared · Sensitive values masked');
document.querySelector('#compare').onclick=()=>notify('Compare mode ready · Select target server');
document.querySelector('#addTable').onclick=()=>notify('SAP Data Dictionary opened');
const drawer=document.querySelector('#aiDrawer');
document.querySelector('#aiOpen').onclick=()=>{drawer.classList.add('open');drawer.setAttribute('aria-hidden','false');document.querySelector('#aiInput').focus()};
document.querySelector('#aiClose').onclick=()=>{drawer.classList.remove('open');drawer.setAttribute('aria-hidden','true')};
document.querySelector('#aiForm').onsubmit=e=>{e.preventDefault();const v=document.querySelector('#aiInput').value.trim();if(v){notify('AI is translating your request to a query');document.querySelector('#aiInput').value=''}};
document.querySelectorAll('.suggestions button').forEach(b=>b.onclick=()=>{document.querySelector('#aiInput').value=b.textContent;document.querySelector('#aiInput').focus()});
