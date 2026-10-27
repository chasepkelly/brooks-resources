/* Public, browser-only workbook UI. No background save, analytics, or document upload. */
(() => {
  'use strict';
  const form = document.querySelector('#send-form');
  const panel = document.querySelector('#review-panel');
  const review = document.querySelector('#review-content');
  const status = document.querySelector('#send-status');
  const sendButton = document.querySelector('#confirm-send');
  const editButton = document.querySelector('#edit-workbook');
  const labels = {
    take_home_income: 'Regular take-home income', non_housing_spending: 'Current non-housing spending',
    savings_habits: 'Savings habits to preserve', housing_cost: 'Total proposed housing cost',
    maintenance_allowance: 'Routine maintenance allowance', breathing_room: 'Remaining monthly breathing room',
    next_decision: 'My next decision', question: 'One question to resolve', question_owner: 'Who can answer it?',
    follow_up_date: 'Follow-up date',
  };
  let reviewedPayload = null;
  let previousBody = '';
  let submissionId = '';
  let busy = false;
  let printedDetails = [];

  function answers() {
    const result = {};
    document.querySelectorAll('[data-answer]').forEach(input => {
      const [key, part] = input.dataset.answer.split('.');
      if (part) (result[key] ||= {})[part] = input.value.trim();
      else result[key] = input.value.trim();
    });
    result.exercises = {};
    document.querySelectorAll('[data-exercise]').forEach(input => {
      if (input.value.trim()) result.exercises[input.dataset.exercise] = input.value.trim();
    });
    return result;
  }
  function pair(list, title, value) {
    if (!value) return;
    const dt = document.createElement('dt'); dt.textContent = title;
    const dd = document.createElement('dd'); dd.textContent = value;
    list.append(dt, dd);
  }
  function setBusy(value) {
    busy = value;
    document.querySelectorAll('[data-answer],[data-exercise],#send-form input,#review-workbook,#confirm-send,#edit-workbook')
      .forEach(control => { control.disabled = value; });
    sendButton.textContent = value ? 'Sending…' : 'Send to Brooks';
    panel.setAttribute('aria-busy', String(value));
  }
  function resetReview() {
    if (busy) return;
    panel.hidden = true;
    form.hidden = false;
    reviewedPayload = null;
    status.textContent = '';
  }
  document.querySelectorAll('input,textarea').forEach(input => input.addEventListener('input', resetReview));
  form.elements.name.addEventListener('input', () => form.elements.name.setCustomValidity(''));
  form.addEventListener('submit', event => {
    event.preventDefault();
    const name = form.elements.name;
    name.setCustomValidity(name.value.trim() ? '' : 'Enter your name before sending.');
    form.elements.email.value = form.elements.email.value.trim();
    if (!form.reportValidity()) return;
    const contact = { name: name.value.trim(), email: form.elements.email.value, phone: form.elements.phone.value.trim() };
    const body = { workbook: 'payment', version: 1, contact, answers: answers(), website: form.elements.website.value };
    if (new TextEncoder().encode(JSON.stringify(body)).length > 32000) {
      status.textContent = 'Your notes are too long to send together. Please shorten them, or print your full workbook instead.'; status.focus(); return;
    }
    const serialized = JSON.stringify(body);
    if (serialized !== previousBody) {
      submissionId = crypto.randomUUID();
      previousBody = serialized;
    }
    reviewedPayload = { ...body, submission_id: submissionId };
    const dl = document.createElement('dl');
    pair(dl, 'Name', contact.name); pair(dl, 'Email', contact.email); pair(dl, 'Phone', contact.phone);
    for (const [key, label] of Object.entries(labels)) {
      const value = body.answers[key];
      pair(dl, label, typeof value === 'object' ? [value.figure, value.source && `Source / next action: ${value.source}`].filter(Boolean).join('\n') : value);
    }
    for (const [key, value] of Object.entries(body.answers.exercises)) pair(dl, `Exercise ${Number(key.slice(-2))} notes`, value);
    review.replaceChildren(dl);
    form.hidden = true; panel.hidden = false; panel.focus(); status.textContent = '';
  });
  editButton.addEventListener('click', () => { resetReview(); form.elements.name.focus(); });
  sendButton.addEventListener('click', async () => {
    if (busy || !reviewedPayload) return;
    setBusy(true); status.textContent = 'Sending your workbook…';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch('https://oznktsrggzrzjgzzhyxv.supabase.co/functions/v1/workbook-submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewedPayload), signal: controller.signal,
      });
      let result;
      try { result = await response.json(); } catch { throw new Error('unconfirmed'); }
      if (!response.ok || result?.ok !== true || result.submission_id !== submissionId) throw new Error(response.status === 429 ? 'rate_limited' : 'unconfirmed');
      panel.hidden = true;
      status.textContent = 'Your workbook was received for review by Brooks’s team. You can still print your answers for your records.';
      reviewedPayload = null;
      status.focus();
    } catch (error) {
      status.textContent = error.message === 'rate_limited' ? 'There have been too many requests. Your answers are still here. Please wait and try again later, or print a copy.' : 'We couldn’t confirm that your workbook was received. Your answers are still here. Please try again, or print a copy for your conversation with Brooks.';
      status.focus();
    } finally {
      clearTimeout(timeout); setBusy(false);
    }
  });
  function preparePrint() {
    document.querySelectorAll('[data-print-for]').forEach(node => { node.textContent = document.getElementById(node.dataset.printFor).value.trim() || '—'; });
    if (!printedDetails.length) printedDetails = Array.from(document.querySelectorAll('details.drill'), element => ({ element, open: element.open }));
    for (const { element } of printedDetails) {
      const filled = Boolean(element.querySelector('textarea').value.trim());
      element.classList.toggle('print-omit', !filled); if (filled) element.open = true;
    }
  }
  window.addEventListener('beforeprint', preparePrint);
  window.addEventListener('afterprint', () => {
    for (const { element, open } of printedDetails) { element.open = open; element.classList.remove('print-omit'); }
    printedDetails = [];
  });
  document.querySelector('#print-workbook').addEventListener('click', () => { preparePrint(); window.print(); });
})();
