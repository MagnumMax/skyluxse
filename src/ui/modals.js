const genericModal = document.getElementById('generic-modal');
const genericModalContent = document.getElementById('generic-modal-content');

export const openModal = (content) => {
    if (!genericModal || !genericModalContent) return;
    genericModalContent.innerHTML = content;
    genericModal.classList.replace('hidden', 'flex');
};
export const closeModal = () => {
    if (!genericModal) return;
    genericModal.classList.replace('flex', 'hidden');
};

const docViewer = document.getElementById('doc-viewer-modal');
export const openDocViewer = (url) => {
    if (!docViewer) return;
    const img = document.getElementById('doc-viewer-image');
    if (img) img.src = url;
    docViewer.classList.replace('hidden', 'flex');
};
export const closeDocViewer = () => {
    if (!docViewer) return;
    docViewer.classList.replace('flex', 'hidden');
};
