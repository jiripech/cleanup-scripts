const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function automateCMP() {
  let hasNextPage = true;
  let pageCount = 1;

  while (hasNextPage) {
    console.log(`Clearing page ${pageCount}...`);

    // 1. Uncheck everything labeled "Legitimate Interest"
    document.querySelectorAll('label.fast-cmp-input').forEach(label => {
      const p = label.querySelector('p');
      const input = label.querySelector('input[type="checkbox"]');
      const span = label.querySelector('span[role="checkbox"]');

      if (p && p.textContent.includes('Legitimate Interest')) {
        // Check both the input state and the ARIA state of the custom span
        const isChecked = (input && input.checked) ||
                          (span && span.getAttribute('aria-checked') === 'true');
        if (isChecked) {
          // Clicking the input or span usually triggers the framework's toggle logic
          (span || input).click();
        }
      }
    });

    // 2. Try to find the "Next" button
    const buttons = Array.from(document.querySelectorAll('button.fast-cmp-button-secondary'));
    const nextButton = buttons.find(btn => btn.textContent.trim() === 'Next');

    // 3. If Next exists and is visible, click it and loop
    if (nextButton && nextButton.offsetParent !== null) {
      nextButton.click();
      pageCount++;
      await wait(600); // Slight delay for the DOM to swap content
    } else {
      hasNextPage = false;
    }
  }

  // 4. Final Boss: The Save & Close button
  console.log('All pages cleared. Saving...');
  const saveButton = document.querySelector('button.fast-cmp-button-primary[value="save"]');

  if (saveButton) {
    saveButton.click();
    console.log('Preferences saved! Goodbye, CMP.');
  } else {
    console.warn('Could not find the Save button. You might need to click it manually.');
  }
}

// Run the automation
automateCMP();
