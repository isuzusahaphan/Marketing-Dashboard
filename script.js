const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbyw4b4F0iGNWu2GPf5n3ZSNtovNsAgQb4zSJqLb_4D5KrFVgILe9OhYjXoDFuew-VXNZQ/exec';

Chart.register(ChartDataLabels);
let monthlyChartInstance = null;

const platformColors = { 'Facebook': '#1877F2', 'TikTok': '#000000', 'YouTube': '#FF0000', 'Line OA': '#00C300' };
const typeColors = {
    'ส่งมอบรถใหม่': '#10b981', 'คู่บื้อ': '#8b5cf6', 'ไปกับสหะภัณฑ์': '#06b6d4',
    'โหนกระบะ': '#f59e0b', 'บรรทุกมุก': '#ec4899', 'EVENT / เทศกาล': '#f43f5e',
    'วันหยุด': '#94a3b8', 'ตรีเพชร': '#1e40af', 'โปรศูนย์บริการ': '#0f766e',
    'โปรฝ่ายขาย': '#b45309', 'แต่ละวันสหะภัณฑ์': '#6b21a8'
};

let platformTargets = JSON.parse(localStorage.getItem('platformTargets')) || {
    'Facebook': { current: 0, target: 100 }, 'TikTok': { current: 0, target: 100 },
    'YouTube': { current: 0, target: 100 }, 'Line OA': { current: 0, target: 100 }
};

let marketingData = []; 
let currentPage = 1;
const itemsPerPage = 10;
let filteredAllData = [];

// ตัวแปรกันพลุยิงซ้ำซาก
let celebratedTargets = { 'Facebook': false, 'TikTok': false, 'YouTube': false, 'Line OA': false };
let celebratedMonthly = false;

const mascots = ['ISZ-Mascot-Master.png']; 
for (let i = 1; i <= 8; i++) {
    let num = i.toString().padStart(2, '0');
    mascots.push(`ISZ-Pose-${num}.png`);
}

function setRandomMascots() {
    const mascotImgElement = document.getElementById('monthlyMascot');
    if (mascotImgElement) {
        mascotImgElement.src = mascots[Math.floor(Math.random() * mascots.length)];
    }
}

// 🔥 ฟังก์ชันโชว์ Loading หรูๆ
function showLoading(text) {
    Swal.fire({
        title: text, allowOutsideClick: false, showConfirmButton: false,
        didOpen: () => { Swal.showLoading(); }
    });
}

// 🔥 แจ้งเตือน Toast มุมจอขวาบน
function showToast(icon, title) {
    Swal.fire({
        toast: true, position: 'top-end', icon: icon, title: title,
        showConfirmButton: false, timer: 3000, timerProgressBar: true
    });
}

function toggleDropdown(id) {
    const dropdown = document.getElementById(id);
    document.querySelectorAll('.custom-select-dropdown').forEach(el => {
        if(el.id !== id) el.classList.remove('show');
    });
    dropdown.classList.toggle('show');
}

document.addEventListener('click', function(event) {
    const isClickInside = event.target.closest('.custom-select-wrapper');
    if (!isClickInside) {
        document.querySelectorAll('.custom-select-dropdown').forEach(el => { el.classList.remove('show'); });
    }
});

let isExecutiveMode = true; 

function toggleMode() {
    isExecutiveMode = !isExecutiveMode;
    const grid = document.getElementById('mainContentGrid');
    const btn = document.getElementById('modeToggleBtn');
    const btnSetTarget = document.getElementById('btnSetTarget');

    if (isExecutiveMode) {
        grid.classList.add('executive-mode');
        btn.innerHTML = '👨‍💼 โหมดผู้บริหาร';
        btn.style.background = '#10b981'; 
        btnSetTarget.disabled = true;
    } else {
        grid.classList.remove('executive-mode');
        btn.innerHTML = '📝 โหมดบันทึกงาน';
        btn.style.background = '#f59e0b'; 
        btnSetTarget.disabled = false;
    }
    applyFilters();
    setTimeout(() => { if (monthlyChartInstance) monthlyChartInstance.resize(); }, 350);
}

function updateMonthlyStatus() {
    const filterVal = document.getElementById('monthFilter').value;
    let targetMonth = new Date().getMonth();
    let targetYear = new Date().getFullYear();

    if (filterVal !== 'all') targetMonth = parseInt(filterVal);
    
    let currentMonthCount = 0;
    marketingData.forEach(j => {
        const d = new Date(j.date);
        if (filterVal === 'all') {
            if (d.getMonth() === targetMonth && d.getFullYear() === targetYear) currentMonthCount++;
        } else {
            if (d.getMonth() === targetMonth) currentMonthCount++;
        }
    });

    let statusText = "";
    let barBgGradient = "";

    if (currentMonthCount < 25) {
        statusText = `วอร์มนิ้วอยู่ฮะ 🥶 (เป้าแรก 25)`;
        barBgGradient = "linear-gradient(90deg, #9ca3af, #d1d5db, #9ca3af)";
        celebratedMonthly = false;
    } else if (currentMonthCount < 50) {
        statusText = `ทรงอย่างแบด มาตรฐานเป๊ะ 🤙 (เป้าต่อไป 50)`;
        barBgGradient = "linear-gradient(90deg, #3b82f6, #93c5fd, #3b82f6)";
        celebratedMonthly = false;
    } else if (currentMonthCount < 80) {
        statusText = `ปั่นยับๆ เอาเรื่องจัด 🔥 (เป้าหมายสูงสุด 80)`;
        barBgGradient = "linear-gradient(90deg, #f59e0b, #fcd34d, #f59e0b)";
        celebratedMonthly = false;
    } else {
        statusText = `เดือดจัด ปลัดบอก! ทะลุหลอดไปเลย 🚀💯`;
        barBgGradient = "linear-gradient(90deg, #ef4444, #f43f5e, #ef4444)";
        // 🔥 ยิงพลุเมื่อยอดรายเดือนทะลุเป้า 🔥
        if (!celebratedMonthly) {
            confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, zIndex: 3000 });
            celebratedMonthly = true;
        }
    }

    let pct = (currentMonthCount / 80) * 100;
    if (pct > 100) pct = 100;

    let monthNameText = filterVal === 'all' ? "เดือนนี้" : document.getElementById('monthFilter').options[document.getElementById('monthFilter').selectedIndex].text.split(' ')[0];

    document.getElementById('monthlyStatusText').innerText = `สเตตัส ${monthNameText}: ${statusText}`;
    document.getElementById('monthlyCountText').innerText = `${currentMonthCount} งาน`;
    
    const bar = document.getElementById('monthlyProgressBar');
    bar.style.width = `${pct}%`;
    bar.style.background = barBgGradient;
}

function openTargetModal() {
    const area = document.getElementById('targetInputsArea');
    area.innerHTML = '';
    Object.keys(platformTargets).forEach(p => {
        const div = document.createElement('div');
        div.className = 'target-setup-grid';
        div.innerHTML = `<div><label style="color:${platformColors[p]}">${p} ปัจจุบัน</label><input type="number" id="cur-input-${p}" value="${platformTargets[p].current}" class="form-control"></div>
                         <div><label>เป้าหมาย</label><input type="number" id="tar-input-${p}" value="${platformTargets[p].target}" class="form-control"></div>`;
        area.appendChild(div);
    });
    document.getElementById('targetModal').style.display = 'flex';
}

function closeTargetModal() { document.getElementById('targetModal').style.display = 'none'; }

// 🔥 สี Gradient ประจำแต่ละแพลตฟอร์ม
function getPlatformGradient(platform) {
    switch(platform) {
        case 'Facebook': return 'linear-gradient(90deg, #60a5fa, #1d4ed8)';
        case 'TikTok': return 'linear-gradient(90deg, #9ca3af, #000000)';
        case 'YouTube': return 'linear-gradient(90deg, #fca5a5, #b91c1c)';
        case 'Line OA': return 'linear-gradient(90deg, #86efac, #047857)';
        default: return 'var(--primary)';
    }
}

async function saveTargets() {
    const btn = document.getElementById('btnSaveTargets');
    btn.disabled = true; 
    
    Object.keys(platformTargets).forEach(p => {
        platformTargets[p].current = parseInt(document.getElementById(`cur-input-${p}`).value) || 0;
        platformTargets[p].target = parseInt(document.getElementById(`tar-input-${p}`).value) || 1;
    });
    
    const nowStr = new Date().toLocaleDateString('en-GB'); 
    
    showLoading('กำลังบันทึกเป้าหมาย...');

    try {
        if (GOOGLE_SHEET_URL && GOOGLE_SHEET_URL.startsWith('http')) {
            await fetch(GOOGLE_SHEET_URL, { 
                method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
                body: JSON.stringify({ action: 'saveTargets', targets: platformTargets, lastUpdate: nowStr }) 
            });
        }
        
        localStorage.setItem('platformTargets', JSON.stringify(platformTargets));
        localStorage.setItem('targetLastUpdated', nowStr);
        document.getElementById('lastUpdateText').innerText = `อัปเดตผู้ติดตามล่าสุด: ${nowStr}`;

        renderTargets(); 
        closeTargetModal();
        Swal.fire({ icon: 'success', title: 'อัปเดตเป้าหมายแล้ว!', showConfirmButton: false, timer: 1500 });
    } catch (error) {
        console.error('Error saving targets:', error);
        Swal.fire({ icon: 'warning', title: 'บันทึกแค่ในเครื่อง', text: 'ไม่สามารถส่งข้อมูลไปที่ Sheet ได้ครับ' });
    } finally {
        btn.disabled = false;
    }
}

function renderTargets() {
    Object.keys(platformTargets).forEach(p => {
        const pct = Math.round((platformTargets[p].current / platformTargets[p].target) * 100);
        
        document.getElementById(`pct-${p}`).innerText = `${pct}%`;
        
        // 🔥 ใส่สี Gradient ให้หลอด Progress
        const bar = document.getElementById(`bar-${p}`);
        bar.style.width = `${pct > 100 ? 100 : pct}%`;
        bar.style.background = getPlatformGradient(p);

        document.getElementById(`cur-${p}`).innerText = `ปัจจุบัน: ${platformTargets[p].current.toLocaleString()}`;
        document.getElementById(`tar-${p}`).innerText = `เป้าหมาย: ${platformTargets[p].target.toLocaleString()}`;

        // 🔥 ยิงพลุเมื่อเป้าหมายแพลตฟอร์มถึง 100% 🔥
        if (pct >= 100 && !celebratedTargets[p]) {
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.5 }, zIndex: 3000 });
            celebratedTargets[p] = true;
        } else if (pct < 100) {
            celebratedTargets[p] = false;
        }
    });
}

function toggleEditLinkInputs() {
    const cont = document.getElementById('editLinksArea');
    const currentLinks = {};
    ['edit-link-fb','edit-link-tk','edit-link-yt','edit-link-line'].forEach(id => {
        const el = document.getElementById(id);
        if (el) currentLinks[id] = el.value;
    });
    cont.innerHTML = '';
    const platforms = [
        { id: 'edit-chk-fb', name: 'Facebook', color: '#1877F2', inputId: 'edit-link-fb' },
        { id: 'edit-chk-tk', name: 'TikTok', color: '#000000', inputId: 'edit-link-tk' },
        { id: 'edit-chk-yt', name: 'YouTube', color: '#FF0000', inputId: 'edit-link-yt' },
        { id: 'edit-chk-line', name: 'Line OA', color: '#00C300', inputId: 'edit-link-line' }
    ];
    platforms.forEach(p => {
        if (document.getElementById(p.id).checked) {
            const div = document.createElement('div');
            div.innerHTML = `<label style="font-size:0.85em; color:${p.color}">${p.name}</label>
                             <input type="text" id="${p.inputId}" class="form-control" placeholder="วางลิงก์ (เช่น https://...)" value="${currentLinks[p.inputId] || ''}">`;
            cont.appendChild(div);
        }
    });
}

function toggleLinkInputs() {
    const cont = document.getElementById('linkInputsContainer');
    cont.innerHTML = '';
    const platforms = [
        { id: 'chk-fb', name: 'Facebook', color: '#1877F2', inputId: 'link-fb' },
        { id: 'chk-tk', name: 'TikTok', color: '#000000', inputId: 'link-tk' },
        { id: 'chk-yt', name: 'YouTube', color: '#FF0000', inputId: 'link-yt' },
        { id: 'chk-line', name: 'Line OA', color: '#00C300', inputId: 'link-line' }
    ];
    platforms.forEach(p => {
        if (document.getElementById(p.id).checked) {
            const div = document.createElement('div');
            div.innerHTML = `<label style="font-size:0.85em; color:${p.color}">${p.name}</label>
                             <input type="text" id="${p.inputId}" class="form-control" placeholder="วางลิงก์ (เช่น https://...)">`;
            cont.appendChild(div);
        }
    });
}

function openViewsModal(jobId) {
    const job = marketingData.find(j => j.id === jobId);
    if (!job) return;
    document.getElementById('viewsTitle').innerText = job.title;
    document.getElementById('viewsJobId').value = job.id;
    const cont = document.getElementById('viewsContentContainer');
    cont.innerHTML = '';
    job.platforms.forEach((p, idx) => {
        const div = document.createElement('div');
        div.className = 'form-group';
        div.innerHTML = `<label style="color:${platformColors[p.name]}">${p.name} (ยอดวิว)</label>
                         <input type="number" id="view-input-${idx}" class="form-control" placeholder="ระบุตัวเลขยอดวิว" value="${p.views || 0}">`;
        cont.appendChild(div);
    });
    document.getElementById('viewsModal').style.display = 'flex';
}
function closeViewsModal() { document.getElementById('viewsModal').style.display = 'none'; }

async function saveViews() {
    const id = parseInt(document.getElementById('viewsJobId').value);
    const jobIndex = marketingData.findIndex(j => j.id === id);
    if (jobIndex === -1) return;

    let job = marketingData[jobIndex];
    let total = 0;
    job.platforms.forEach((p, idx) => {
        let v = parseInt(document.getElementById(`view-input-${idx}`).value) || 0;
        p.views = v; total += v;
    });
    job.totalViews = total; 

    const btnSubmit = document.getElementById('btnSaveViews');
    btnSubmit.disabled = true; 

    marketingData[jobIndex] = job;
    applyFilters(); closeViewsModal();

    showLoading('กำลังบันทึกยอดวิว...');

    try {
        const updatedJob = { ...job, action: 'edit' }; 
        if (GOOGLE_SHEET_URL && GOOGLE_SHEET_URL.startsWith('http')) {
            await fetch(GOOGLE_SHEET_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(updatedJob) });
        }
        Swal.fire({ icon: 'success', title: 'อัปเดตยอดวิวเรียบร้อย', showConfirmButton: false, timer: 1500 });
    } catch (error) {
        console.error(error); Swal.fire({ icon: 'error', title: 'ขัดข้อง', text: 'บันทึกลง Sheet ไม่สำเร็จ' });
    } finally {
        btnSubmit.disabled = false;
    }
}

function openEditModal(jobId) {
    const job = marketingData.find(j => j.id === jobId);
    if (!job) return;
    document.getElementById('editJobId').value = job.id;
    document.getElementById('editJobDate').value = job.date;
    document.getElementById('editJobTitle').value = job.title;
    document.getElementById('editJobType').value = job.type;
    document.getElementById('editJobFormat').value = job.format;
    ['edit-chk-fb', 'edit-chk-tk', 'edit-chk-yt', 'edit-chk-line'].forEach(id => { document.getElementById(id).checked = false; });
    job.platforms.forEach(p => {
        if (p.name === 'Facebook') document.getElementById('edit-chk-fb').checked = true;
        if (p.name === 'TikTok') document.getElementById('edit-chk-tk').checked = true;
        if (p.name === 'YouTube') document.getElementById('edit-chk-yt').checked = true;
        if (p.name === 'Line OA') document.getElementById('edit-chk-line').checked = true;
    });
    toggleEditLinkInputs();
    job.platforms.forEach(p => {
        if (p.name === 'Facebook' && document.getElementById('edit-link-fb')) document.getElementById('edit-link-fb').value = p.link;
        if (p.name === 'TikTok' && document.getElementById('edit-link-tk')) document.getElementById('edit-link-tk').value = p.link;
        if (p.name === 'YouTube' && document.getElementById('edit-link-yt')) document.getElementById('edit-link-yt').value = p.link;
        if (p.name === 'Line OA' && document.getElementById('edit-link-line')) document.getElementById('edit-link-line').value = p.link;
    });
    document.getElementById('editJobModal').style.display = 'flex';
}
function closeEditModal() { document.getElementById('editJobModal').style.display = 'none'; }

async function saveEditJob() {
    const id = parseInt(document.getElementById('editJobId').value);
    const jobIndex = marketingData.findIndex(j => j.id === id);
    if (jobIndex === -1) return;

    let selected = [];
    const platforms = [
        { id: 'edit-chk-fb', name: 'Facebook', inputId: 'edit-link-fb' },
        { id: 'edit-chk-tk', name: 'TikTok', inputId: 'edit-link-tk' },
        { id: 'edit-chk-yt', name: 'YouTube', inputId: 'edit-link-yt' },
        { id: 'edit-chk-line', name: 'Line OA', inputId: 'edit-link-line' }
    ];
    platforms.forEach(p => {
        if (document.getElementById(p.id).checked) {
            const existingPlatform = marketingData[jobIndex].platforms.find(ep => ep.name === p.name);
            const oldViews = existingPlatform ? (existingPlatform.views || 0) : 0;
            const linkInput = document.getElementById(p.inputId);
            selected.push({ name: p.name, link: linkInput ? linkInput.value.trim() : '', views: oldViews });
        }
    });
    
    if (selected.length === 0) return Swal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบ', text: 'กรุณาเลือกช่องทางอย่างน้อย 1 ช่องทางครับ' });
    
    const newTotalViews = selected.reduce((sum, p) => sum + p.views, 0);

    const updatedJob = { action: 'edit', id: id, date: document.getElementById('editJobDate').value, title: document.getElementById('editJobTitle').value, type: document.getElementById('editJobType').value, format: document.getElementById('editJobFormat').value, platforms: selected, totalViews: newTotalViews };

    const btnSubmit = document.getElementById('btnSaveEdit');
    btnSubmit.disabled = true;

    marketingData[jobIndex] = updatedJob;
    applyFilters(); updateChart(); closeEditModal();
    showLoading('กำลังอัปเดตข้อมูล...');

    try {
        if (GOOGLE_SHEET_URL && GOOGLE_SHEET_URL.startsWith('http')) {
            await fetch(GOOGLE_SHEET_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(updatedJob) });
        }
        Swal.fire({ icon: 'success', title: 'แก้ไขสำเร็จ!', showConfirmButton: false, timer: 1500 });
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'ข้อผิดพลาด', text: 'สำเร็จฝั่งเว็บ แต่บันทึกลง Sheet ไม่เข้า' });
    } finally {
        btnSubmit.disabled = false;
    }
}

async function saveJob() {
    const title = document.getElementById('jobTitle').value.trim();
    const dateInput = document.getElementById('jobDate').value;
    const type = document.getElementById('jobType').value;
    const format = document.getElementById('jobFormat').value;
    const btnSubmit = document.getElementById('btnSaveMain');

    if (!dateInput || !title) return Swal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบ', text: 'กรุณากรอกวันที่และชื่อชิ้นงานให้ครบครับ' });

    let selectedPlatforms = [];
    const platformCheckboxes = [
        { chkId: 'chk-fb', name: 'Facebook', inputId: 'link-fb' },
        { chkId: 'chk-tk', name: 'TikTok', inputId: 'link-tk' },
        { chkId: 'chk-yt', name: 'YouTube', inputId: 'link-yt' },
        { chkId: 'chk-line', name: 'Line OA', inputId: 'link-line' }
    ];

    platformCheckboxes.forEach(p => {
        if (document.getElementById(p.chkId)?.checked) {
            const linkInput = document.getElementById(p.inputId);
            selectedPlatforms.push({ name: p.name, link: linkInput ? linkInput.value.trim() : '', views: 0 });
        }
    });

    if (selectedPlatforms.length === 0) return Swal.fire({ icon: 'warning', title: 'เลือกช่องทาง', text: 'กรุณาเลือกช่องทางอย่างน้อย 1 ช่องทางครับ' });

    const newJob = { action: 'add', id: Date.now(), date: dateInput, title: title, type: type, format: format, platforms: selectedPlatforms, totalViews: 0 };
    btnSubmit.disabled = true; 

    marketingData.push(newJob);
    document.getElementById('jobTitle').value = '';
    toggleLinkInputs(); setRandomMascots(); applyFilters(); updateChart();

    showLoading('กำลังบันทึกข้อมูล...');

    try {
        if (GOOGLE_SHEET_URL && GOOGLE_SHEET_URL.startsWith('http')) {
            await fetch(GOOGLE_SHEET_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(newJob) });
        }
        Swal.fire({ icon: 'success', title: 'บันทึกชิ้นงานสำเร็จ!', showConfirmButton: false, timer: 1500 });
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'ข้อผิดพลาด', text: 'บันทึกหน้าเว็บสำเร็จ แต่เข้า Sheet ไม่ได้' });
    } finally {
        btnSubmit.disabled = false;
    }
}

function deleteJob(id) {
    Swal.fire({
        title: 'ยืนยันการลบ?',
        text: "หากลบแล้วจะไม่สามารถกู้คืนได้!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'ลบเลย!',
        cancelButtonText: 'ยกเลิก'
    }).then(async (result) => {
        if (result.isConfirmed) {
            marketingData = marketingData.filter(j => j.id !== id); 
            setRandomMascots(); applyFilters(); updateChart(); 
            
            showToast('success', 'ลบข้อมูลเรียบร้อยแล้ว');
            
            try {
                if (GOOGLE_SHEET_URL && GOOGLE_SHEET_URL.startsWith('http')) {
                    await fetch(GOOGLE_SHEET_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'delete', id: id }) });
                }
            } catch (error) {
                console.error('Error:', error);
            }
        }
    });
}

function getBarGradient(context) {
    const chart = context.chart;
    const {ctx, chartArea} = chart;
    if (!chartArea) return '#4f46e5'; 
    const value = context.raw;
    const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
    if (value < 25) { gradient.addColorStop(0, '#9ca3af'); gradient.addColorStop(1, '#cbd5e1'); } 
    else if (value < 50) { gradient.addColorStop(0, '#3b82f6'); gradient.addColorStop(1, '#93c5fd'); } 
    else if (value < 80) { gradient.addColorStop(0, '#f59e0b'); gradient.addColorStop(1, '#fcd34d'); } 
    else { gradient.addColorStop(0, '#ef4444'); gradient.addColorStop(1, '#fda4af'); }
    return gradient;
}

function updateChart() {
    const ctx = document.getElementById('monthlyChart').getContext('2d');
    let counts = new Array(12).fill(0);
    marketingData.forEach(j => { const m = new Date(j.date).getMonth(); if (!isNaN(m)) counts[m]++; });
    if (monthlyChartInstance) monthlyChartInstance.destroy();
    
    monthlyChartInstance = new Chart(ctx, {
        type: 'bar',
        data: { labels: ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'], datasets: [{ label: 'จำนวนงาน', data: counts, backgroundColor: function(context) { return getBarGradient(context); }, borderRadius: 4 }] },
        options: { 
            responsive: true, maintainAspectRatio: false, 
            onClick: (e, elements) => {
                if (elements.length > 0) {
                    document.getElementById('monthFilter').value = elements[0].index;
                    applyFilters(); updateMonthlyStatus(); setRandomMascots();
                }
            },
            onHover: (event, chartElement) => { event.native.target.style.cursor = chartElement[0] ? 'pointer' : 'default'; },
            plugins: { legend: { display: false }, datalabels: { anchor: 'end', align: 'top', color: '#4f46e5', font: { weight: 'bold' }, formatter: function(value) { return value > 0 ? value : ''; } } },
            layout: { padding: { top: 25 } } 
        }
    });
    updateMonthlyStatus();
}

function getGDriveEmbedHtml(url) {
    const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return m ? `<iframe src="https://drive.google.com/file/d/${m[1]}/preview" style="width:100%; height:300px; border:none; border-radius:8px; margin-top:10px; background:#f0f0f0;"></iframe>` : null;
}

function openPreviewModal(jobId) {
    const job = marketingData.find(j => j.id === jobId);
    if (!job) return;
    document.getElementById('previewTitle').innerText = job.title;
    const cont = document.getElementById('previewContentContainer');
    cont.innerHTML = '<div style="text-align:center;"><span class="spinner" style="border-top-color:var(--primary)"></span> กำลังดึงภาพตัวอย่าง...</div>';
    document.getElementById('previewModal').style.display = 'flex';
    
    Promise.all(job.platforms.filter(p => p.link).map(p => {
        if (p.link.includes('drive.google.com')) return Promise.resolve({ name: p.name, link: p.link, iframeHtml: getGDriveEmbedHtml(p.link) });
        if (GOOGLE_SHEET_URL && GOOGLE_SHEET_URL.startsWith('http')) {
            return fetch(GOOGLE_SHEET_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'fetchImage', url: p.link }) })
            .then(r => r.json()).then(d => { return { name: p.name, link: p.link, img: d.imageUrl || '' }; })
            .catch(() => { return fetch(`https://api.microlink.io/?url=${encodeURIComponent(p.link)}`).then(r => r.json()).then(d => ({ name: p.name, link: p.link, img: d.data?.image?.url || d.data?.logo?.url })).catch(() => ({ name: p.name, link: p.link, img: '' })); });
        } else {
            return fetch(`https://api.microlink.io/?url=${encodeURIComponent(p.link)}`).then(r => r.json()).then(d => ({ name: p.name, link: p.link, img: d.data?.image?.url || d.data?.logo?.url })).catch(() => ({ name: p.name, link: p.link, img: '' }));
        }
    })).then(results => {
        cont.innerHTML = results.map(r => {
            let contentHtml = '';
            if (r.iframeHtml) contentHtml = r.iframeHtml; 
            else if (r.img) contentHtml = `<img src="${r.img}" class="preview-img">`; 
            else contentHtml = '<div style="background:#eee; padding:15px; text-align:center; color:#999; border-radius:6px; margin-top:10px;">ระบบแพลตฟอร์มป้องกันไม่ให้ดึงภาพ 🚫</div>'; 
            return `<div class="preview-box"><b>${r.name}</b><br><small><a href="${r.link}" target="_blank" style="color:var(--primary);">${r.link}</a></small>${contentHtml}</div>`;
        }).join('');
    });
}

function closePreviewModal() { document.getElementById('previewModal').style.display = 'none'; }

function generateTableRows(data) {
    if (data.length === 0) return '<tr><td colspan="7" style="text-align:center; padding:30px;">ไม่มีข้อมูล</td></tr>';
    
    const disabledState = isExecutiveMode ? 'disabled' : '';

    return data.map(j => {
        let actualTotalViews = j.platforms.reduce((sum, p) => sum + (p.views || 0), 0);
        if (actualTotalViews === 0 && j.totalViews > 0) actualTotalViews = j.totalViews; 
        const dateStr = new Date(j.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        const formatColor = j.format === 'Videos' ? '#10b981' : '#f59e0b';
        const formatEmoji = j.format === 'Videos' ? '🎬 Videos' : '🖼️ Pictures';
        const tColor = typeColors[j.type] || '#6b7280'; 
        let platformBadges = j.platforms.map(p => `<span class="badge" style="background:${platformColors[p.name]}">${p.name}</span>`).join(' ');
        let previewActionHtml = j.platforms.some(p => p.link && p.link !== "") ? `<button class="btn-action btn-primary" style="margin-bottom:6px;" onclick="openPreviewModal(${j.id})">👁️ พรีวิว</button><br>` : '<span style="color:#aaa; font-size:0.85em;">(ไม่มีลิงก์)</span>';
        let linkButtonsHtml = j.platforms.filter(p => p.link && p.link !== "").map(p => `<a href="${p.link}" target="_blank" class="btn-action" style="margin-bottom:4px; display:inline-block; text-decoration:none;">🔗 ${p.name}</a>`).join(' ');
        
        return `<tr>
                    <td style="white-space: nowrap;">${dateStr}</td>
                    <td style="min-width: 150px;"><b>${j.title}</b><br><span class="badge" style="background: ${tColor}; opacity: 0.9; margin-top: 4px;">${j.type}</span></td>
                    <td><span class="badge" style="background:${formatColor}">${formatEmoji}</span></td>
                    <td>${platformBadges}</td>
                    <td>${previewActionHtml}${linkButtonsHtml}</td>
                    <td><b style="color:var(--primary); font-size:1.2em;">${actualTotalViews.toLocaleString()}</b><br><button class="btn-action" style="margin-top: 5px;" onclick="openViewsModal(${j.id})">📊 แยกช่องทาง</button></td>
                    <td class="action-group">
                        <button class="btn-action" onclick="openEditModal(${j.id})" style="margin-bottom:6px;" ${disabledState}>✏️ แก้ไข</button><br>
                        <button class="btn-action btn-danger" onclick="deleteJob(${j.id})" ${disabledState}>🗑️ ลบ</button>
                    </td>
                </tr>`;
    }).join('');
}

function applyFilters() {
    const monthFilter = document.getElementById('monthFilter').value;
    const formatChecked = Array.from(document.querySelectorAll('.filter-format:checked')).map(el => el.value);
    const platformChecked = Array.from(document.querySelectorAll('.filter-platform:checked')).map(el => el.value);
    const typeChecked = Array.from(document.querySelectorAll('.filter-type:checked')).map(el => el.value);
    const tagArea = document.getElementById('activeFiltersArea');
    let tagsHtml = '';
    if (formatChecked.length > 0) tagsHtml += formatChecked.map(f => `<span class="filter-tag">📐 ${f}</span>`).join('');
    if (platformChecked.length > 0) tagsHtml += platformChecked.map(p => `<span class="filter-tag">🌐 ${p}</span>`).join('');
    if (typeChecked.length > 0) tagsHtml += typeChecked.map(t => `<span class="filter-tag">🏷️ ${t}</span>`).join('');
    tagArea.innerHTML = tagsHtml;

    filteredAllData = marketingData.filter(j => {
        if (monthFilter !== 'all') { if (new Date(j.date).getMonth() !== parseInt(monthFilter)) return false; }
        if (formatChecked.length > 0) { if (!formatChecked.includes(j.format)) return false; }
        if (typeChecked.length > 0) { if (!typeChecked.includes(j.type)) return false; }
        if (platformChecked.length > 0) {
            const jobPlatforms = j.platforms.map(p => p.name);
            if (!platformChecked.some(p => jobPlatforms.includes(p))) return false;
        }
        return true;
    });
    filteredAllData.sort((a,b) => new Date(b.date) - new Date(a.date));
    document.getElementById('mainTableBody').innerHTML = generateTableRows(filteredAllData.slice(0, 10));
    if (document.getElementById('allContentModal').style.display === 'flex') { currentPage = 1; updateAllContentTable(true); }
}

function resetFilters() {
    document.getElementById('monthFilter').value = 'all';
    document.querySelectorAll('.filter-chk-label input').forEach(el => { el.checked = false; });
    applyFilters(); updateMonthlyStatus(); setRandomMascots();
}

function updateAllContentTable(isPreFiltered = false) {
    if (!isPreFiltered) {
        filteredAllData = [...marketingData].sort((a,b) => new Date(b.date) - new Date(a.date));
        document.getElementById('monthFilter').value = 'all';
        document.querySelectorAll('.filter-chk-label input').forEach(el => { el.checked = false; });
        document.getElementById('activeFiltersArea').innerHTML = '';
    }
    const totalItems = filteredAllData.length;
    document.getElementById('allContentCount').innerText = `พบ ${totalItems} รายการ`;
    const startIndex = (currentPage - 1) * itemsPerPage;
    document.getElementById('allTableBody').innerHTML = generateTableRows(filteredAllData.slice(startIndex, startIndex + itemsPerPage));
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    document.getElementById('pageIndicator').innerText = `หน้า ${currentPage} จาก ${totalPages}`;
    document.getElementById('btnPrevPage').disabled = currentPage === 1;
    document.getElementById('btnNextPage').disabled = currentPage === totalPages || totalPages === 0;
}

function changePage(direction) { currentPage += direction; updateAllContentTable(true); document.querySelector('#allContentModal .modal-content').scrollTop = 0; }
function openAllContentModal() { currentPage = 1; applyFilters(); document.getElementById('allContentModal').style.display = 'flex'; }
function closeAllContentModal() { document.getElementById('allContentModal').style.display = 'none'; }

function loadDataFromGoogleSheet() {
    showLoading('กำลังดึงข้อมูลล่าสุด...');

    fetch(GOOGLE_SHEET_URL)
        .then(response => response.json())
        .then(data => {
            if (data && data.result === "success") {
                if (data.marketingData || data.data) {
                    marketingData = data.marketingData || data.data; 
                    localStorage.setItem('marketingData', JSON.stringify(marketingData)); 
                }
                
                if (data.targets && Object.keys(data.targets).length > 0) {
                    platformTargets = data.targets;
                    localStorage.setItem('platformTargets', JSON.stringify(platformTargets));
                }

                if (data.lastUpdate && data.lastUpdate !== "ยังไม่มีข้อมูล") {
                    let formattedDate = data.lastUpdate;
                    if (formattedDate.includes('T')) {
                        let d = new Date(formattedDate);
                        if (!isNaN(d.getTime())) formattedDate = d.toLocaleDateString('en-GB'); 
                    }
                    document.getElementById('lastUpdateText').innerText = `อัปเดตผู้ติดตามล่าสุด: ${formattedDate}`;
                    localStorage.setItem('targetLastUpdated', formattedDate);
                }
                
                renderTargets();
                applyFilters(); 
                updateChart();
                setRandomMascots();
            }
            Swal.close();
            showToast('success', 'ซิงค์ข้อมูลเรียบร้อย');
        })
        .catch(error => {
            console.error("Fetch Error:", error);
            marketingData = JSON.parse(localStorage.getItem('marketingData')) || [];
            renderTargets();
            applyFilters(); 
            updateChart(); 
            setRandomMascots();
            Swal.fire({ icon: 'info', title: 'ออฟไลน์โหมด', text: 'ไม่สามารถเชื่อมต่อ Server ได้ จึงแสดงข้อมูลล่าสุดในเครื่องแทน', confirmButtonColor: '#4f46e5' });
        });
}

window.onload = () => {
    document.getElementById('jobDate').value = new Date().toISOString().split('T')[0];
    
    const lastUpdated = localStorage.getItem('targetLastUpdated');
    if (lastUpdated) {
        document.getElementById('lastUpdateText').innerText = `อัปเดตผู้ติดตามล่าสุด: ${lastUpdated}`;
    }
    
    document.getElementById('btnSetTarget').disabled = isExecutiveMode;

    renderTargets(); 
    toggleLinkInputs(); 
    
    loadDataFromGoogleSheet();
};

window.onclick = (e) => { if (e.target.className === 'modal') document.querySelectorAll('.modal').forEach(m => { m.style.display = 'none'; }); };
