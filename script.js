// --- PARTIE 1 : IMPORTATION PDF ---
const pdfInput = document.getElementById('pdf-file');
const courseTextArea = document.getElementById('course-text');
const pdfStatus = document.getElementById('pdf-status');

if (pdfInput) {
    pdfInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        pdfStatus.innerText = "⏳ Lecture du PDF en cours...";
        courseTextArea.value = "";

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let fullText = "";

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(" ");
                fullText += pageText + "\n";
            }

            if (fullText.trim().length > 0) {
                courseTextArea.value = fullText;
                pdfStatus.innerText = "✅ PDF chargé !";
            } else {
                pdfStatus.innerText = "⚠️ PDF vide ou illisible.";
            }

        } catch (error) {
            console.error("Erreur PDF:", error);
            pdfStatus.innerText = "❌ Erreur lecture PDF.";
        }
    });
}

// --- PARTIE 2 : GÉNÉRATION IA ---
document.getElementById('generate-btn').addEventListener('click', async () => {
    const currentText = courseTextArea.value;
    const summaryDisplay = document.getElementById('summary-display');
    const flashcardsContainer = document.getElementById('flashcards-
