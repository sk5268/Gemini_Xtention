// Settings page functionality
// Additional settings will be added here later

const DEFAULT_PROMPT = `Extract and present all information from the video without omitting any detail. Follow these instructions:

1. Go through the entire video thoroughly.
2. Capture and present everything spoken, including definitions, explanations, examples, references, and any background context.
3. Include any on-screen text, slides, charts, or visual elements — describe them clearly if relevant to understanding.
4. Maintain full detail; do not condense or summarize during the main extraction.
5. Organize the output into logical sections based on the flow of the video.
6. Translate any non-English words or phrases if they appear.
7. At the end, write a concise summary (up to 200 words) covering the core message and major takeaways.

Output format:


Title: <Insert video title here if available>

=== Summary ===
<200-word summary of the full video>

===============
Introduction
- ...

Section 1: <Descriptive title>
- ...

Section 2: <Descriptive title>
- ...

...

Conclusion
- ...
`;

document.addEventListener('DOMContentLoaded', function() {
    const promptTextarea = document.getElementById('prompt-textarea');
    const saveButton = document.getElementById('save-button');
    const resetButton = document.getElementById('reset-button');
    const statusMessage = document.getElementById('status-message');

    // Load saved prompt or use default
    browser.storage.sync.get(['customPrompt']).then((result) => {
        promptTextarea.value = result.customPrompt || DEFAULT_PROMPT;
        promptTextarea.placeholder = DEFAULT_PROMPT;
    });

    // Save custom prompt
    saveButton.addEventListener('click', function() {
        const customPrompt = promptTextarea.value.trim();
        
        browser.storage.sync.set({
            customPrompt: customPrompt
        }).then(() => {
            showStatusMessage('Prompt saved successfully!', 'success');
        }).catch((error) => {
            showStatusMessage('Error saving prompt: ' + error.message, 'error');
        });
    });

    // Reset to default prompt
    resetButton.addEventListener('click', function() {
        promptTextarea.value = DEFAULT_PROMPT;
        
        browser.storage.sync.remove(['customPrompt']).then(() => {
            showStatusMessage('Prompt reset to default!', 'success');
        }).catch((error) => {
            showStatusMessage('Error resetting prompt: ' + error.message, 'error');
        });
    });

    function showStatusMessage(message, type) {
        statusMessage.textContent = message;
        statusMessage.className = type;
        statusMessage.style.display = 'block';
        
        setTimeout(() => {
            statusMessage.style.display = 'none';
        }, 3000);
    }
});
