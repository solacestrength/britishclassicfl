// ========= CONFIG =========
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzYY2tz3Lj05YrNlhWjgWZ_e5nUqjQ0wPdbpQEiSOVP4JAWpYjkCbUPfZQUTNI_te-rVA/exec';
const AUTO_SAVE_KEY = 'bcfl_subjr26_savedProgress_v1';

// ========= DEADLINE ENFORCEMENT =========
const ENTRY_DEADLINE = new Date("2026-05-13T23:59:00Z");

function isPastDeadline() {
  return new Date() > ENTRY_DEADLINE;
}

function lockFormForDeadline() {
  const overlay = document.getElementById('deadline-closed-overlay');
  if (overlay) overlay.classList.remove('hidden');

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
const divisionInput = document.getElementById('division');

const emailInput = document.getElementById('email');
const igInput = document.getElementById('instagramHandle');
const leaderboardInput = document.getElementById('leaderboardName');

const femaleBestInput = document.getElementById('femaleBest');
const maleBestInput = document.getElementById('maleBest');
const femaleBestList = document.getElementById('femaleBestList');
const maleBestList = document.getElementById('maleBestList');

const saveBtn = document.getElementById('saveProgressBtn');
const clearBtn = document.getElementById('clearFormBtn');

const confSelects = Array.from(document.querySelectorAll('.conf-select'));

// ========= CLASS SETUP =========
const femaleClassesBase = ['43w', '47w', '52w', '57w', '63w', '69w', '76w', '84w', '84pw'];
const maleClassesBase = ['53m', '59m', '66m', '74m', '83m', '93m', '105m', '120m', '120pm'];

function exists(id) {
  return !!document.getElementById(id);
}

function activeFemaleClasses() {
  return femaleClassesBase.filter(cls => exists('w' + cls));
}

function activeMaleClasses() {
  return maleClassesBase.filter(cls => exists('w' + cls));
}

function activeAllClasses() {
  return [...activeFemaleClasses(), ...activeMaleClasses()];
}

function activeConfidenceClasses() {
  return activeAllClasses().filter(cls => exists('c' + cls));
}

const classMeta = {
  '43w': { labelPrefix: '43 kg Predicted Winner' },
  '47w': { labelPrefix: '47 kg Predicted Winner' },
  '52w': { labelPrefix: '52 kg Predicted Winner' },
  '57w': { labelPrefix: '57 kg Predicted Winner' },
  '63w': { labelPrefix: '63 kg Predicted Winner' },
  '69w': { labelPrefix: '69 kg Predicted Winner' },
  '76w': { labelPrefix: '76 kg Predicted Winner' },
  '84w': { labelPrefix: '84 kg Predicted Winner' },
  '84pw': { labelPrefix: '84+ kg Predicted Winner' },

  '53m': { labelPrefix: '53 kg Predicted Winner' },
  '59m': { labelPrefix: '59 kg Predicted Winner' },
  '66m': { labelPrefix: '66 kg Predicted Winner' },
  '74m': { labelPrefix: '74 kg Predicted Winner' },
  '83m': { labelPrefix: '83 kg Predicted Winner' },
  '93m': { labelPrefix: '93 kg Predicted Winner' },
  '105m': { labelPrefix: '105 kg Predicted Winner' },
  '120m': { labelPrefix: '120 kg Predicted Winner' },
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
    const targetY = rect.top + window.pageYOffset - 16;
    window.scrollTo({ top: targetY, behavior: 'smooth' });
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function scrollToFirstErrorInStep(stepIndex) {
  const stepEl = steps[stepIndex];
  if (!stepEl) return;

  const errorEls = Array.from(stepEl.querySelectorAll('[id$="Error"]'))
    .filter(el => el.textContent.trim() !== '');

  if (!errorEls.length) return;

  const rect = errorEls[0].getBoundingClientRect();
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
  nextBtn.textContent = index === steps.length - 1 ? 'Submit' : 'Next';

  const labels = [
    'Step 1 of 5 – Contact',
    'Step 2 of 5 – Predictions',
    'Step 3 of 5 – Confidence Ratings',
    'Step 4 of 5 – Best Lifters'
  ];

  stepLabel.textContent = labels[index] || `Step ${index + 1} of ${steps.length}`;

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
  statusEl.textContent = message || '';
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

// ========= CONFIDENCE LABELS =========
function updateConfidenceLabels() {
  activeConfidenceClasses().forEach(cls => {
    const meta = classMeta[cls];
    const labelEl = document.getElementById('confLabel_' + cls);
    const wSel = document.getElementById('w' + cls);

    if (!meta || !labelEl || !wSel) return;

    const winner = wSel.value || '';

    if (!winner) {
      labelEl.textContent = `Your ${meta.labelPrefix} — no winner selected yet.`;
      return;
    }

    const cleanName = winner.replace(/\s*\([\d.]+\s*kg\)/i, '').trim();
    labelEl.textContent = `Your ${meta.labelPrefix} — ${cleanName}`;
  });
}

// ========= CONFIDENCE RATING LOGIC =========
function initConfidenceOptions() {
  const activeConfSelects = Array.from(document.querySelectorAll('.conf-select'));
  const total = activeConfSelects.length;

  activeConfSelects.forEach(sel => {
    sel.innerHTML = '';

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Select rating…';
    sel.appendChild(placeholder);

    for (let i = 1; i <= total; i++) {
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = String(i);
      sel.appendChild(opt);
    }

    const clearOpt = document.createElement('option');
    clearOpt.value = 'CLEAR_ALL';
    clearOpt.textContent = '⚠️ Clear ALL confidence ratings';
    clearOpt.classList.add('text-red-400', 'font-semibold');
    sel.appendChild(clearOpt);

    const label = sel.closest('div')?.querySelector('label');
    if (label) {
      label.innerHTML = `Confidence Rating (1–${total}) <span class="text-red-500">*</span>`;
    }
  });
}

function refreshConfidenceDisables() {
  const activeConfSelects = Array.from(document.querySelectorAll('.conf-select'));

  const used = new Set(
    activeConfSelects
      .map(sel => sel.value)
      .filter(v => v !== '' && v !== 'CLEAR_ALL')
  );

  activeConfSelects.forEach(sel => {
    const current = sel.value;

    Array.from(sel.options).forEach(opt => {
      if (!opt.value || opt.value === 'CLEAR_ALL') return;
      opt.disabled = used.has(opt.value) && opt.value !== current;
    });
  });
}

function wireConfidenceClearHandlers() {
  document.querySelectorAll('.conf-select').forEach(sel => {
    sel.addEventListener('change', () => {
      if (sel.value === 'CLEAR_ALL') {
        const ok = window.confirm(
          'Are you sure you want to clear ALL confidence ratings for ALL visible weight classes?'
        );

        if (!ok) {
          sel.value = '';
          refreshConfidenceDisables();
          return;
        }

        activeConfidenceClasses().forEach(cls => {
          const cSel = document.getElementById('c' + cls);
          if (cSel) cSel.value = '';
        });

        const total = activeConfidenceClasses().length;
        refreshConfidenceDisables();
        showStatus(`All ${total} confidence ratings have been reset. Please reassign 1–${total}.`, false);
        sel.value = '';
        return;
      }

      refreshConfidenceDisables();
    });
  });
}

// ========= BEST LIFTER LISTS =========
function buildBestLifterLists() {
  const femaleOptions = new Set();
  const maleOptions = new Set();

  activeFemaleClasses().forEach(cls => {
    const sel = document.getElementById('w' + cls);
    if (!sel) return;

    Array.from(sel.options).forEach(opt => {
      if (opt.value) femaleOptions.add(opt.textContent);
    });
  });

  activeMaleClasses().forEach(cls => {
    const sel = document.getElementById('w' + cls);
    if (!sel) return;

    Array.from(sel.options).forEach(opt => {
      if (opt.value) maleOptions.add(opt.textContent);
    });
  });

  if (femaleBestList) {
    femaleBestList.innerHTML = '';
    femaleOptions.forEach(name => {
      const option = document.createElement('option');
      option.value = name;
      femaleBestList.appendChild(option);
    });
  }

  if (maleBestList) {
    maleBestList.innerHTML = '';
    maleOptions.forEach(name => {
      const option = document.createElement('option');
      option.value = name;
      maleBestList.appendChild(option);
    });
  }
}

// ========= VALIDATION =========
const totalRegex = /^(?:[0-9]|[1-9][0-9]{1,2}|1[0-9]{3}|2000)(?:\.0|\.5)?$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validatePredictionClasses(classes) {
  let valid = true;

  classes.forEach(cls => {
    const wSel = document.getElementById('w' + cls);
    const tInput = document.getElementById('t' + cls);

    if (!wSel) return;

    if (!wSel.value) {
      setError('w' + cls + 'Error', 'Please pick a winner.');
      valid = false;
    }

    if (tInput) {
      const v = tInput.value.trim();

      if (v !== '' && !totalRegex.test(v)) {
        setError('t' + cls + 'Error', 'Use 0–2000 in steps of 0.5.');
        valid = false;
      }
    }
  });

  return valid;
}

function validateStep(stepIndex) {
  clearErrors();
  showStatus('');
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
    valid = validatePredictionClasses(activeAllClasses()) && valid;
  }

  if (stepIndex === 2 || stepIndex === 3) {
    const presentClasses = activeConfidenceClasses();

    presentClasses.forEach(cls => {
      const cSel = document.getElementById('c' + cls);

      if (!cSel) return;

      if (!cSel.value || cSel.value === 'CLEAR_ALL') {
        setError('c' + cls + 'Error', 'Please choose a confidence rating.');
        valid = false;
      }
    });

    const values = presentClasses
      .map(cls => document.getElementById('c' + cls)?.value)
      .filter(v => v && v !== 'CLEAR_ALL');

    const unique = new Set(values);

    if (values.length !== presentClasses.length || unique.size !== presentClasses.length) {
      showStatus(
        `Each confidence rating must be used exactly once across all ${presentClasses.length} visible classes.`,
        true
      );
      valid = false;
    }
  }

  if (stepIndex === steps.length - 1) {
    const femaleOptions = [...document.querySelectorAll('#femaleBestList option')]
      .map(o => o.value.trim().toLowerCase());

    const maleOptions = [...document.querySelectorAll('#maleBestList option')]
      .map(o => o.value.trim().toLowerCase());

    const femaleVal = femaleBestInput.value.trim().toLowerCase();
    const maleVal = maleBestInput.value.trim().toLowerCase();

    if (!femaleVal || !femaleOptions.includes(femaleVal)) {
      setError('femaleBestError', 'Please select a lifter from the list.');
      valid = false;
    }

    if (!maleVal || !maleOptions.includes(maleVal)) {
      setError('maleBestError', 'Please select a lifter from the list.');
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

  Object.keys(state).forEach(key => {
    if (key === 'currentStep') return;

    const input = form.querySelector(`[name="${key}"]`);
    if (!input) return;

    if (input.type === 'checkbox' || input.type === 'radio') {
      input.checked = state[key] === input.value;
    } else {
      input.value = state[key];
    }
  });

  let savedStep = Number(state.currentStep || 0);
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
      showStatus('Unable to save progress. Storage may be full or blocked.', true);
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

  tokenInput.value = existingToken;

  initConfidenceOptions();
  refreshConfidenceDisables();
  updateConfidenceLabels();

  showStep(0);
  scrollToFormTop();

  localStorage.removeItem(AUTO_SAVE_KEY);

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
    saveProgress(true, true);
  }, 30000);
}

// ========= DUPLICATE EMAIL HELPERS =========
async function checkEmailExists(email) {
  const division = divisionInput ? divisionInput.value.trim() : '';

  const res = await fetch(
    SCRIPT_URL +
      '?action=checkEmail' +
      '&email=' + encodeURIComponent(email) +
      '&division=' + encodeURIComponent(division),
    { method: 'GET' }
  );

  const json = await res.json();

  if (!json.ok) {
    throw new Error(json.message || 'Could not check email.');
  }

  return !!json.exists;
}

async function sendEditLink(email) {
  const division = divisionInput ? divisionInput.value.trim() : '';

  const res = await fetch(
    SCRIPT_URL +
      '?action=sendLink' +
      '&email=' + encodeURIComponent(email) +
      '&division=' + encodeURIComponent(division),
    { method: 'GET' }
  );

  const json = await res.json();

  if (!json.ok) {
    showStatus(json.message || 'Could not send your private link. Please try again later.', true);
    return false;
  }

  return true;
}

// ========= PREFILL LOGIC =========
async function prefillIfToken() {
  const params = new URLSearchParams(window.location.search);
  const existingToken = params.get('token');

  if (!existingToken) {
    updateConfidenceLabels();
    return;
  }

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

    if (d.email) emailInput.value = d.email;
    if (d.instagramHandle) igInput.value = d.instagramHandle;
    if (d.leaderboardName) leaderboardInput.value = d.leaderboardName;

    emailInput.readOnly = true;
    emailInput.classList.add('bg-gray-700', 'cursor-not-allowed');

    activeAllClasses().forEach(cls => {
      const wSel = document.getElementById('w' + cls);
      const tInput = document.getElementById('t' + cls);
      const cSel = document.getElementById('c' + cls);

      const wKey = 'w' + cls;
      const tKey = 't' + cls;
      const cKey = 'c' + cls;

      if (d[wKey] && wSel) wSel.value = d[wKey];
      if (d[tKey] && tInput) tInput.value = d[tKey];
      if (d[cKey] && cSel) cSel.value = String(d[cKey]);
    });

    if (d.femaleBest) femaleBestInput.value = d.femaleBest;
    if (d.maleBest) maleBestInput.value = d.maleBest;

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

  emailInput.value = emailInput.value.trim().toLowerCase();

  for (let s = 0; s < steps.length; s++) {
    if (!validateStep(s)) {
      showStep(s);
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

    showStatus(json.message || 'Entry saved. Check your email for confirmation and your edit link.', false);

    if (json.token) {
      const editLink = `https://solacestrength.github.io/britishclassicfl/entry-subjuniors.html?token=${encodeURIComponent(json.token)}`;
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
  } catch (err) {
    showStatus('Network or server error. Please try again.', true);
  }

  nextBtn.disabled = false;
  backBtn.disabled = false;
}

// ========= NAVIGATION HANDLERS =========
backBtn.addEventListener('click', () => {
  if (currentStep > 0) {
    showStep(currentStep - 1);
    scrollToFormTop();
  }
});

nextBtn.addEventListener('click', async () => {
  if (currentStep < steps.length - 1) {
    if (!validateStep(currentStep)) {
      scrollToFirstErrorInStep(currentStep);
      return;
    }

    if (currentStep === 0) {
      const emailVal = emailInput.value.trim().toLowerCase();
      const tokenVal = tokenInput.value.trim();

      if (emailVal && !tokenVal) {
        try {
          showStatus('Checking email…', false);
          nextBtn.disabled = true;
          backBtn.disabled = true;

          const exists = await checkEmailExists(emailVal);

          if (exists) {
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
            return;
          }

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

      startAutoSave();
    }

    updateConfidenceLabels();
    showStep(currentStep + 1);
    scrollToFormTop();
  } else {
    submitForm();
  }
});

// ========= INIT =========
document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  editingToken = params.get('token');

  const hasSavedProgress = !!localStorage.getItem(AUTO_SAVE_KEY);

  if (editingToken || hasSavedProgress) {
    sessionStorage.setItem('spotifyPassed', '1');
    const spotifyLock = document.getElementById('spotify-lock');
    if (spotifyLock) spotifyLock.classList.add('hidden');
  }

  if (isPastDeadline()) {
    sessionStorage.setItem('spotifyPassed', '1');
    const spotifyLock = document.getElementById('spotify-lock');
    if (spotifyLock) spotifyLock.classList.add('hidden');

    lockFormForDeadline();
    return;
  }

  initConfidenceOptions();
  wireConfidenceClearHandlers();
  buildBestLifterLists();
  showStep(0);

  activeAllClasses().forEach(cls => {
    const wSel = document.getElementById('w' + cls);
    const tInput = document.getElementById('t' + cls);

    if (wSel) {
      wSel.addEventListener('change', () => {
        updateConfidenceLabels();
        buildBestLifterLists();
      });
    }

    if (tInput) {
      tInput.addEventListener('input', updateConfidenceLabels);
    }
  });

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      saveProgress(true, false);
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', clearFormAll);
  }

  if (!editingToken && hasSavedProgress) {
    restoreSavedProgressIfAny();
  }

  await prefillIfToken();

  updateConfidenceLabels();

  if (emailInput.value.trim()) {
    startAutoSave();
  }
});
