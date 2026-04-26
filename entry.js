// ========= CONFIG =========
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyBGdFc2n1Ogu-AQADw_03uSoNk-OSQltl5Z-zEgjRDCdwwLIioVerSmGgDlqZWO4qM/exec'; // <-- your deployed Apps Script Web App URL
const AUTO_SAVE_KEY = 'bcfl_savedProgress_v1';

// ========= DEADLINE ENFORCEMENT =========
const ENTRY_DEADLINE = new Date("2026-05-13T23:59:00Z");

function isPastDeadline() {
  const now = new Date();
  return now > ENTRY_DEADLINE;
}

function lockFormForDeadline() {
  const overlay = document.getElementById('deadline-closed-overlay');
  if (overlay) overlay.classList.remove('hidden');

  // Disable everything except viewing
  document.querySelectorAll('input, select, button, textarea').forEach(el => {
    el.disabled = true;
  });
}

// ========= DOM ELEMENTS =========
const form = document.getElementById('bcfl-form');
const steps = Array.from(document.querySelectorAll('.step'));
const backBtn = document.getElementById('backBtn');
const nextBtn = document.getElementById('nextBtn');
const statusEl = document.getElementById('status');
const stepLabel = document.getElementById('step-label');
const tokenInput = document.getElementById('token');

const emailInput = document.getElementById('email');
const igInput = document.getElementById('instagramHandle');
const leaderboardInput = document.getElementById('leaderboardName');

const femaleBestInput = document.getElementById('femaleBest');
const maleBestInput = document.getElementById('maleBest');
const femaleBestList = document.getElementById('femaleBestList');
const maleBestList = document.getElementById('maleBestList');

// Save / Clear buttons (must exist in HTML)
const saveBtn = document.getElementById('saveProgressBtn');
const clearBtn = document.getElementById('clearFormBtn');

// All confidence selects (now all live on Step 4 page)
const confSelects = Array.from(document.querySelectorAll('.conf-select'));

// Class IDs (for looping)
const femaleClasses = ['43w', '47w','52w','57w','63w','69w','76w','84w','84pw'];
const maleClasses   = ['59m','66m','74m','83m','93m','105m','120m','120pm'];

// Meta for confidence labels
const classMeta = {
  '43w':  { labelPrefix: '43 kg Predicted Winner' },
  '47w':  { labelPrefix: '47 kg Predicted Winner' },
  '52w':  { labelPrefix: '52 kg Predicted Winner' },
  '57w':  { labelPrefix: '57 kg Predicted Winner' },
  '63w':  { labelPrefix: '63 kg Predicted Winner' },
  '69w':  { labelPrefix: '69 kg Predicted Winner' },
  '76w':  { labelPrefix: '76 kg Predicted Winner' },
  '84w':  { labelPrefix: '84 kg Predicted Winner' },
  '84pw': { labelPrefix: '84+ kg Predicted Winner' },

  '53m':   { labelPrefix: '53 kg Predicted Winner' },
  '59m':   { labelPrefix: '59 kg Predicted Winner' },
  '66m':   { labelPrefix: '66 kg Predicted Winner' },
  '74m':   { labelPrefix: '74 kg Predicted Winner' },
  '83m':   { labelPrefix: '83 kg Predicted Winner' },
  '93m':   { labelPrefix: '93 kg Predicted Winner' },
  '105m':  { labelPrefix: '105 kg Predicted Winner' },
  '120m':  { labelPrefix: '120 kg Predicted Winner' },
  '120pm': { labelPrefix: '120+ kg Predicted Winner' }
};

// ========= STATE =========
let currentStep = 0;
let autoSaveIntervalId = null;
let editingToken = null;

// ========= SCROLL HELPERS =========

function scrollToFormTop() {
  const formContainer = document.getElementById('form-container');
  if (formContainer) {
    const rect = formContainer.getBoundingClientRect();
    const targetY = rect.top + window.pageYOffset - 16; // small margin
    window.scrollTo({ top: targetY, behavior: 'smooth' });
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function scrollToFirstErrorInStep(stepIndex) {
  const stepEl = steps[stepIndex];
  if (!stepEl) return;

  const errorEls = Array.from(
    stepEl.querySelectorAll('[id$="Error"]')
  ).filter(el => el.textContent.trim() !== '');

  if (errorEls.length === 0) return;

  const firstError = errorEls[0];
  const rect = firstError.getBoundingClientRect();
  const targetY = rect.top + window.pageYOffset - 80;
  window.scrollTo({ top: targetY, behavior: 'smooth' });
}

// ========= UTILS =========
function showStep(index) {
  steps.forEach((step, i) => {
    step.style.display = i === index ? 'block' : 'none';
  });

  currentStep = index;
  backBtn.style.visibility = index === 0 ? 'hidden' : 'visible';

  if (index === steps.length - 1) {
    nextBtn.textContent = 'Submit';
  } else {
    nextBtn.textContent = 'Next';
  }

  const labels = [
    'Step 1 of 5 – Contact',
    'Step 2 of 5 – Women’s Predictions',
    'Step 3 of 5 – Men’s Predictions',
    'Step 4 of 5 – Confidence Ratings',
    'Step 5 of 5 – Best Lifters'
  ];
  stepLabel.textContent = labels[index] || '';

  positionUtilityButtons();

  // Show Save/Clear on Steps 0–3; hide on final step (4)
  if (saveBtn && clearBtn) {
    if (index === steps.length - 1) {
      saveBtn.classList.add('hidden');
      clearBtn.classList.add('hidden');
    } else {
      saveBtn.classList.remove('hidden');
      clearBtn.classList.remove('hidden');
    }
  }
}

function showStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.className = 'text-sm mt-1 ' + (isError ? 'text-red-400' : 'text-green-400');
}

function clearErrors() {
  document.querySelectorAll('[id$="Error"]').forEach(el => {
    el.textContent = '';
  });
}

function setError(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}

// ========= CONFIDENCE LABELS (Step 4) =========

function updateConfidenceLabels() {
  const allClasses = [...femaleClasses, ...maleClasses];

  allClasses.forEach(cls => {
    const meta = classMeta[cls];
    const labelEl = document.getElementById('confLabel_' + cls);
    if (!meta || !labelEl) return;

    const wSel = document.getElementById('w' + cls);
    const winner = wSel && wSel.value ? wSel.value : '';

    if (!winner) {
      labelEl.textContent = `Your ${meta.labelPrefix} — no winner selected yet.`;
      return;
    }

    // Remove nominated totals e.g. "(707.5 kg)"
    const cleanName = winner.replace(/\s*\([\d\.]+\s*kg\)/i, '').trim();

    labelEl.textContent = `Your ${meta.labelPrefix} — ${cleanName}`;
  });
}

// ========= CONFIDENCE RATING LOGIC =========

function setDefaultConfidenceValues() {
  const defaults = {
    c43w: 1,
    c47w: 2,
    c53m: 3
  };

  Object.entries(defaults).forEach(([name, value]) => {
    const input = document.querySelector(`[name="${name}"]`);
    if (input && !input.value) {
      input.value = value;
    }
  });
}

function initConfidenceOptions() {
  confSelects.forEach(sel => {
    sel.innerHTML = '';

    // Placeholder
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Select rating…';
    sel.appendChild(placeholder);

    // Ratings 1–18
    for (let i = 1; i <= 18; i++) {
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = String(i);
      sel.appendChild(opt);
    }

    // CLEAR ALL OPTION — global
    const clearOpt = document.createElement('option');
    clearOpt.value = 'CLEAR_ALL';
    clearOpt.textContent = '⚠️ Clear ALL confidence ratings';
    clearOpt.classList.add('text-red-400', 'font-semibold');
    sel.appendChild(clearOpt);
  });
}

function refreshConfidenceDisables() {
  const used = new Set(
    confSelects
      .map(sel => sel.value)
      .filter(v => v !== '' && v !== 'CLEAR_ALL')
  );

  confSelects.forEach(sel => {
    const current = sel.value;
    Array.from(sel.options).forEach(opt => {
      if (!opt.value || opt.value === 'CLEAR_ALL') return; // skip placeholder + clear
      opt.disabled = used.has(opt.value) && opt.value !== current;
    });
  });
}

// ========= CLEAR CONFIDENCE RATINGS =========

confSelects.forEach(sel => {
  sel.addEventListener('change', () => {
    if (sel.value === 'CLEAR_ALL') {
      const ok = window.confirm(
        'Are you sure you want to clear ALL confidence ratings for ALL weight classes?'
      );

      if (!ok) {
        sel.value = '';
        return;
      }

      const allClasses = [...femaleClasses, ...maleClasses];

      // Clear all confidence selects across men and women
      allClasses.forEach(cls => {
        const cSel = document.getElementById('c' + cls);
        if (cSel) {
          cSel.value = '';
        }
      });

      refreshConfidenceDisables();
      showStatus('All confidence ratings have been reset. Please reassign 1–16.', false);
      sel.value = '';
      return;
    }

    // Normal rating selection -> refresh disables
    refreshConfidenceDisables();
  });
});

// ========= BEST LIFTER LISTS =========

function buildBestLifterLists() {
  // Collect options from all female and male class winner dropdowns
  const femaleOptions = new Set();
  const maleOptions = new Set();

  femaleClasses.forEach(cls => {
    const sel = document.getElementById('w' + cls);
    if (sel) {
      Array.from(sel.options).forEach(opt => {
        if (opt.value) femaleOptions.add(opt.textContent);
      });
    }
  });

  maleClasses.forEach(cls => {
    const sel = document.getElementById('w' + cls);
    if (sel) {
      Array.from(sel.options).forEach(opt => {
        if (opt.value) maleOptions.add(opt.textContent);
      });
    }
  });

  femaleBestList.innerHTML = '';
  femaleOptions.forEach(name => {
    const option = document.createElement('option');
    option.value = name;
    femaleBestList.appendChild(option);
  });

  maleBestList.innerHTML = '';
  maleOptions.forEach(name => {
    const option = document.createElement('option');
    option.value = name;
    maleBestList.appendChild(option);
  });
}

// ========= VALIDATION =========

const totalRegex = /^(?:[0-9]|[1-9][0-9]{1,2}|1[0-9]{3}|2000)(?:\.0|\.5)?$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateStep(stepIndex) {
  clearErrors();
  let valid = true;

  if (stepIndex === 0) {
    const emailVal = emailInput.value.trim();
    if (!emailVal) {
      setError('emailError', 'Email is required.');
      valid = false;
    } else if (!emailRegex.test(emailVal)) {
      setError('emailError', 'Please enter a valid email address.');
      valid = false;
    }
    if (!leaderboardInput.value.trim()) {
      setError('leaderboardError', 'Leaderboard name is required.');
      valid = false;
    }
  }

  if (stepIndex === 1) {
    // Women – winners & totals required (confidence is on Step 4 now)
    femaleClasses.forEach(cls => {
      const wSel = document.getElementById('w' + cls);
      const tInput = document.getElementById('t' + cls);

      if (!wSel.value) {
        setError('w' + cls + 'Error', 'Please pick a winner.');
        valid = false;
      }

      const v = tInput.value.trim();
      if (v !== '' && !totalRegex.test(v)) {
        setError('t' + cls + 'Error', 'Use 0–2000 in steps of 0.5 (e.g. 865 or 865.5).');
        valid = false;
      }
    });
  }

  if (stepIndex === 2) {
    // Men – winners & totals required (confidence is on Step 4 now)
    maleClasses.forEach(cls => {
      const wSel = document.getElementById('w' + cls);
      const tInput = document.getElementById('t' + cls);

      if (!wSel.value) {
        setError('w' + cls + 'Error', 'Please pick a winner.');
        valid = false;
      }

      const v = tInput.value.trim();
      if (v !== '' && !totalRegex.test(v)) {
        setError('t' + cls + 'Error', 'Use 0–2000 in steps of 0.5 (e.g. 865 or 865.5).');
        valid = false;
      }
    });
  }

  if (stepIndex === 3) {
    // Confidence Ratings – all 18 must be filled and 1–18 used exactly once
    const allClasses = [...femaleClasses, ...maleClasses];

    allClasses.forEach(cls => {
      const cSel = document.getElementById('c' + cls);
      if (!cSel || !cSel.value || cSel.value === 'CLEAR_ALL') {
        setError('c' + cls + 'Error', 'Please choose a confidence rating.');
        valid = false;
      }
    });

    const allValues = allClasses
      .map(cls => {
        const cSel = document.getElementById('c' + cls);
        return cSel ? cSel.value : '';
      })
      .filter(v => v !== '' && v !== 'CLEAR_ALL');

    const unique = new Set(allValues);
    if (allValues.length !== 18 || unique.size !== 18) {
      showStatus('Each confidence rating 1–18 must be used exactly once across all weight classes.', true);
      valid = false;
    }
  }

  if (stepIndex === 4) {
    // Best Lifters
    const femaleInput = document.getElementById('femaleBest');
    const maleInput   = document.getElementById('maleBest');

    const femaleOptions = [...document.querySelectorAll('#femaleBestList option')]
      .map(o => o.value.trim().toLowerCase());

    const maleOptions = [...document.querySelectorAll('#maleBestList option')]
      .map(o => o.value.trim().toLowerCase());

    const femaleVal = femaleInput.value.trim().toLowerCase();
    const maleVal   = maleInput.value.trim().toLowerCase();

    if (!femaleOptions.includes(femaleVal)) {
      document.getElementById('femaleBestError').textContent =
        'Please select a lifter from the list.';
      valid = false;
    }

    if (!maleOptions.includes(maleVal)) {
      document.getElementById('maleBestError').textContent =
        'Please select a lifter from the list.';
      valid = false;
    }
  }

  return valid;
}

// ========= SAVE / RESTORE PROGRESS =========

function collectFormState() {
  const data = {};
  if (!form) return data;

  const fd = new FormData(form);
  fd.forEach((value, key) => {
    data[key] = value;
  });

  data.currentStep = currentStep;
  return data;
}

function applyFormState(state) {
  if (!state) return;

  // Restore all named fields except currentStep
  Object.keys(state).forEach(key => {
    if (key === 'currentStep') return;
    const el = form.querySelector(`[name="${key}"]`);
    if (!el) return;

    if (el.type === 'checkbox' || el.type === 'radio') {
      el.checked = state[key] === el.value;
    } else {
      el.value = state[key];
    }
  });

  // Clamp step between 0 and last
  let savedStep = typeof state.currentStep === 'number' ? state.currentStep : 0;
  if (isNaN(savedStep)) savedStep = 0;
  savedStep = Math.max(0, Math.min(savedStep, steps.length - 1));

  showStep(savedStep);
  refreshConfidenceDisables();
  updateConfidenceLabels();
}

function saveProgress(showMessage = true, isAuto = false) {
  if (!form) return;

  const emailVal = emailInput.value.trim();
  if (!emailVal) {
    if (!isAuto && showMessage) {
      showStatus('Add your email before saving progress.', true);
    }
    return;
  }

  const state = collectFormState();
  try {
    localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(state));
  } catch (e) {
    if (!isAuto && showMessage) {
      showStatus('Unable to save progress (storage error).', true);
    }
    return;
  }

  if (!showMessage) return;

  if (isAuto) {
    statusEl.textContent = 'Auto-saved';
    statusEl.className = 'text-xs mt-1 text-gray-400';
  } else {
    showStatus('Progress saved.', false);
  }

  setTimeout(() => {
    if (statusEl.textContent === 'Auto-saved' || statusEl.textContent === 'Progress saved.') {
      statusEl.textContent = '';
    }
  }, 3000);
}

function restoreSavedProgressIfAny() {
  const raw = localStorage.getItem(AUTO_SAVE_KEY);
  if (!raw) return false;

  let state;
  try {
    state = JSON.parse(raw);
  } catch (e) {
    return false;
  }

  applyFormState(state);
  showStatus('Restored your saved progress.', false);
  return true;
}

function clearFormAll() {
  const ok = window.confirm('Are you sure you want to clear all form progress?');
  if (!ok) return;

  const existingToken = tokenInput.value;

  form.reset();

  // Preserve token if user is editing via private link
  tokenInput.value = existingToken;

  // Re-init confidence & labels
  initConfidenceOptions();
  refreshConfidenceDisables();
  updateConfidenceLabels();

  // Reset step to first
  showStep(0);
  scrollToFormTop();

  // Clear saved progress
  localStorage.removeItem(AUTO_SAVE_KEY);

  // Stop auto-save if running
  if (autoSaveIntervalId) {
    clearInterval(autoSaveIntervalId);
    autoSaveIntervalId = null;
  }

  showStatus('Form cleared. You can start again.', false);
}

// ========= AUTO-SAVE =========

function startAutoSave() {
  if (autoSaveIntervalId) return;
  if (!emailInput.value.trim()) return;

  autoSaveIntervalId = setInterval(() => {
    saveProgress(true, true); // with subtle message
  }, 30000);
}

// ========= DUPLICATE EMAIL HELPERS =========

// Assumes backend supports ?action=checkEmail&email=...
async function checkEmailExists(email) {
  const res = await fetch(
    SCRIPT_URL + '?action=checkEmail&email=' + encodeURIComponent(email),
    { method: 'GET' }
  );
  const json = await res.json();
  if (!json.ok) {
    throw new Error(json.message || 'Could not check email.');
  }
  // Expecting { ok:true, exists:true/false }
  return !!json.exists;
}

// Assumes backend supports ?action=sendLink&email=...
async function sendEditLink(email) {
  const res = await fetch(
    SCRIPT_URL + '?action=sendLink&email=' + encodeURIComponent(email),
    { method: 'GET' }
  );
  const json = await res.json();

  if (!json.ok) {
    // Show message but don't blow up JS
    showStatus(json.message || 'Could not send your private link. Please try again later.', true);
    return false;
  }

  // Optionally show a success message here, but main one is set in caller
  return true;
}

// ========= PREFILL LOGIC =========

async function prefillIfToken() {
  const params = new URLSearchParams(window.location.search);
  const existingToken = params.get('token');

  if (!existingToken) {
    // Still want labels based on default (blank) winners/totals
    updateConfidenceLabels();
    return;
  }

  // Put token into hidden input so submit will update same row
  tokenInput.value = existingToken;

  try {
    showStatus('Loading your saved entry…', false);
    const res = await fetch(
      SCRIPT_URL + '?action=prefill&token=' + encodeURIComponent(existingToken),
      { method: 'GET' }
    );
    const json = await res.json();
    if (!json.ok) {
      showStatus(json.message || 'Could not load previous entry.', true);
      updateConfidenceLabels();
      return;
    }
    const d = json.data || {};

    // Contact
    if (d.email)           emailInput.value = d.email;
    if (d.instagramHandle) igInput.value = d.instagramHandle;
    if (d.leaderboardName) leaderboardInput.value = d.leaderboardName;

    // 🔒 When editing via token, lock the email field
    emailInput.readOnly = true;
    emailInput.classList.add('bg-gray-700', 'cursor-not-allowed');

    // Winners – Women
    femaleClasses.forEach(cls => {
      const wSel = document.getElementById('w' + cls);
      const tInput = document.getElementById('t' + cls);
      const cSel  = document.getElementById('c' + cls);

      const wKey = 'w' + cls;
      const tKey = 't' + cls;
      const cKey = 'c' + cls;

      if (d[wKey] && wSel)   wSel.value = d[wKey];
      if (d[tKey] && tInput) tInput.value = d[tKey];
      if (d[cKey] && cSel)   cSel.value = String(d[cKey]);
    });

    // Winners – Men
    maleClasses.forEach(cls => {
      const wSel = document.getElementById('w' + cls);
      const tInput = document.getElementById('t' + cls);
      const cSel  = document.getElementById('c' + cls);

      const wKey = 'w' + cls;
      const tKey = 't' + cls;
      const cKey = 'c' + cls;

      if (d[wKey] && wSel)   wSel.value = d[wKey];
      if (d[tKey] && tInput) tInput.value = d[tKey];
      if (d[cKey] && cSel)   cSel.value = String(d[cKey]);
    });

    // Best lifters
    if (d.femaleBest) femaleBestInput.value = d.femaleBest;
    if (d.maleBest)   maleBestInput.value   = d.maleBest;

    // After setting confidence values, refresh disables and labels
    refreshConfidenceDisables();
    updateConfidenceLabels();

    showStatus('Your previous entry has been loaded. You can edit and resubmit.', false);
  } catch (err) {
    showStatus('Error loading previous entry. You can still submit a new one.', true);
    updateConfidenceLabels();
  }
}

// ========= SUBMIT =========

async function submitForm() {
  clearErrors();
  showStatus('');

  // Normalise email
  emailInput.value = emailInput.value.trim().toLowerCase();

  // Validate ALL steps before submitting
  for (let s = 0; s < steps.length; s++) {
    if (!validateStep(s)) {
      showStep(s);
      // Wait a tiny moment for DOM to show correct step then scroll to first error
      setTimeout(() => scrollToFirstErrorInStep(s), 50);
      return;
    }
  }

  showStatus('Submitting your entry…', false);
  nextBtn.disabled = true;
  backBtn.disabled = true;

  try {
    const formData = new FormData(form);
    const res = await fetch(SCRIPT_URL, {
      method: 'POST',
      body: formData
    });

    const json = await res.json();

    if (!json.ok) {
      showStatus(json.message || 'There was an error saving your entry.', true);
      nextBtn.disabled = false;
      backBtn.disabled = false;
      return;
    }

    // Success message
    showStatus(json.message || 'Entry saved. Check your email for confirmation and your edit link.', false);

    // === SHOW EDIT LINK ON PAGE ===
    if (json.ok && json.token) {
      const editLink = `https://solacestrength.github.io/britishclassicfl/entry.html?token=${encodeURIComponent(json.token)}`;
      const linkBox = document.getElementById('edit-link-box');

      if (linkBox) {
        linkBox.innerHTML = `
          <div class="p-4 mt-4 rounded-lg bg-gray-800 border border-gray-700 text-center text-sm text-gray-200">
              <p class="font-semibold mb-2">Your private edit link:</p>
              <a href="${editLink}" class="text-blue-400 break-all" target="_blank">${editLink}</a>
              <p class="text-gray-400 mt-2">(This has also been emailed to you.)</p>
          </div>
        `;
      }
    }

    // On successful submit, you *could* clear saved progress
    // but I'll leave it intact in case they want to tweak again.
  } catch (err) {
    showStatus('Network or server error. Please try again.', true);
  }

  nextBtn.disabled = false;
  backBtn.disabled = false;
}

// ========= NAVIGATION HANDLERS =========

function positionUtilityButtons() {
  const clearBtns = document.querySelectorAll('.clearFormBtn');
  const saveBtns  = document.querySelectorAll('.saveProgressBtn');

  // Hide all by default
  clearBtns.forEach(btn => btn.classList.add('hidden'));
  saveBtns.forEach(btn => btn.classList.add('hidden'));

  // Step 4 is the last step with save/clear — DON’T show on Step 5
  if (currentStep === 4) return;

  // Show buttons for Steps 1–4
  const clear = document.querySelector(`.clearFormBtn[data-step="${currentStep}"]`);
  const save  = document.querySelector(`.saveProgressBtn[data-step="${currentStep}"]`);

  if (clear) clear.classList.remove('hidden');
  if (save)  save.classList.remove('hidden');
}

backBtn.addEventListener('click', () => {
  if (currentStep > 0) {
    showStep(currentStep - 1);
    scrollToFormTop();
  }
});

nextBtn.addEventListener('click', async () => {
  // Not on last step yet
  if (currentStep < steps.length - 1) {
    // Local validation for current step
    if (!validateStep(currentStep)) {
      scrollToFirstErrorInStep(currentStep);
      return;
    }

    // Special handling on Step 0 for duplicate emails
    if (currentStep === 0) {
      const emailVal = emailInput.value.trim().toLowerCase();
      const tokenVal = tokenInput.value.trim();

      // Only check for duplicates if this is NOT an edit via token
      if (emailVal && !tokenVal) {
        try {
          showStatus('Checking email…', false);
          nextBtn.disabled = true;
          backBtn.disabled = true;

          const exists = await checkEmailExists(emailVal);

          if (exists) {
            // Popup: send link or cancel
            const wantLink = window.confirm(
              'An entry with this email address already exists.\n\n' +
              'Press OK to send your private edit link to this email so you can edit your existing entry.\n' +
              'Press Cancel to change the email address.'
            );

            if (wantLink) {
              const sentOk = await sendEditLink(emailVal);
              if (sentOk) {
                showStatus('Your private edit link has been emailed to you. Please use that link to update your entry.', false);
              }
            } else {
              showStatus('Please enter a different email address to create a new entry.', true);
            }

            nextBtn.disabled = false;
            backBtn.disabled = false;
            // 🔒 Do NOT advance in either case
            return;
          }

          // If no existing entry, clear any "checking" status
          showStatus('', false);
          nextBtn.disabled = false;
          backBtn.disabled = false;

        } catch (err) {
          showStatus('Could not check this email right now. Please try again.', true);
          nextBtn.disabled = false;
          backBtn.disabled = false;
          return;
        }
      }

      // Start auto-save once Step 0 is valid and email is set
      startAutoSave();
    }

    // If we reach here, it's safe to advance
    showStep(currentStep + 1);
    scrollToFormTop();
  } else {
    // Last step -> submit
    submitForm();
  }
});

// ========= INIT =========

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  editingToken = params.get('token');

  const hasSavedProgress = !!localStorage.getItem(AUTO_SAVE_KEY);

  // If editing via private link OR returning with saved progress → bypass Spotify gate
  if (editingToken || hasSavedProgress) {
    sessionStorage.setItem('spotifyPassed', '1');
    const spotifyLock = document.getElementById('spotify-lock');
    if (spotifyLock) spotifyLock.classList.add('hidden');
  }

    // 🔒 Hard deadline enforcement + bypass Spotify gate
  if (isPastDeadline()) {
    // Bypass Spotify lock automatically
    sessionStorage.setItem('spotifyPassed', '1');
    const spotifyLock = document.getElementById('spotify-lock');
    if (spotifyLock) spotifyLock.classList.add('hidden');

    // Fully lock the form
    lockFormForDeadline();
    return;
  }

  initConfidenceOptions();
  buildBestLifterLists();
  showStep(0);

  setDefaultConfidenceValues();

  // Wire up live updates for confidence labels
  const allClasses = [...femaleClasses, ...maleClasses];
  allClasses.forEach(cls => {
    const wSel = document.getElementById('w' + cls);
    const tInput = document.getElementById('t' + cls);

    if (wSel) {
      wSel.addEventListener('change', updateConfidenceLabels);
    }
    if (tInput) {
      tInput.addEventListener('input', updateConfidenceLabels);
    }
  });

  // Hook up Save / Clear buttons
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      saveProgress(true, false);
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', clearFormAll);
  }

  // If NOT editing via token, restore saved progress if available
  if (!editingToken && hasSavedProgress) {
    restoreSavedProgressIfAny();
  }

  // Prefill from token if present (will also update labels)
  await prefillIfToken();

  // Ensure labels are correct at start
  updateConfidenceLabels();

  // If email already present (from saved progress or token), start auto-save
  if (emailInput.value.trim()) {
    startAutoSave();
  }
});
