function openIncompleteTeachersModal() {
  const modal = document.getElementById('incompleteTeachersModal');
  if (modal) modal.classList.remove('hidden');
}

function closeIncompleteTeachersModal() {
  const modal = document.getElementById('incompleteTeachersModal');
  if (modal) modal.classList.add('hidden');
}

function sendReminder(teacherName) {
  showToast(`Notifikasi peringatan dihantar kepada ${teacherName}!`, '🔔');
}

function sendReminderAll() {
  showToast('Peringatan pukal dihantar kepada semua guru yang terlibat!', '📢');
  closeIncompleteTeachersModal();
}

function openReviewModal(rphId) {
  const modal = document.getElementById('reviewModal');
  if (modal) modal.classList.remove('hidden');
}

function closeReviewModal() {
  const modal = document.getElementById('reviewModal');
  if (modal) modal.classList.add('hidden');
}

function saveApprovalAction() {
  closeReviewModal();
  showToast('Pengesahan & Cop Digital e-RPH Berjaya Disimpan!', '✅');
}

function approveAllPending() {
  showToast('Semua e-RPH telah disahkan secara pukal!', '🎉');
}

function filterApprovalQueue(type) {
  showToast(`Filter Pentadbir: ${type}`, '🔍');
}

function toggleNotificationModal() {
  showToast('Notifikasi: Tiada teguran baharu daripada pentadbir.', '🔔');
}