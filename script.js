/* ============================================
   IRMAS ABSENSI PRO - SISTEM LENGKAP
   Fitur: Absensi Individual, Kepanitiaan, Notes, Statistik, Excel Export
   ============================================ */

// ===== KONFIGURASI =====
const CONFIG = {
  WHATSAPP_NUMBER: "+6289657751448",
  DIVISI_LIST: [
    "Keagamaan",
    "Humas",
    "Sekretariat",
    "Pubdekdok",
    "PHBI",
    "PSDM",
    "BPH",
  ],
  ORGANIZATION: {
    KETUA_UMUM: "Agung Ubaidillah",
    SEKRETARIS_1: "Tasya Amelia Putri",
    SEKRETARIS_2: "Lidya Febrianti",
    WAKIL_KETUA: "Muhammad Arif",
    BENDAHARA: "Siti Fatimah",
  },
  STORAGE_KEYS: {
    AUTH: "irmas_auth",
    ABSENSI: "irmas_absensi_data",
    PESERTA: "irmas_peserta_list",
    ANNOUNCEMENT: "irmas_announcement",
    NOTES: "irmas_notes_data",
  },
};

// ===== GLOBAL STATE =====
let AppState = {
  currentMode: "individual",
  currentDivisi: CONFIG.DIVISI_LIST[0],
  pesertaAbsen: [],
  activeSection: "dashboard",
  divisiChart: null,
  absensiData: [],
  pesertaList: [],
  announcement: null,
};

let NotesState = {
  notes: [],
};

// ===== NOTIFICATION SYSTEM =====
const Toast = {
  container: null,

  init() {
    this.container = document.createElement("div");
    this.container.className = "toast-container";
    document.body.appendChild(this.container);
  },

  show(message, type = "info", title = "") {
    if (!this.container) this.init();

    const titles = {
      success: "Berhasil!",
      error: "Gagal!",
      warning: "Peringatan!",
      info: "Informasi",
    };

    const icons = {
      success: "fa-check-circle",
      error: "fa-exclamation-circle",
      warning: "fa-exclamation-triangle",
      info: "fa-info-circle",
    };

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <i class="fas ${icons[type]}"></i>
      <div class="toast-content">
        <div class="toast-title">${title || titles[type]}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close">&times;</button>
    `;

    toast.querySelector(".toast-close").onclick = () => toast.remove();
    this.container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) toast.remove();
    }, 4000);
  },

  success(message, title = "") {
    this.show(message, "success", title);
  },
  error(message, title = "") {
    this.show(message, "error", title);
  },
  warning(message, title = "") {
    this.show(message, "warning", title);
  },
  info(message, title = "") {
    this.show(message, "info", title);
  },
};

// ===== CONFIRMATION MODAL =====
function confirmDialog(message, title = "Konfirmasi", type = "warning") {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-icon ${type}">
          <i class="fas ${type === "warning" ? "fa-exclamation-triangle" : type === "danger" ? "fa-trash-alt" : "fa-question-circle"}"></i>
        </div>
        <h3>${title}</h3>
        <p>${message}</p>
        <div class="modal-buttons">
          <button class="modal-btn-cancel">Batal</button>
          <button class="modal-btn-confirm">Ya, Lanjutkan</button>
        </div>
      </div>
    `;

    overlay.querySelector(".modal-btn-cancel").onclick = () => {
      overlay.remove();
      resolve(false);
    };

    overlay.querySelector(".modal-btn-confirm").onclick = () => {
      overlay.remove();
      resolve(true);
    };

    document.body.appendChild(overlay);
  });
}

// ===== HELPER FUNCTIONS =====
function loadStorage() {
  try {
    AppState.absensiData = JSON.parse(
      localStorage.getItem(CONFIG.STORAGE_KEYS.ABSENSI) || "[]",
    );
    AppState.pesertaList = JSON.parse(
      localStorage.getItem(CONFIG.STORAGE_KEYS.PESERTA) || "[]",
    );
    AppState.announcement = JSON.parse(
      localStorage.getItem(CONFIG.STORAGE_KEYS.ANNOUNCEMENT) || "null",
    );
    NotesState.notes = JSON.parse(
      localStorage.getItem(CONFIG.STORAGE_KEYS.NOTES) || "[]",
    );
  } catch (e) {
    AppState.absensiData = [];
    AppState.pesertaList = [];
    AppState.announcement = null;
    NotesState.notes = [];
  }
}

function saveAbsensiData(data) {
  AppState.absensiData.push(data);
  localStorage.setItem(
    CONFIG.STORAGE_KEYS.ABSENSI,
    JSON.stringify(AppState.absensiData),
  );
  updateAllDisplays();
  Toast.success(`Data absensi ${data.nama} berhasil disimpan!`);
}

function savePesertaList() {
  localStorage.setItem(
    CONFIG.STORAGE_KEYS.PESERTA,
    JSON.stringify(AppState.pesertaList),
  );
}

function saveAnnouncement() {
  localStorage.setItem(
    CONFIG.STORAGE_KEYS.ANNOUNCEMENT,
    JSON.stringify(AppState.announcement),
  );
}

function saveNotes() {
  localStorage.setItem(
    CONFIG.STORAGE_KEYS.NOTES,
    JSON.stringify(NotesState.notes),
  );
}

function formatDate(date = new Date()) {
  return date.toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(date = new Date()) {
  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatNoteDate(date = new Date()) {
  return date.toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDivisiIcon(divisi) {
  const icons = {
    Keagamaan: "fa-mosque",
    Humas: "fa-bullhorn",
    Sekretariat: "fa-clipboard-list",
    Pubdekdok: "fa-camera",
    PHBI: "fa-calendar-alt",
    PSDM: "fa-user-graduate",
    BPH: "fa-crown",
  };
  return icons[divisi] || "fa-users";
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ===== DRAW TTD FUNCTION =====
function drawTTD(doc, x, y, name, position) {
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(x, y, x + 50, y);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(position, x + 25, y + 5, { align: "center" });
  doc.setFontSize(9);
  doc.text(name, x + 25, y + 10, { align: "center" });
}

// ===== ANNOUNCEMENT FUNCTIONS =====
function showAnnouncementModal() {
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal" style="max-width: 500px;">
      <div class="modal-icon info">
        <i class="fas fa-bullhorn"></i>
      </div>
      <h3>📢 Pengumuman</h3>
      <div style="text-align: left; margin: 20px 0;">
        <div style="background: var(--gray-light); padding: 15px; border-radius: 12px;">
          <div style="font-weight: 600; margin-bottom: 8px;">${escapeHtml(AppState.announcement?.title || "Pengumuman")}</div>
          <div style="font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(AppState.announcement?.content || "Tidak ada pengumuman saat ini.")}</div>
          ${AppState.announcement?.date ? `<div style="font-size: 11px; color: var(--gray); margin-top: 10px;">📅 ${AppState.announcement.date}</div>` : ""}
        </div>
      </div>
      <div class="modal-buttons">
        <button class="modal-btn-cancel" style="flex:1;" onclick="this.closest('.modal-overlay').remove()">Tutup</button>
        <button class="modal-btn-confirm" style="background: var(--primary); flex:1;" onclick="window.editAnnouncement(); this.closest('.modal-overlay').remove()">
          <i class="fas fa-edit"></i> Edit
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function editAnnouncement() {
  const currentTitle = AppState.announcement?.title || "";
  const currentContent = AppState.announcement?.content || "";

  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal" style="max-width: 500px;">
      <div class="modal-icon info">
        <i class="fas fa-edit"></i>
      </div>
      <h3>Edit Pengumuman</h3>
      <div style="text-align: left; margin: 20px 0;">
        <div class="input-group">
          <label><i class="fas fa-tag"></i> Judul</label>
          <input type="text" id="announceTitle" value="${escapeHtml(currentTitle)}" placeholder="Masukkan judul pengumuman">
        </div>
        <div class="input-group">
          <label><i class="fas fa-align-left"></i> Isi Pengumuman</label>
          <textarea id="announceContent" rows="5" placeholder="Tulis isi pengumuman di sini...">${escapeHtml(currentContent)}</textarea>
        </div>
      </div>
      <div class="modal-buttons">
        <button class="modal-btn-cancel" onclick="this.closest('.modal-overlay').remove()">Batal</button>
        <button class="modal-btn-confirm" style="background: var(--primary);" onclick="window.saveAnnouncementFromModal()">
          <i class="fas fa-save"></i> Simpan
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function saveAnnouncementFromModal() {
  const title = document.getElementById("announceTitle")?.value.trim();
  const content = document.getElementById("announceContent")?.value.trim();

  if (!content) {
    Toast.warning("Isi pengumuman tidak boleh kosong!");
    return;
  }

  AppState.announcement = {
    title: title || "📢 Pengumuman",
    content: content,
    date: formatDate(new Date()),
  };
  saveAnnouncement();
  updateAnnouncementDisplay();
  Toast.success("Pengumuman berhasil disimpan!");

  const modal = document.querySelector(".modal-overlay");
  if (modal) modal.remove();
}

function updateAnnouncementDisplay() {
  const container = document.getElementById("announcementContainer");
  if (!container) return;

  if (AppState.announcement) {
    container.innerHTML = `
      <div class="announcement-card form-card" onclick="showAnnouncementModal()">
        <div class="announcement-header">
          <i class="fas fa-bullhorn"></i>
          <span class="announcement-title">${escapeHtml(AppState.announcement.title)}</span>
          <span class="announcement-date">${AppState.announcement.date}</span>
        </div>
        <div class="announcement-content">
          ${escapeHtml(AppState.announcement.content.substring(0, 100))}${AppState.announcement.content.length > 100 ? "..." : ""}
        </div>
        <div class="announcement-badge">
          <i class="fas fa-eye"></i> Klik untuk lihat lengkap
        </div>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="announcement-card form-card" onclick="editAnnouncement()" style="background: linear-gradient(135deg, #9ca3af, #6b7280);">
        <div class="announcement-header">
          <i class="fas fa-plus-circle"></i>
          <span class="announcement-title">Buat Pengumuman</span>
        </div>
        <div class="announcement-content">
          Klik di sini untuk membuat pengumuman baru
        </div>
        <div class="announcement-badge">
          <i class="fas fa-edit"></i> Klik untuk buat
        </div>
      </div>
    `;
  }
}

// ===== STATISTICS FUNCTIONS =====
function calculateDivisiStats() {
  const stats = {};
  CONFIG.DIVISI_LIST.forEach((divisi) => {
    stats[divisi] = {
      total: 0,
      individual: 0,
      group: 0,
      participants: new Set(),
      today: 0,
    };
  });

  const today = new Date().toDateString();
  AppState.absensiData.forEach((item) => {
    if (stats[item.divisi]) {
      stats[item.divisi].total++;
      if (new Date(item.timestamp).toDateString() === today)
        stats[item.divisi].today++;
      if (item.mode === "individual") stats[item.divisi].individual++;
      else stats[item.divisi].group++;
      stats[item.divisi].participants.add(item.nama);
    }
  });

  const ranking = Object.entries(stats)
    .map(([divisi, data]) => ({
      divisi,
      total: data.total,
      individual: data.individual,
      group: data.group,
      today: data.today,
      uniqueParticipants: data.participants.size,
    }))
    .sort((a, b) => b.total - a.total);

  return { stats, ranking };
}

function calculateTopMembers() {
  const memberStats = {};

  AppState.absensiData.forEach((item) => {
    if (!memberStats[item.nama]) {
      memberStats[item.nama] = {
        nama: item.nama,
        count: 0,
        divisi: item.divisi,
        lastAbsen: item.tanggal,
      };
    }
    memberStats[item.nama].count++;
    memberStats[item.nama].lastAbsen = item.tanggal;
  });

  const topMembers = Object.values(memberStats).sort(
    (a, b) => b.count - a.count,
  );
  return topMembers.slice(0, 5);
}

function updateDivisiChart() {
  const { ranking } = calculateDivisiStats();
  const ctx = document.getElementById("divisiChart");
  if (!ctx) return;
  if (AppState.divisiChart) AppState.divisiChart.destroy();

  const colors = ranking.map(
    (_, i) => `hsla(${((i * 360) / ranking.length) % 360}, 70%, 60%, 0.7)`,
  );

  AppState.divisiChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ranking.map((r) => r.divisi),
      datasets: [
        {
          label: "Total Absensi",
          data: ranking.map((r) => r.total),
          backgroundColor: colors,
          borderRadius: 8,
        },
        {
          label: "Hari Ini",
          data: ranking.map((r) => r.today),
          backgroundColor: colors.map((c) => c.replace("0.7", "0.4")),
          borderRadius: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "top" } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
    },
  });
}

function updateRankingList() {
  const { ranking } = calculateDivisiStats();
  const container = document.getElementById("rankingList");
  if (!container) return;

  if (ranking.length === 0) {
    container.innerHTML = `<div class="empty-state"><i class="fas fa-chart-bar"></i><p>Belum ada data absensi</p></div>`;
    return;
  }

  const maxTotal = Math.max(...ranking.map((r) => r.total));
  container.innerHTML = ranking
    .map((item, index) => {
      const percentage = maxTotal > 0 ? (item.total / maxTotal) * 100 : 0;
      return `
        <div class="ranking-item">
          <div class="rank-number">${index + 1}</div>
          <div class="rank-info">
            <h4>${item.divisi}</h4>
            <div class="rank-stats">
              <span><i class="fas fa-clipboard-check"></i> ${item.total} Total</span>
              <span><i class="fas fa-calendar-day"></i> ${item.today} Hari Ini</span>
              <span><i class="fas fa-user"></i> ${item.uniqueParticipants} Peserta</span>
            </div>
            <div class="rank-bar"><div class="rank-fill" style="width: ${percentage}%"></div></div>
          </div>
        </div>
      `;
    })
    .join("");
}

function updateTopMembers() {
  const topMembers = calculateTopMembers();
  const container = document.getElementById("topMembersList");
  if (!container) return;

  if (topMembers.length === 0) {
    container.innerHTML = `<div class="empty-state"><i class="fas fa-trophy"></i><p>Belum ada data</p></div>`;
    return;
  }

  container.innerHTML = topMembers
    .map((member, index) => {
      const medalIcon =
        index === 0
          ? "fa-crown"
          : index === 1
            ? "fa-medal"
            : index === 2
              ? "fa-medal"
              : "fa-award";
      const medalColor =
        index === 0
          ? "#fbbf24"
          : index === 1
            ? "#9ca3af"
            : index === 2
              ? "#cd7f32"
              : "#6b7280";

      return `
        <div class="ranking-item">
          <div class="rank-number" style="background: ${medalColor};">${index + 1}</div>
          <div class="rank-info">
            <h4><i class="fas ${medalIcon}" style="color: ${medalColor}; margin-right: 8px;"></i>${escapeHtml(member.nama)}</h4>
            <div class="rank-stats">
              <span><i class="fas fa-check-circle"></i> ${member.count} kali absen</span>
              <span><i class="fas fa-users"></i> Divisi ${member.divisi}</span>
              <span><i class="fas fa-calendar"></i> Terakhir: ${member.lastAbsen.split(",")[0]}</span>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

// ===== NOTES FUNCTIONS =====
function renderNotesList() {
  if (NotesState.notes.length === 0) {
    return `<div class="empty-state"><i class="fas fa-sticky-note"></i><p>Belum ada catatan</p><small>Buat catatan rapat/evaluasi baru di atas</small></div>`;
  }

  return NotesState.notes
    .slice()
    .reverse()
    .map(
      (note) => `
      <div class="note-item" data-id="${note.id}">
        <div class="note-title">
          <strong><i class="fas fa-file-alt"></i> ${escapeHtml(note.title)}</strong>
          <span class="note-date"><i class="far fa-calendar-alt"></i> ${note.date}</span>
        </div>
        <div class="note-content">
          ${escapeHtml(note.content.substring(0, 150))}${note.content.length > 150 ? "..." : ""}
        </div>
        ${note.peserta && note.peserta.length > 0 ? `<div style="font-size: 12px; color: var(--gray); margin-bottom: 10px;"><i class="fas fa-users"></i> ${note.peserta.length} peserta</div>` : ""}
        <div class="note-actions">
          <button onclick="window.viewNoteDetail(${note.id})" class="action-small" style="background: var(--primary);"><i class="fas fa-eye"></i> Detail</button>
          <button onclick="window.generatePDFFromNote(${note.id})" class="action-small" style="background: #ef4444;"><i class="fas fa-file-pdf"></i> PDF</button>
          <button onclick="window.sendNoteToWhatsApp(${note.id})" class="action-small" style="background: #22c55e;"><i class="fab fa-whatsapp"></i> WA</button>
          <button onclick="window.deleteNote(${note.id})" class="action-small" style="background: var(--gray);"><i class="fas fa-trash"></i> Hapus</button>
        </div>
      </div>
    `,
    )
    .join("");
}

function generatePDFFromNote(noteId) {
  const note = NotesState.notes.find((n) => n.id === noteId);
  if (!note) return;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  doc.setFontSize(20);
  doc.setTextColor(67, 97, 238);
  doc.text("CATATAN RAPAT / EVALUASI", 105, 20, { align: "center" });
  doc.setFontSize(14);
  doc.setTextColor(58, 12, 163);
  doc.text("IRMAS NURUL FALAH", 105, 28, { align: "center" });
  doc.setDrawColor(67, 97, 238);
  doc.line(20, 35, 190, 35);

  let yPos = 45;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Judul:", 20, yPos);
  doc.setFont("helvetica", "normal");
  const titleLines = doc.splitTextToSize(note.title, 130);
  doc.text(titleLines, 50, yPos);
  yPos += titleLines.length * 6 + 8;

  doc.setFont("helvetica", "bold");
  doc.text("Tanggal:", 20, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(note.date, 50, yPos);
  yPos += 10;

  doc.setFont("helvetica", "bold");
  doc.text("Isi Catatan:", 20, yPos);
  yPos += 6;
  doc.setFont("helvetica", "normal");
  const contentLines = doc.splitTextToSize(note.content, 160);
  doc.text(contentLines, 20, yPos);
  yPos += contentLines.length * 6 + 15;

  if (note.peserta && note.peserta.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.text("Daftar Peserta:", 20, yPos);
    yPos += 6;
    doc.setFont("helvetica", "normal");
    note.peserta.forEach((p, idx) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(`${idx + 1}. ${p}`, 25, yPos);
      yPos += 5;
    });
    yPos += 10;
  }

  if (note.kesimpulan) {
    if (yPos > 260) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.text("Kesimpulan / Tindak Lanjut:", 20, yPos);
    yPos += 6;
    doc.setFont("helvetica", "normal");
    const kesimpulanLines = doc.splitTextToSize(note.kesimpulan, 160);
    doc.text(kesimpulanLines, 20, yPos);
    yPos += kesimpulanLines.length * 6 + 15;
  }

  if (yPos > 240) {
    doc.addPage();
    yPos = 30;
  }

  yPos += 15;
  doc.setFontSize(10);
  doc.setFont("helvetica", "italic");
  doc.text("Mengetahui,", 105, yPos, { align: "center" });
  yPos += 20;

  drawTTD(doc, 30, yPos, CONFIG.ORGANIZATION.SEKRETARIS_1, "Sekretaris 1");
  drawTTD(doc, 110, yPos, CONFIG.ORGANIZATION.SEKRETARIS_2, "Sekretaris 2");

  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(
    "Dokumen ini digenerate otomatis oleh Sistem Absensi IRMAS",
    105,
    280,
    { align: "center" },
  );

  doc.save(
    `Catatan_Rapat_${note.title.replace(/\s+/g, "_")}_${new Date().getTime()}.pdf`,
  );

  Toast.success("PDF catatan berhasil didownload!");
}

function sendNoteToWhatsApp(noteId) {
  const note = NotesState.notes.find((n) => n.id === noteId);
  if (!note) return;

  let message = `📋 *CATATAN RAPAT / EVALUASI IRMAS*%0A%0A`;
  message += `*Judul:* ${encodeURIComponent(note.title)}%0A`;
  message += `*Tanggal:* ${note.date}%0A%0A`;
  message += `*Isi Catatan:*%0A${encodeURIComponent(note.content)}%0A%0A`;

  if (note.peserta && note.peserta.length > 0) {
    message += `*Daftar Peserta:*%0A`;
    note.peserta.forEach((p, i) => {
      message += `${i + 1}. ${encodeURIComponent(p)}%0A`;
    });
    message += `%0A`;
  }

  if (note.kesimpulan) {
    message += `*Kesimpulan / Tindak Lanjut:*%0A${encodeURIComponent(note.kesimpulan)}%0A%0A`;
  }

  message += `_Dikirim via Sistem Absensi IRMAS_`;

  window.open(
    `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${message}`,
    "_blank",
  );

  Toast.success("Pesan berhasil dikirim ke WhatsApp!");
}

function viewNoteDetail(id) {
  const note = NotesState.notes.find((n) => n.id === id);
  if (!note) return;

  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal" style="max-width: 600px; max-height: 80vh; overflow-y: auto;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h2 style="color: var(--primary); margin: 0;"><i class="fas fa-file-alt"></i> ${escapeHtml(note.title)}</h2>
        <button onclick="this.closest('.modal-overlay').remove()" style="background: none; border: none; font-size: 28px; cursor: pointer; color: var(--gray);">&times;</button>
      </div>
      <div style="color: var(--gray); font-size: 12px; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid var(--gray-border);">
        <i class="far fa-calendar-alt"></i> ${note.date}
      </div>
      <div style="margin-bottom: 20px;">
        <strong><i class="fas fa-align-left"></i> Isi Catatan:</strong>
        <div style="background: var(--gray-light); padding: 15px; border-radius: 10px; margin-top: 8px; white-space: pre-wrap; line-height: 1.6;">${escapeHtml(note.content)}</div>
      </div>
      ${
        note.peserta && note.peserta.length > 0
          ? `
      <div style="margin-bottom: 20px;">
        <strong><i class="fas fa-users"></i> Daftar Peserta (${note.peserta.length} orang):</strong>
        <div style="background: var(--gray-light); padding: 15px; border-radius: 10px; margin-top: 8px;">
          ${note.peserta.map((p, i) => `${i + 1}. ${escapeHtml(p)}`).join("<br>")}
        </div>
      </div>
      `
          : ""
      }
      ${
        note.kesimpulan
          ? `
      <div style="margin-bottom: 20px;">
        <strong><i class="fas fa-check-double"></i> Kesimpulan / Tindak Lanjut:</strong>
        <div style="background: var(--gray-light); padding: 15px; border-radius: 10px; margin-top: 8px; white-space: pre-wrap; line-height: 1.6;">${escapeHtml(note.kesimpulan)}</div>
      </div>
      `
          : ""
      }
      <div style="display: flex; gap: 10px; margin-top: 20px; padding-top: 15px; border-top: 1px solid var(--gray-border);">
        <button onclick="window.generatePDFFromNote(${note.id}); this.closest('.modal-overlay').remove();" style="flex:1; padding: 12px; background: #ef4444; color: white; border: none; border-radius: 8px; cursor: pointer;"><i class="fas fa-file-pdf"></i> Download PDF</button>
        <button onclick="window.sendNoteToWhatsApp(${note.id}); this.closest('.modal-overlay').remove();" style="flex:1; padding: 12px; background: #22c55e; color: white; border: none; border-radius: 8px; cursor: pointer;"><i class="fab fa-whatsapp"></i> Kirim ke WA</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

async function deleteNote(id) {
  const note = NotesState.notes.find((n) => n.id === id);
  const confirmed = await confirmDialog(
    `Apakah Anda yakin ingin menghapus catatan "${note?.title}"?`,
    "Hapus Catatan",
    "danger",
  );

  if (confirmed) {
    NotesState.notes = NotesState.notes.filter((n) => n.id !== id);
    saveNotes();
    renderNotesApp();
    Toast.success("Catatan berhasil dihapus!");
  }
}

function saveAndGenerateNotePDF() {
  const title = document.getElementById("noteTitle")?.value.trim();
  const content = document.getElementById("noteContent")?.value.trim();
  const pesertaInput = document.getElementById("notePeserta")?.value.trim();
  const kesimpulan = document.getElementById("noteKesimpulan")?.value.trim();

  if (!title || !content) {
    Toast.warning("Harap isi judul dan isi catatan!");
    return;
  }

  const peserta = pesertaInput
    ? pesertaInput
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p)
    : [];

  const newNote = {
    id: Date.now(),
    title: title,
    content: content,
    peserta: peserta,
    kesimpulan: kesimpulan,
    date: formatNoteDate(),
    timestamp: new Date().toISOString(),
  };

  NotesState.notes.push(newNote);
  saveNotes();
  generatePDFFromNote(newNote.id);
  renderNotesApp();

  document.getElementById("noteTitle").value = "";
  document.getElementById("noteContent").value = "";
  document.getElementById("notePeserta").value = "";
  document.getElementById("noteKesimpulan").value = "";
}

function saveAndSendNoteWA() {
  const title = document.getElementById("noteTitle")?.value.trim();
  const content = document.getElementById("noteContent")?.value.trim();
  const pesertaInput = document.getElementById("notePeserta")?.value.trim();
  const kesimpulan = document.getElementById("noteKesimpulan")?.value.trim();

  if (!title || !content) {
    Toast.warning("Harap isi judul dan isi catatan!");
    return;
  }

  const peserta = pesertaInput
    ? pesertaInput
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p)
    : [];

  const newNote = {
    id: Date.now(),
    title: title,
    content: content,
    peserta: peserta,
    kesimpulan: kesimpulan,
    date: formatNoteDate(),
    timestamp: new Date().toISOString(),
  };

  NotesState.notes.push(newNote);
  saveNotes();
  sendNoteToWhatsApp(newNote.id);
  renderNotesApp();

  document.getElementById("noteTitle").value = "";
  document.getElementById("noteContent").value = "";
  document.getElementById("notePeserta").value = "";
  document.getElementById("noteKesimpulan").value = "";
}

function exportAllNotesToPDF() {
  if (NotesState.notes.length === 0) {
    Toast.warning("Tidak ada catatan untuk diexport!");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  doc.setFontSize(20);
  doc.setTextColor(67, 97, 238);
  doc.text("LAPORAN SEMUA CATATAN RAPAT", 105, 20, { align: "center" });
  doc.setFontSize(14);
  doc.setTextColor(58, 12, 163);
  doc.text("IRMAS NURUL FALAH", 105, 28, { align: "center" });
  doc.setDrawColor(67, 97, 238);
  doc.line(20, 35, 190, 35);
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Total Catatan: ${NotesState.notes.length}`, 105, 42, {
    align: "center",
  });
  doc.text(`Dicetak: ${formatNoteDate()}`, 105, 48, { align: "center" });

  let yPos = 60;

  NotesState.notes
    .slice()
    .reverse()
    .forEach((note, idx) => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.text(`${idx + 1}. ${note.title}`, 20, yPos);
      yPos += 6;

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Tanggal: ${note.date}`, 25, yPos);
      yPos += 5;

      const contentPreview =
        note.content.length > 200
          ? note.content.substring(0, 200) + "..."
          : note.content;
      const contentLines = doc.splitTextToSize(contentPreview, 160);
      doc.text(contentLines, 25, yPos);
      yPos += contentLines.length * 5 + 5;

      if (note.peserta && note.peserta.length > 0) {
        doc.text(
          `Peserta: ${note.peserta.slice(0, 3).join(", ")}${note.peserta.length > 3 ? "..." : ""}`,
          25,
          yPos,
        );
        yPos += 5;
      }

      yPos += 8;
      doc.setDrawColor(200, 200, 200);
      doc.line(20, yPos, 190, yPos);
      yPos += 10;
    });

  if (yPos > 240) {
    doc.addPage();
    yPos = 30;
  }

  yPos += 15;
  doc.setFontSize(10);
  doc.setFont("helvetica", "italic");
  doc.text("Mengetahui,", 105, yPos, { align: "center" });
  yPos += 20;

  drawTTD(doc, 30, yPos, CONFIG.ORGANIZATION.SEKRETARIS_1, "Sekretaris 1");
  drawTTD(doc, 110, yPos, CONFIG.ORGANIZATION.SEKRETARIS_2, "Sekretaris 2");

  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(
    "Dokumen ini digenerate otomatis oleh Sistem Absensi IRMAS",
    105,
    280,
    { align: "center" },
  );

  doc.save(`Laporan_Semua_Catatan_${new Date().getTime()}.pdf`);
  Toast.success("Semua catatan berhasil diexport ke PDF!");
}

function renderNotesApp() {
  const container = document.getElementById("notesAppContainer");
  if (!container) return;

  container.innerHTML = `
    <div class="notes-section">
      <div class="form-card">
        <div class="form-header">
          <i class="fas fa-sticky-note"></i>
          <h3>Catatan Rapat & Evaluasi</h3>
          <small style="margin-left: auto; color: var(--primary);">Sekretaris dapat mencatat dan mengirim ke WA/PDF</small>
        </div>
        
        <h4 style="margin-bottom: 20px;"><i class="fas fa-plus-circle"></i> Buat Catatan Baru</h4>
        
        <div class="input-group">
          <label><i class="fas fa-tag"></i> Judul Catatan</label>
          <input type="text" id="noteTitle" placeholder="Contoh: Rapat Evaluasi Bulanan November 2024">
        </div>
        
        <div class="input-group">
          <label><i class="fas fa-align-left"></i> Isi Catatan</label>
          <textarea id="noteContent" rows="6" placeholder="Tulis detail catatan rapat/evaluasi di sini..."></textarea>
        </div>
        
        <div class="input-group">
          <label><i class="fas fa-users"></i> Daftar Peserta (pisahkan dengan koma)</label>
          <input type="text" id="notePeserta" placeholder="Contoh: Agung Ubaidillah, Tasya Amelia Putri, Lidya Febrianti">
          <small style="font-size: 11px; color: var(--gray); margin-top: 4px; display: block;">* Pisahkan setiap nama dengan tanda koma</small>
        </div>
        
        <div class="input-group">
          <label><i class="fas fa-check-double"></i> Kesimpulan / Tindak Lanjut</label>
          <textarea id="noteKesimpulan" rows="3" placeholder="Kesimpulan dan rencana tindak lanjut..."></textarea>
        </div>
        
        <div class="action-buttons">
          <button class="action-btn btn-pdf" onclick="window.saveAndGenerateNotePDF()">
            <i class="fas fa-file-pdf"></i> Simpan & Buat PDF
          </button>
          <button class="action-btn btn-whatsapp" onclick="window.saveAndSendNoteWA()">
            <i class="fab fa-whatsapp"></i> Simpan & Kirim ke WA
          </button>
        </div>
      </div>
      
      <div class="form-card">
        <div class="notes-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
          <h4><i class="fas fa-history"></i> Riwayat Catatan</h4>
          <button class="action-small" onclick="window.exportAllNotesToPDF()" style="background: var(--primary); padding: 8px 16px;">
            <i class="fas fa-file-pdf"></i> Export Semua ke PDF
          </button>
        </div>
        <div id="notesList" class="notes-list" style="max-height: 500px; overflow-y: auto;">
          ${renderNotesList()}
        </div>
      </div>
    </div>
  `;
}

// ===== EXCEL EXPORT FUNCTION =====
function exportToExcel() {
  if (AppState.absensiData.length === 0) {
    Toast.warning("Tidak ada data untuk diexport!");
    return;
  }

  const excelData = AppState.absensiData.map((item, index) => ({
    No: index + 1,
    Nama: item.nama,
    Divisi: item.divisi,
    Kegiatan: item.kegiatan,
    Catatan: item.catatan || "-",
    Tanggal: item.tanggal,
    Waktu: item.waktu,
    Mode: item.mode === "individual" ? "Individual" : "Kepanitiaan",
  }));

  const ws = XLSX.utils.json_to_sheet(excelData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data Absensi IRMAS");

  XLSX.writeFile(wb, `Data_Absensi_IRMAS_${new Date().getTime()}.xlsx`);
  Toast.success("Data berhasil diexport ke Excel!");
}

function exportNotesToExcel() {
  if (NotesState.notes.length === 0) {
    Toast.warning("Tidak ada catatan untuk diexport!");
    return;
  }

  const excelData = NotesState.notes.map((note, index) => ({
    No: index + 1,
    Judul: note.title,
    Tanggal: note.date,
    Isi_Catatan: note.content,
    Jumlah_Peserta: note.peserta?.length || 0,
    Daftar_Peserta: note.peserta?.join(", ") || "-",
    Kesimpulan: note.kesimpulan || "-",
  }));

  const ws = XLSX.utils.json_to_sheet(excelData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Catatan Rapat IRMAS");

  XLSX.writeFile(wb, `Catatan_Rapat_IRMAS_${new Date().getTime()}.xlsx`);
  Toast.success("Catatan berhasil diexport ke Excel!");
}

// ===== UPDATE FUNCTIONS =====
function updateAllDisplays() {
  updateStats();
  updateDataTable();
  updateFullDataTable();
  updatePesertaList();
  updatePesertaAbsenList();
  updateDivisiChart();
  updateRankingList();
  updateTopMembers();
  updateNavStats();
  updateAnnouncementDisplay();
}

function updateStats() {
  const { ranking } = calculateDivisiStats();
  const topMembers = calculateTopMembers();
  const today = new Date().toDateString();
  const todayCount = AppState.absensiData.filter(
    (item) => new Date(item.timestamp).toDateString() === today,
  ).length;

  const stats = {
    totalAbsensi: AppState.absensiData.length,
    totalPeserta: AppState.pesertaList.length,
    todayCount: todayCount,
    topDivisi: ranking.length > 0 ? ranking[0].divisi : "-",
    topDivisiCount: ranking.length > 0 ? ranking[0].total : 0,
    totalDivisi: new Set(AppState.absensiData.map((i) => i.divisi)).size,
    topMember: topMembers.length > 0 ? topMembers[0].nama : "-",
    topMemberCount: topMembers.length > 0 ? topMembers[0].count : 0,
  };

  Object.entries(stats).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  });
}

function updateNavStats() {
  const { ranking } = calculateDivisiStats();
  const navStats = document.getElementById("navStats");
  if (navStats) {
    navStats.innerHTML = `
      <span class="stat-badge"><i class="fas fa-trophy"></i> Top: ${ranking.length > 0 ? ranking[0].divisi : "-"}</span>
      <span class="stat-badge"><i class="fas fa-users"></i> ${AppState.absensiData.length} Data</span>
    `;
  }
}

function updateDataTable() {
  const tbody = document.getElementById("dataTableBody");
  if (!tbody) return;

  const recentData = [...AppState.absensiData].reverse().slice(0, 5);
  if (recentData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state"><i class="fas fa-clipboard-list"></i><p>Belum ada data</p></td></tr>`;
    return;
  }

  tbody.innerHTML = recentData
    .map(
      (data) => `
      <tr>
        <td>${escapeHtml(data.nama)}</td>
        <td>${data.divisi}</td>
        <td>${escapeHtml(data.kegiatan.substring(0, 30))}${data.kegiatan.length > 30 ? "..." : ""}</td>
        <td>${data.tanggal.split(",")[0]}</td>
        <td>${data.waktu}</td>
        <td><span class="badge ${data.mode === "individual" ? "badge-individual" : "badge-group"}">${data.mode === "individual" ? "Individual" : "Grup"}</span></td>
      </tr>
    `,
    )
    .join("");
}

function updateFullDataTable() {
  const tbody = document.querySelector("#dataTableFull tbody");
  if (!tbody) return;

  const allData = [...AppState.absensiData].reverse();
  if (allData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state"><i class="fas fa-database"></i><p>Belum ada data</p></td></tr>`;
    return;
  }

  tbody.innerHTML = allData
    .map(
      (data, index) => `
      <tr>
        <td>${index + 1}</td>
        <td><strong>${escapeHtml(data.nama)}</strong></td>
        <td>${data.divisi}</td>
        <td>${escapeHtml(data.kegiatan)}</td>
        <td>${data.tanggal}</td>
        <td>${data.waktu}</td>
        <td><span class="badge ${data.mode === "individual" ? "badge-individual" : "badge-group"}">${data.mode === "individual" ? "Individual" : "Grup"}</span></td>
      </tr>
    `,
    )
    .join("");
}

function updatePesertaList() {
  const listElement = document.getElementById("pesertaList");
  const countElement = document.getElementById("pesertaCount");
  if (!listElement) return;

  if (countElement) countElement.textContent = AppState.pesertaList.length;

  if (AppState.pesertaList.length === 0) {
    listElement.innerHTML = `<div class="empty-state"><i class="fas fa-user-friends"></i><p>Belum ada peserta</p><small>Klik "Tambah Anggota" untuk menambahkan</small></div>`;
    return;
  }

  listElement.innerHTML = AppState.pesertaList
    .map(
      (peserta) => `
      <div class="peserta-item" data-id="${peserta.id}">
        <div class="peserta-info">
          <h4>${escapeHtml(peserta.nama)}</h4>
          <small>Divisi: ${peserta.divisi} | Terdaftar: ${peserta.tanggalDaftar}</small>
        </div>
        <div class="peserta-actions">
          <button class="action-small btn-success-sm" onclick="window.tandaiAbsen(${peserta.id})"><i class="fas fa-check"></i> Absen</button>
          <button class="action-small btn-danger-sm" onclick="window.hapusPeserta(${peserta.id})"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    `,
    )
    .join("");
}

function updatePesertaAbsenList() {
  const listElement = document.getElementById("pesertaAbsenList");
  const countElement = document.getElementById("absenCount");
  if (!listElement) return;

  if (countElement) countElement.textContent = AppState.pesertaAbsen.length;

  if (AppState.pesertaAbsen.length === 0) {
    listElement.innerHTML = `<div class="empty-state"><i class="fas fa-clipboard-list"></i><p>Belum ada peserta yang absen</p><small>Klik "Absen" pada daftar anggota</small></div>`;
    return;
  }

  listElement.innerHTML = AppState.pesertaAbsen
    .map(
      (peserta) => `
      <div class="peserta-item">
        <div class="peserta-info">
          <h4>${escapeHtml(peserta.nama)}</h4>
          <small>Divisi: ${peserta.divisi} | Waktu: ${peserta.waktuAbsen}</small>
        </div>
        <button class="action-small btn-danger-sm" onclick="window.hapusDariAbsen(${peserta.id})"><i class="fas fa-times"></i> Hapus</button>
      </div>
    `,
    )
    .join("");
}

function updatePreview() {
  const nama = document.getElementById("nama")?.value || "[Nama Lengkap]";
  const kegiatan = document.getElementById("kegiatan")?.value || "[Kegiatan]";
  const catatan = document.getElementById("catatan")?.value || "";
  const preview = document.getElementById("previewMessage");
  if (!preview) return;

  preview.textContent = `ABSENSI IRMAS NURUL FALAH

Tanggal: ${formatDate()}
Waktu: ${formatTime()}

Nama: ${nama}
Divisi: ${AppState.currentDivisi}
Kegiatan: ${kegiatan}
${catatan ? `Catatan: ${catatan}\n` : ""}
Data dikirim via Sistem Absensi IRMAS`;
}

// ===== PESERTA MANAGEMENT =====
window.tambahPeserta = function () {
  const nama = document.getElementById("namaPeserta")?.value.trim();
  const divisi = document.getElementById("divisiPeserta")?.value;

  if (!nama) {
    Toast.warning("Masukkan nama peserta terlebih dahulu!");
    return;
  }

  AppState.pesertaList.push({
    id: Date.now(),
    nama: nama,
    divisi: divisi,
    tanggalDaftar: formatDate(),
  });
  savePesertaList();
  document.getElementById("namaPeserta").value = "";
  updateAllDisplays();
  Toast.success(`Peserta "${nama}" berhasil ditambahkan!`);
};

window.hapusPeserta = async function (id) {
  const peserta = AppState.pesertaList.find((p) => p.id === id);
  const confirmed = await confirmDialog(
    `Apakah Anda yakin ingin menghapus peserta "${peserta?.nama}"?`,
    "Hapus Peserta",
    "danger",
  );

  if (confirmed) {
    AppState.pesertaList = AppState.pesertaList.filter((p) => p.id !== id);
    savePesertaList();
    updateAllDisplays();
    Toast.success("Peserta berhasil dihapus!");
  }
};

window.tandaiAbsen = function (id) {
  const peserta = AppState.pesertaList.find((p) => p.id === id);
  if (!peserta) return;

  const today = formatDate();
  const sudahAbsen = AppState.pesertaAbsen.find(
    (p) => p.id === id && p.tanggalAbsen === today,
  );

  if (sudahAbsen) {
    Toast.warning(`${peserta.nama} sudah absen hari ini!`);
    return;
  }

  AppState.pesertaAbsen.push({
    ...peserta,
    tanggalAbsen: today,
    waktuAbsen: formatTime(),
    kegiatan:
      document.getElementById("kegiatanGroup")?.value || "Kegiatan Harian",
  });
  updatePesertaAbsenList();
  Toast.success(`${peserta.nama} berhasil ditandai hadir!`);
};

window.hapusDariAbsen = function (id) {
  AppState.pesertaAbsen = AppState.pesertaAbsen.filter((p) => p.id !== id);
  updatePesertaAbsenList();
  Toast.info("Peserta dihapus dari daftar hadir");
};

// ===== ABSENSI FUNCTIONS =====
window.submitAbsensiIndividual = async function (e) {
  e.preventDefault();

  const nama = document.getElementById("nama").value.trim();
  const kegiatan = document.getElementById("kegiatan").value.trim();
  const catatan = document.getElementById("catatan").value.trim();

  if (!nama || !kegiatan) {
    Toast.warning("Harap isi nama dan kegiatan terlebih dahulu!");
    return false;
  }

  const submitBtn = e.target.querySelector(".btn-whatsapp");
  const originalText = submitBtn.innerHTML;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> MENGIRIM...';
  submitBtn.disabled = true;

  const today = new Date();
  const absensiData = {
    id: Date.now(),
    nama: nama,
    divisi: AppState.currentDivisi,
    kegiatan: kegiatan,
    catatan: catatan,
    tanggal: formatDate(today),
    waktu: formatTime(today),
    timestamp: today.toISOString(),
    mode: "individual",
  };

  saveAbsensiData(absensiData);

  const message = createWhatsAppMessage(absensiData);
  window.open(
    `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${message}`,
    "_blank",
  );

  setTimeout(() => {
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
    document.getElementById("absensiForm").reset();
    document.querySelectorAll(".divisi-option").forEach((opt, idx) => {
      opt.classList.remove("active");
      if (idx === 0) opt.classList.add("active");
    });
    AppState.currentDivisi = CONFIG.DIVISI_LIST[0];
    updatePreview();
    Toast.success("Absensi berhasil dikirim ke WhatsApp!");
  }, 1000);

  return false;
};

window.submitAbsensiGroup = function (e) {
  e.preventDefault();

  if (AppState.pesertaAbsen.length === 0) {
    Toast.warning("Belum ada peserta yang ditandai hadir!");
    return false;
  }

  const kegiatan = document.getElementById("kegiatanGroup").value.trim();
  const catatan = document.getElementById("catatanGroup").value.trim();

  if (!kegiatan) {
    Toast.warning("Harap isi nama kegiatan terlebih dahulu!");
    return false;
  }

  const submitBtn = e.target.querySelector(".btn-whatsapp");
  const originalText = submitBtn.innerHTML;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> MENGIRIM...';
  submitBtn.disabled = true;

  const today = new Date();
  const tanggal = formatDate(today);

  AppState.pesertaAbsen.forEach((peserta) => {
    saveAbsensiData({
      id: Date.now() + Math.random(),
      nama: peserta.nama,
      divisi: peserta.divisi,
      kegiatan: kegiatan,
      catatan: catatan,
      tanggal: tanggal,
      waktu: peserta.waktuAbsen,
      timestamp: today.toISOString(),
      mode: "group",
    });
  });

  const message = createGroupWhatsAppMessage(
    AppState.pesertaAbsen,
    kegiatan,
    catatan,
    tanggal,
  );
  window.open(
    `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${message}`,
    "_blank",
  );

  setTimeout(() => {
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
    AppState.pesertaAbsen = [];
    document.getElementById("absensiGroupForm").reset();
    updatePesertaAbsenList();
    Toast.success(`Absensi grup berhasil dikirim!`);
  }, 1000);

  return false;
};

// ===== WHATSAPP MESSAGES =====
function createWhatsAppMessage(data) {
  return (
    `ABSENSI INDIVIDUAL IRMAS NURUL FALAH%0A%0A` +
    `Tanggal: ${data.tanggal}%0A` +
    `Waktu: ${data.waktu}%0A%0A` +
    `Nama: ${encodeURIComponent(data.nama)}%0A` +
    `Divisi: ${data.divisi}%0A` +
    `Kegiatan: ${encodeURIComponent(data.kegiatan)}%0A` +
    (data.catatan ? `Catatan: ${encodeURIComponent(data.catatan)}%0A` : "") +
    `%0AMode: Individual%0AData dikirim via Sistem Absensi IRMAS`
  );
}

function createGroupWhatsAppMessage(peserta, kegiatan, catatan, tanggal) {
  let message =
    `ABSENSI GRUP IRMAS NURUL FALAH%0A%0A` +
    `📅 ${tanggal}%0A` +
    `📋 ${encodeURIComponent(kegiatan)}%0A%0A` +
    `👥 DAFTAR HADIR (${peserta.length} orang):%0A%0A`;

  peserta.forEach((p, index) => {
    message +=
      `${index + 1}. ${encodeURIComponent(p.nama)}%0A` +
      `   Divisi: ${p.divisi}%0A` +
      `   Waktu: ${p.waktuAbsen}%0A%0A`;
  });

  if (catatan) message += `📝 Catatan: ${encodeURIComponent(catatan)}%0A`;
  message += `%0AMode: Grup Kepanitiaan%0AData dikirim via Sistem Absensi IRMAS`;
  return message;
}

// ===== PDF GENERATION =====
window.generatePDFIndividual = function () {
  const nama = document.getElementById("nama").value.trim();
  const kegiatan = document.getElementById("kegiatan").value.trim();
  const catatan = document.getElementById("catatan").value.trim();

  if (!nama || !kegiatan) {
    Toast.warning("Harap isi nama dan kegiatan terlebih dahulu!");
    return;
  }

  const today = new Date();
  const absensiData = {
    id: Date.now(),
    nama: nama,
    divisi: AppState.currentDivisi,
    kegiatan: kegiatan,
    catatan: catatan,
    tanggal: formatDate(today),
    waktu: formatTime(today),
    timestamp: today.toISOString(),
    mode: "individual",
  };
  saveAbsensiData(absensiData);

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  doc.setFontSize(20);
  doc.setTextColor(67, 97, 238);
  doc.text("FORMULIR ABSENSI INDIVIDUAL", 105, 20, { align: "center" });
  doc.setFontSize(14);
  doc.setTextColor(58, 12, 163);
  doc.text("IRMAS NURUL FALAH", 105, 28, { align: "center" });
  doc.setDrawColor(67, 97, 238);
  doc.line(20, 35, 190, 35);

  let yPos = 45;
  const fields = [
    { label: "ID Absensi", value: `IRMAS-${absensiData.id}` },
    { label: "Tanggal", value: absensiData.tanggal },
    { label: "Waktu", value: absensiData.waktu },
    { label: "Nama Lengkap", value: nama },
    { label: "Divisi", value: AppState.currentDivisi },
    { label: "Kegiatan", value: kegiatan },
    { label: "Catatan", value: catatan || "-" },
  ];

  fields.forEach((field) => {
    if (yPos > 200) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.text(`${field.label}:`, 20, yPos);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(field.value, 120);
    if (lines.length > 1) {
      doc.text(lines, 60, yPos);
      yPos += lines.length * 6;
    } else {
      doc.text(field.value, 60, yPos);
      yPos += 8;
    }
    yPos += 4;
  });

  const { ranking } = calculateDivisiStats();
  yPos += 10;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("RANKING KEHADIRAN DIVISI:", 105, yPos, { align: "center" });
  yPos += 8;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  ranking.slice(0, 5).forEach((item, index) => {
    doc.text(`${index + 1}. ${item.divisi}: ${item.total} absensi`, 25, yPos);
    yPos += 6;
  });

  yPos += 20;
  doc.setFontSize(10);
  doc.setFont("helvetica", "italic");
  doc.text("Mengetahui,", 105, yPos, { align: "center" });
  yPos += 20;

  drawTTD(doc, 20, yPos, CONFIG.ORGANIZATION.KETUA_UMUM, "Ketua Umum");
  drawTTD(doc, 70, yPos, CONFIG.ORGANIZATION.SEKRETARIS_1, "Sekretaris 1");
  drawTTD(doc, 120, yPos, CONFIG.ORGANIZATION.SEKRETARIS_2, "Sekretaris 2");

  doc.save(
    `Absensi_${nama.replace(/\s+/g, "_")}_${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}.pdf`,
  );
  Toast.success("PDF berhasil didownload!");
};

window.generatePDFGroup = function () {
  if (AppState.pesertaAbsen.length === 0) {
    Toast.warning("Belum ada peserta yang ditandai hadir!");
    return;
  }

  const kegiatan =
    document.getElementById("kegiatanGroup")?.value.trim() ||
    "Kegiatan Kepanitiaan";
  const catatan = document.getElementById("catatanGroup")?.value.trim();
  const today = new Date();
  const tanggal = formatDate(today);

  AppState.pesertaAbsen.forEach((peserta) => {
    saveAbsensiData({
      id: Date.now() + Math.random(),
      nama: peserta.nama,
      divisi: peserta.divisi,
      kegiatan: kegiatan,
      catatan: catatan,
      tanggal: tanggal,
      waktu: peserta.waktuAbsen,
      timestamp: today.toISOString(),
      mode: "group",
    });
  });

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  doc.setFontSize(20);
  doc.setTextColor(67, 97, 238);
  doc.text("DAFTAR HADIR KEPANITIAAN", 105, 15, { align: "center" });
  doc.setFontSize(14);
  doc.setTextColor(58, 12, 163);
  doc.text("IRMAS NURUL FALAH", 105, 22, { align: "center" });
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text(`Kegiatan: ${kegiatan}`, 20, 35);
  doc.text(`Tanggal: ${formatDate(today)}`, 20, 42);
  doc.text(`Waktu: ${formatTime(today)}`, 20, 49);
  doc.text(`Jumlah Peserta: ${AppState.pesertaAbsen.length} orang`, 20, 56);
  if (catatan) doc.text(`Catatan: ${catatan}`, 20, 63);

  let yPos = 80;
  const headers = ["No", "Nama", "Divisi", "Waktu", "TTD"];
  const colWidths = [15, 70, 40, 35, 30];

  const drawTableHeader = (y) => {
    let xPos = 20;
    doc.setFillColor(67, 97, 238);
    doc.rect(xPos, y, 170, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    headers.forEach((header, i) => {
      doc.text(header, xPos + 5, y + 6);
      xPos += colWidths[i];
    });
    doc.setTextColor(0, 0, 0);
    return y + 10;
  };

  yPos = drawTableHeader(yPos);
  doc.setFont("helvetica", "normal");

  AppState.pesertaAbsen.forEach((peserta, index) => {
    if (yPos > 200) {
      doc.addPage();
      yPos = drawTableHeader(20);
    }

    let xPos = 20;
    doc.text(`${index + 1}`, xPos + 5, yPos + 5);
    xPos += colWidths[0];

    const nameLines = doc.splitTextToSize(peserta.nama, colWidths[1] - 10);
    if (nameLines.length > 1) {
      doc.text(nameLines, xPos + 5, yPos + 5);
      yPos += (nameLines.length - 1) * 5;
    } else {
      doc.text(peserta.nama, xPos + 5, yPos + 5);
    }
    xPos += colWidths[1];

    doc.text(peserta.divisi, xPos + 5, yPos + 5);
    xPos += colWidths[2];

    doc.text(peserta.waktuAbsen, xPos + 5, yPos + 5);
    xPos += colWidths[3];

    doc.line(xPos, yPos + 2, xPos + 25, yPos + 2);
    yPos += 8;
  });

  yPos += 15;
  doc.setFontSize(10);
  doc.setFont("helvetica", "italic");
  doc.text("Mengetahui,", 105, yPos, { align: "center" });
  yPos += 20;

  drawTTD(doc, 20, yPos, CONFIG.ORGANIZATION.KETUA_UMUM, "Ketua Umum");
  drawTTD(doc, 70, yPos, CONFIG.ORGANIZATION.SEKRETARIS_1, "Sekretaris 1");
  drawTTD(doc, 120, yPos, CONFIG.ORGANIZATION.SEKRETARIS_2, "Sekretaris 2");

  doc.save(
    `Daftar_Hadir_${kegiatan.replace(/\s+/g, "_")}_${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}.pdf`,
  );
  Toast.success("PDF daftar hadir berhasil didownload!");
};

window.generateLaporan = function () {
  if (AppState.absensiData.length === 0) {
    Toast.warning("Belum ada data absensi untuk dilaporkan!");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const { ranking } = calculateDivisiStats();
  const topMembers = calculateTopMembers();
  const today = new Date();

  doc.setFontSize(20);
  doc.setTextColor(67, 97, 238);
  doc.text("LAPORAN ABSENSI LENGKAP", 105, 15, { align: "center" });
  doc.setFontSize(14);
  doc.setTextColor(58, 12, 163);
  doc.text("IRMAS NURUL FALAH", 105, 22, { align: "center" });
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Dicetak: ${formatDate(today)} ${formatTime(today)}`, 105, 30, {
    align: "center",
  });
  doc.text(`Total Data: ${AppState.absensiData.length} absensi`, 105, 36, {
    align: "center",
  });

  let yPos = 50;
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text("STRUKTUR ORGANISASI:", 20, yPos);
  yPos += 8;
  doc.setFontSize(10);
  doc.text(`Ketua Umum: ${CONFIG.ORGANIZATION.KETUA_UMUM}`, 25, yPos);
  yPos += 6;
  doc.text(`Sekretaris 1: ${CONFIG.ORGANIZATION.SEKRETARIS_1}`, 25, yPos);
  yPos += 6;
  doc.text(`Sekretaris 2: ${CONFIG.ORGANIZATION.SEKRETARIS_2}`, 25, yPos);
  yPos += 6;
  doc.text(`Wakil Ketua: ${CONFIG.ORGANIZATION.WAKIL_KETUA}`, 25, yPos);
  yPos += 6;
  doc.text(`Bendahara: ${CONFIG.ORGANIZATION.BENDAHARA}`, 25, yPos);
  yPos += 15;

  doc.setFontSize(12);
  doc.text("RANKING KEHADIRAN DIVISI:", 20, yPos);
  yPos += 8;
  doc.setFontSize(10);
  ranking.forEach((item, index) => {
    doc.text(
      `${index + 1}. ${item.divisi}: ${item.total} absensi (${item.uniqueParticipants} peserta)`,
      25,
      yPos,
    );
    yPos += 6;
  });

  yPos += 10;
  doc.setFontSize(12);
  doc.text("5 ANGGOTA TERRAJIN:", 20, yPos);
  yPos += 8;
  doc.setFontSize(10);
  topMembers.forEach((member, index) => {
    doc.text(
      `${index + 1}. ${member.nama} - ${member.count} kali absen (Divisi ${member.divisi})`,
      25,
      yPos,
    );
    yPos += 6;
  });

  yPos += 10;
  const headers = ["No", "Nama", "Divisi", "Kegiatan", "Tanggal", "Mode"];
  const colWidths = [10, 45, 30, 60, 30, 20];

  let isFirstPage = true;
  AppState.absensiData.forEach((data, index) => {
    if (yPos > 200) {
      doc.addPage();
      yPos = 20;
      isFirstPage = true;
    }

    if (isFirstPage) {
      let xPos = 10;
      doc.setFillColor(230, 230, 230);
      doc.rect(xPos, yPos, 190, 8, "F");
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      headers.forEach((header, i) => {
        doc.text(header, xPos + 5, yPos + 6);
        xPos += colWidths[i];
      });
      yPos += 10;
      isFirstPage = false;
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    let xPos = 10;
    doc.text(`${index + 1}`, xPos + 5, yPos + 5);
    xPos += colWidths[0];
    doc.text(data.nama.substring(0, 20), xPos + 5, yPos + 5);
    xPos += colWidths[1];
    doc.text(data.divisi, xPos + 5, yPos + 5);
    xPos += colWidths[2];
    doc.text(data.kegiatan.substring(0, 25), xPos + 5, yPos + 5);
    xPos += colWidths[3];
    doc.text(data.tanggal.split(",")[0], xPos + 5, yPos + 5);
    xPos += colWidths[4];
    doc.text(data.mode === "group" ? "Grup" : "Indv", xPos + 5, yPos + 5);
    yPos += 7;
  });

  yPos += 15;
  doc.setFontSize(10);
  doc.setFont("helvetica", "italic");
  doc.text("Mengetahui,", 105, yPos, { align: "center" });
  yPos += 20;

  drawTTD(doc, 20, yPos, CONFIG.ORGANIZATION.KETUA_UMUM, "Ketua Umum");
  drawTTD(doc, 70, yPos, CONFIG.ORGANIZATION.SEKRETARIS_1, "Sekretaris 1");
  drawTTD(doc, 120, yPos, CONFIG.ORGANIZATION.SEKRETARIS_2, "Sekretaris 2");

  doc.save(
    `Laporan_Absensi_${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}.pdf`,
  );
  Toast.success("Laporan berhasil didownload!");
};

// ===== NAVIGATION FUNCTIONS =====
window.toggleMenu = function () {
  const sidebar = document.querySelector(".sidebar");
  const overlay = document.querySelector(".sidebar-overlay");

  if (sidebar && overlay) {
    sidebar.classList.toggle("active");
    overlay.classList.toggle("active");

    if (sidebar.classList.contains("active")) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }
};

window.closeMenu = function () {
  const sidebar = document.querySelector(".sidebar");
  const overlay = document.querySelector(".sidebar-overlay");

  if (sidebar && overlay) {
    sidebar.classList.remove("active");
    overlay.classList.remove("active");
    document.body.style.overflow = "";
  }
};

window.showSection = function (section) {
  AppState.activeSection = section;
  document.querySelectorAll(".menu-item").forEach((item) => {
    item.classList.remove("active");
    if (item.dataset.section === section) item.classList.add("active");
  });
  document
    .querySelectorAll(".content-section")
    .forEach((sec) => sec.classList.remove("active"));
  document.getElementById(section + "Section")?.classList.add("active");

  if (section === "dashboard") {
    setTimeout(() => {
      updateDivisiChart();
      updateRankingList();
      updateTopMembers();
    }, 100);
  }
  if (section === "data") updateFullDataTable();
  if (section === "notes") {
    setTimeout(() => {
      renderNotesApp();
    }, 100);
  }

  window.closeMenu();
};

window.selectMode = function (mode) {
  AppState.currentMode = mode;
  document
    .querySelectorAll(".mode-btn")
    .forEach((btn) => btn.classList.remove("active"));
  const targetBtn = Array.from(document.querySelectorAll(".mode-btn")).find(
    (btn) =>
      btn.textContent.includes(
        mode === "individual" ? "Individual" : "Kepanitiaan",
      ),
  );
  if (targetBtn) targetBtn.classList.add("active");
  document
    .querySelectorAll(".mode-section")
    .forEach((section) => section.classList.remove("active"));
  document.getElementById(mode + "Form")?.classList.add("active");
};

window.selectDivisi = function (element, divisi) {
  document
    .querySelectorAll(".divisi-option")
    .forEach((opt) => opt.classList.remove("active"));
  element.classList.add("active");
  AppState.currentDivisi = divisi;
  updatePreview();
};

window.logout = async function () {
  const confirmed = await confirmDialog(
    "Apakah Anda yakin ingin keluar dari sistem?",
    "Konfirmasi Logout",
    "warning",
  );
  if (confirmed) {
    localStorage.removeItem(CONFIG.STORAGE_KEYS.AUTH);
    location.reload();
  }
};

// ===== AUTHENTICATION =====
window.handleLogin = function (e) {
  e.preventDefault();
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  if (username === "irmas" && password === "falah2024") {
    localStorage.setItem(CONFIG.STORAGE_KEYS.AUTH, "true");
    renderDashboard();
    Toast.success("Login berhasil! Selamat datang di IRMAS Absensi.");
  } else {
    Toast.error("Username atau password salah! Coba lagi.");
  }
  return false;
};

window.togglePassword = function () {
  const passwordInput = document.getElementById("password");
  const icon = document.querySelector(".toggle-password i");
  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    icon.classList.replace("fa-eye", "fa-eye-slash");
  } else {
    passwordInput.type = "password";
    icon.classList.replace("fa-eye-slash", "fa-eye");
  }
};

// ===== RESET DATA =====
window.resetAllData = async function () {
  const confirmed = await confirmDialog(
    "PERINGATAN! Semua data absensi, peserta, catatan, dan pengumuman akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.",
    "Reset Semua Data",
    "danger",
  );

  if (confirmed) {
    localStorage.removeItem(CONFIG.STORAGE_KEYS.ABSENSI);
    localStorage.removeItem(CONFIG.STORAGE_KEYS.PESERTA);
    localStorage.removeItem(CONFIG.STORAGE_KEYS.ANNOUNCEMENT);
    localStorage.removeItem(CONFIG.STORAGE_KEYS.NOTES);
    loadStorage();
    updateAllDisplays();
    if (document.getElementById("notesAppContainer")) renderNotesApp();
    Toast.success("Semua data berhasil direset!");
  }
};

// Expose functions for global access
window.editAnnouncement = editAnnouncement;
window.showAnnouncementModal = showAnnouncementModal;
window.saveAnnouncementFromModal = saveAnnouncementFromModal;
window.exportToExcel = exportToExcel;
window.exportNotesToExcel = exportNotesToExcel;
window.saveAndGenerateNotePDF = saveAndGenerateNotePDF;
window.saveAndSendNoteWA = saveAndSendNoteWA;
window.viewNoteDetail = viewNoteDetail;
window.deleteNote = deleteNote;
window.exportAllNotesToPDF = exportAllNotesToPDF;
window.generatePDFFromNote = generatePDFFromNote;
window.sendNoteToWhatsApp = sendNoteToWhatsApp;

// ===== RENDER FUNCTIONS =====
function renderLoginPage() {
  document.getElementById("app").innerHTML = `
    <div class="login-container">
      <div class="login-card">
        <div class="login-logo">
          <i class="fas fa-mosque"></i>
          <h1>IRMAS Absensi Pro</h1>
          <p>Sistem dengan TTD, Notes, & Real-time Update</p>
        </div>
        <form onsubmit="return handleLogin(event)">
          <div class="input-group">
            <label><i class="fas fa-user"></i> Username</label>
            <input type="text" id="username" value="irmas" required>
          </div>
          <div class="input-group">
            <label><i class="fas fa-lock"></i> Password</label>
            <div class="password-container">
              <input type="password" id="password" value="falah2024" required>
              <button type="button" class="toggle-password" onclick="togglePassword()"><i class="fas fa-eye"></i></button>
            </div>
          </div>
          <div class="features">
            <div class="feature"><i class="fas fa-signature"></i><span>TTD Lengkap</span></div>
            <div class="feature"><i class="fas fa-chart-line"></i><span>Real-time Update</span></div>
            <div class="feature"><i class="fas fa-trophy"></i><span>Ranking Divisi</span></div>
            <div class="feature"><i class="fas fa-sticky-note"></i><span>Catatan Rapat</span></div>
            <div class="feature"><i class="fas fa-bullhorn"></i><span>Pengumuman</span></div>
            <div class="feature"><i class="fas fa-file-excel"></i><span>Export Excel</span></div>
          </div>
          <button type="submit" class="login-btn"><i class="fas fa-sign-in-alt"></i> MASUK KE SISTEM</button>
        </form>
        <div class="login-footer"><p class="dev-info">Sistem Absensi IRMAS Pro - Lengkap & Real-time</p></div>
      </div>
    </div>
  `;
}

function renderDashboard() {
  loadStorage();
  const today = new Date();
  const currentDate = formatDate(today);
  const currentTime = formatTime(today);
  const { ranking } = calculateDivisiStats();
  const topMembers = calculateTopMembers();

  document.getElementById("app").innerHTML = `
    <div class="dashboard">
      <nav class="navbar">
        <div class="nav-content">
          <div class="nav-brand">
            <i class="fas fa-mosque"></i>
            <div>
              <h1>IRMAS Absensi Pro</h1>
              <small>Real-time Update + Notes + TTD Lengkap</small>
            </div>
          </div>
          <div class="nav-stats" id="navStats">
            <span class="stat-badge"><i class="fas fa-trophy"></i> Top: ${ranking.length > 0 ? ranking[0].divisi : "-"}</span>
            <span class="stat-badge"><i class="fas fa-users"></i> ${AppState.absensiData.length} Data</span>
          </div>
          <button class="hamburger-btn" id="hamburgerBtn" onclick="toggleMenu()">
            <i class="fas fa-bars"></i>
          </button>
        </div>
      </nav>
      
      <div class="sidebar" id="sidebar">
        <div class="sidebar-header">
          <div class="user-avatar"><i class="fas fa-user-tie"></i></div>
          <div class="user-info">
            <h3>Admin IRMAS</h3>
            <p>${currentDate}</p>
            <small><i class="fas fa-bolt"></i> Data Update Real-time</small>
          </div>
        </div>
        <div class="sidebar-menu">
          <a href="#" class="menu-item active" data-section="dashboard" onclick="showSection('dashboard')"><i class="fas fa-home"></i><span>Dashboard</span></a>
          <a href="#" class="menu-item" data-section="individual" onclick="showSection('individual')"><i class="fas fa-user"></i><span>Absensi Individual</span></a>
          <a href="#" class="menu-item" data-section="group" onclick="showSection('group')"><i class="fas fa-users"></i><span>Kepanitiaan</span></a>
          <a href="#" class="menu-item" data-section="notes" onclick="showSection('notes')"><i class="fas fa-sticky-note"></i><span>Catatan Rapat</span><span class="menu-badge">${NotesState.notes.length}</span></a>
          <a href="#" class="menu-item" data-section="data" onclick="showSection('data')"><i class="fas fa-database"></i><span>Data & Laporan</span></a>
          <a href="#" class="menu-item" onclick="logout()"><i class="fas fa-sign-out-alt"></i><span>Keluar</span></a>
        </div>
      </div>
      <div class="sidebar-overlay" id="sidebarOverlay" onclick="closeMenu()"></div>
      
      <div class="main-content">
        <div id="announcementContainer"></div>
        
        <div class="welcome-card">
          <div class="welcome-text">
            <h2>Selamat Datang, Admin IRMAS!</h2>
            <p>Sistem Absensi dengan Update Real-time, Notes, & TTD Lengkap</p>
            <small><i class="fas fa-bolt"></i> Data update otomatis saat absensi!</small>
          </div>
          <div class="date-info">
            <div class="time" id="currentTime">${currentTime}</div>
            <div class="date" id="currentDate">${currentDate}</div>
          </div>
        </div>
        
        <!-- Dashboard Section -->
        <section id="dashboardSection" class="content-section active">
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-icon"><i class="fas fa-users"></i></div>
              <div class="stat-number" id="totalAbsensi">${AppState.absensiData.length}</div>
              <div class="stat-label">Total Absensi</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon"><i class="fas fa-user-friends"></i></div>
              <div class="stat-number" id="totalPeserta">${AppState.pesertaList.length}</div>
              <div class="stat-label">Total Peserta</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon"><i class="fas fa-calendar-day"></i></div>
              <div class="stat-number" id="todayCount">${AppState.absensiData.filter((item) => new Date(item.timestamp).toDateString() === new Date().toDateString()).length}</div>
              <div class="stat-label">Hari Ini</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon"><i class="fas fa-trophy"></i></div>
              <div class="stat-number" id="topDivisi">${ranking.length > 0 ? ranking[0].divisi : "-"}</div>
              <div class="stat-label">Divisi Terbaik</div>
            </div>
            <div class="stat-card top-member-card">
              <div class="stat-icon"><i class="fas fa-crown"></i></div>
              <div class="stat-number" id="topMemberCount">${topMembers.length > 0 ? topMembers[0].count : 0}</div>
              <div class="stat-label">Absensi Terbanyak</div>
              <div class="top-member-name" id="topMember">${topMembers.length > 0 ? topMembers[0].nama : "-"}</div>
              <div class="top-member-count">anggota terrajin</div>
            </div>
          </div>
          
          <div class="chart-container">
            <div class="chart-header"><h3><i class="fas fa-chart-bar"></i> Statistik Kehadiran per Divisi</h3></div>
            <div class="chart-wrapper"><canvas id="divisiChart"></canvas></div>
          </div>
          
          <div class="ranking-container">
            <div class="ranking-header"><h3><i class="fas fa-trophy"></i> Ranking Divisi</h3></div>
            <div class="ranking-list" id="rankingList"></div>
          </div>
          
          <div class="ranking-container">
            <div class="ranking-header"><h3><i class="fas fa-medal"></i> 5 Anggota Paling Rajin</h3></div>
            <div class="ranking-list" id="topMembersList"></div>
          </div>
          
          <div class="form-card">
            <div class="form-header"><i class="fas fa-history"></i><h3>Absensi Terbaru</h3></div>
            <div class="data-table-container">
              <table class="data-table">
                <thead><tr><th>Nama</th><th>Divisi</th><th>Kegiatan</th><th>Tanggal</th><th>Waktu</th><th>Mode</th></tr></thead>
                <tbody id="dataTableBody"></tbody>
               </table>
            </div>
          </div>
        </section>
        
        <!-- Individual Section -->
        <section id="individualSection" class="content-section">
          <div class="mode-selector">
            <button class="mode-btn active" onclick="selectMode('individual')"><i class="fas fa-user"></i> Mode Individual</button>
            <button class="mode-btn" onclick="selectMode('group')"><i class="fas fa-users"></i> Mode Kepanitiaan</button>
          </div>
          
          <div id="individualForm" class="mode-section form-card active">
            <div class="form-header"><i class="fas fa-user-check"></i><h3>Form Absensi Individual</h3><small><i class="fas fa-bolt"></i> Data masuk real-time</small></div>
            <form id="absensiForm" onsubmit="return submitAbsensiIndividual(event)">
              <div class="input-group"><label><i class="fas fa-user"></i> Nama Lengkap</label><input type="text" id="nama" placeholder="Masukkan nama lengkap" required></div>
              <div class="input-group"><label><i class="fas fa-users"></i> Pilih Divisi</label><div class="divisi-grid">${CONFIG.DIVISI_LIST.map((div, idx) => `<div class="divisi-option ${idx === 0 ? "active" : ""}" data-divisi="${div}" onclick="selectDivisi(this, '${div}')"><i class="fas ${getDivisiIcon(div)}"></i><span>${div}</span></div>`).join("")}</div></div>
              <div class="input-group"><label><i class="fas fa-tasks"></i> Kegiatan</label><input type="text" id="kegiatan" placeholder="Nama kegiatan yang dihadiri" required></div>
              <div class="input-group"><label><i class="fas fa-sticky-note"></i> Catatan (Opsional)</label><textarea id="catatan" placeholder="Tambahkan catatan jika perlu..." rows="3"></textarea></div>
              <div class="action-buttons">
                <button type="button" class="action-btn btn-pdf" onclick="generatePDFIndividual()"><i class="fas fa-file-pdf"></i> Download PDF + Simpan Data</button>
                <button type="submit" class="action-btn btn-whatsapp"><i class="fab fa-whatsapp"></i> Kirim WhatsApp + Simpan Data</button>
              </div>
            </form>
            <div class="preview-card">
              <div class="preview-header"><i class="fas fa-eye"></i><h4>Preview Pesan WhatsApp</h4></div>
              <div class="preview-content" id="previewMessage"></div>
            </div>
          </div>
        </section>
        
        <!-- Group Section -->
        <section id="groupSection" class="content-section">
          <div class="mode-selector">
            <button class="mode-btn" onclick="selectMode('individual')"><i class="fas fa-user"></i> Mode Individual</button>
            <button class="mode-btn active" onclick="selectMode('group')"><i class="fas fa-users"></i> Mode Kepanitiaan</button>
          </div>
          
          <div id="groupForm" class="mode-section form-card active">
            <div class="form-header"><i class="fas fa-users"></i><h3>Manajemen Kepanitiaan</h3><small><i class="fas fa-bolt"></i> Update real-time</small></div>
            
            <div class="peserta-section">
              <div class="section-title"><i class="fas fa-user-plus"></i><span>Tambah Anggota</span></div>
              <div class="quick-add-form">
                <div class="quick-add-grid">
                  <div class="input-group"><input type="text" id="namaPeserta" placeholder="Nama anggota"></div>
                  <div class="input-group"><select id="divisiPeserta">${CONFIG.DIVISI_LIST.map((div) => `<option value="${div}">${div}</option>`).join("")}</select></div>
                  <button type="button" onclick="tambahPeserta()" style="background: var(--primary); color: white; border: none; padding: 14px 20px; border-radius: 8px; cursor: pointer;"><i class="fas fa-plus"></i> Tambah</button>
                </div>
              </div>
            </div>
            
            <div class="peserta-section">
              <div class="section-title"><i class="fas fa-list"></i><span>Daftar Anggota (<span id="pesertaCount">${AppState.pesertaList.length}</span>)</span></div>
              <div id="pesertaList" class="peserta-list"></div>
            </div>
            
            <form id="absensiGroupForm" onsubmit="return submitAbsensiGroup(event)">
              <div class="input-group"><label><i class="fas fa-calendar"></i> Kegiatan Kepanitiaan</label><input type="text" id="kegiatanGroup" placeholder="Nama kegiatan kepanitiaan" required></div>
              <div class="input-group"><label><i class="fas fa-sticky-note"></i> Catatan</label><textarea id="catatanGroup" placeholder="Catatan untuk kegiatan..." rows="3"></textarea></div>
              <div class="peserta-section">
                <div class="section-title"><i class="fas fa-check-circle"></i><span>Daftar Hadir Hari Ini (<span id="absenCount">0</span>)</span></div>
                <div id="pesertaAbsenList" class="peserta-list"></div>
              </div>
              <div class="action-buttons">
                <button type="button" class="action-btn btn-pdf" onclick="generatePDFGroup()"><i class="fas fa-file-pdf"></i> PDF + Simpan Semua Data</button>
                <button type="submit" class="action-btn btn-whatsapp"><i class="fab fa-whatsapp"></i> WA Grup + Simpan Data</button>
              </div>
            </form>
          </div>
        </section>
        
        <!-- Notes Section -->
        <section id="notesSection" class="content-section">
          <div id="notesAppContainer"></div>
        </section>
        
        <!-- Data Section -->
        <section id="dataSection" class="content-section">
          <div class="form-card">
            <div class="form-header"><i class="fas fa-database"></i><h3>Data & Laporan</h3></div>
            <div class="stats-grid">
              <div class="stat-card"><div class="stat-icon"><i class="fas fa-database"></i></div><div class="stat-number">${AppState.absensiData.length}</div><div class="stat-label">Total Data Absensi</div></div>
              <div class="stat-card"><div class="stat-icon"><i class="fas fa-sticky-note"></i></div><div class="stat-number">${NotesState.notes.length}</div><div class="stat-label">Total Catatan</div></div>
              <div class="stat-card"><div class="stat-icon"><i class="fas fa-user-check"></i></div><div class="stat-number">${new Set(AppState.absensiData.map((d) => d.nama)).size}</div><div class="stat-label">Peserta Unik</div></div>
            </div>
            <div class="action-buttons">
              <button class="action-btn btn-report" onclick="generateLaporan()"><i class="fas fa-file-pdf"></i> Laporan Absensi PDF</button>
              <button class="action-btn btn-excel" onclick="exportToExcel()"><i class="fas fa-file-excel"></i> Export Absensi ke Excel</button>
              <button class="action-btn btn-excel" onclick="exportNotesToExcel()"><i class="fas fa-file-excel"></i> Export Catatan ke Excel</button>
              <button class="action-btn btn-danger" onclick="resetAllData()"><i class="fas fa-trash"></i> Reset Semua Data</button>
            </div>
          </div>
          
          <div class="form-card">
            <div class="form-header"><i class="fas fa-history"></i><h3>Riwayat Lengkap</h3><small>Total: ${AppState.absensiData.length} data</small></div>
            <div class="data-table-container">
              <table class="data-table" id="dataTableFull">
                <thead><tr><th>No</th><th>Nama</th><th>Divisi</th><th>Kegiatan</th><th>Tanggal</th><th>Waktu</th><th>Mode</th></tr></thead>
                <tbody></tbody>
               </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  `;
  initializeApp();
}

function initializeApp() {
  updateClock();
  setInterval(updateClock, 1000);
  setupEventListeners();
  showSection(AppState.activeSection);
  updateAllDisplays();
}

function updateClock() {
  const timeElement = document.getElementById("currentTime");
  const dateElement = document.getElementById("currentDate");
  if (timeElement) timeElement.textContent = formatTime();
  if (dateElement) dateElement.textContent = formatDate();
  updatePreview();
}

function setupEventListeners() {
  document.addEventListener("click", function (e) {
    if (e.target.closest(".divisi-option")) {
      const option = e.target.closest(".divisi-option");
      const divisi = option.dataset.divisi;
      selectDivisi(option, divisi);
    }
  });
  document.addEventListener("input", function (e) {
    if (e.target.matches("#nama, #kegiatan, #catatan")) updatePreview();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeMenu();
  });
}

// Start App
document.addEventListener("DOMContentLoaded", function () {
  const isLoggedIn = localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH) === "true";
  if (!isLoggedIn) renderLoginPage();
  else renderDashboard();
});
