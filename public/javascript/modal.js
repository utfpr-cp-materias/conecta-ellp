document.addEventListener('DOMContentLoaded', () => {
  const registerModal = document.getElementById('register-modal');
  const openModalBtn = document.getElementById('open-modal-btn');
  // const closeModalBtn = document.getElementById('close-modal-btn');

  openModalBtn.addEventListener('click', () => {
    registerModal.showModal();
  });

  // closeModalBtn.addEventListener('click', () => {
  //   registerModal.close(); // Fecha o modal
  // });
});