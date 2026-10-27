/* Public, browser-only workbook UI. No background save, analytics, or document upload. */
(() => {
  'use strict';
  const schema = JSON.parse(document.querySelector('#tool-schema').textContent);
  const fields = schema.steps.flatMap(step => step.fields);
  const questions = document.querySelector('#tool-questions');
  schema.steps.forEach((step, index) => {
    const section = document.createElement('section'); section.className = 'guided-question'; section.id = `guided-${index + 1}`;
    const heading = document.createElement('h2'); heading.textContent = `${index + 1}. ${step.title}`;
    const prompt = document.createElement('p'); prompt.textContent = step.prompt;
    section.append(heading, prompt);
    step.fields.forEach(field => {
      const label = document.createElement('label'); label.htmlFor = field.id; label.textContent = field.label;
      const input = document.createElement(field.type === 'select' ? 'select' : field.type === 'date' ? 'input' : 'textarea');
      input.id = field.id; input.dataset.answer = field.id;
      if (field.type === 'select') field.options.forEach(choice => { const option = document.createElement('option'); option.value = choice.value; option.textContent = choice.label; input.append(option); });
      else { if (field.type === 'date') input.type = 'date'; else input.rows = 2; input.maxLength = field.maxLength; }
      const mirror = document.createElement('span'); mirror.className = 'print-answer'; mirror.dataset.printFor = field.id;
      section.append(label, input, mirror);
    });
    questions.append(section);
  });
  const actionBar = document.querySelector('.workbook-actions');
  new ResizeObserver(() => document.documentElement.style.setProperty('--actions-offset', `${actionBar.getBoundingClientRect().height + 16}px`)).observe(actionBar);
  const form = document.querySelector('#send-form');
  const panel = document.querySelector('#review-panel');
  const review = document.querySelector('#review-content');
  const status = document.querySelector('#send-status');
  const sendButton = document.querySelector('#confirm-send');
  const editButton = document.querySelector('#edit-workbook');
  let reviewedPayload = null;
  let previousBody = '';
  let submissionId = '';
  let busy = false;

  function answers() {
    return Object.fromEntries(fields.map(field => [field.id, document.getElementById(field.id).value.trim()]));
  }
  function displayedValue(input) {
    if (input.tagName === 'SELECT') return input.value ? input.selectedOptions[0].textContent : '—';
    return input.value.trim() || '—';
  }
  function pair(list, title, value) {
    if (!value) return;
    const dt = document.createElement('dt'); dt.textContent = title;
    const dd = document.createElement('dd'); dd.textContent = value;
    list.append(dt, dd);
  }
  function setBusy(value) {
    busy = value;
    document.querySelectorAll('[data-answer],#send-form input,#review-workbook,#quick-review,#confirm-send,#edit-workbook')
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
  document.querySelectorAll('input,textarea,select').forEach(input => input.addEventListener('input', resetReview));
  form.elements.name.addEventListener('input', () => form.elements.name.setCustomValidity(''));
  form.addEventListener('submit', event => {
    event.preventDefault();
    const name = form.elements.name;
    name.setCustomValidity(name.value.trim() ? '' : 'Enter your name before sending.');
    form.elements.email.value = form.elements.email.value.trim();
    if (!form.reportValidity()) return;
    const contact = { name: name.value.trim(), email: form.elements.email.value, phone: form.elements.phone.value.trim() };
    const body = { workbook: schema.workbook, version: 3, contact, answers: answers(), website: form.elements.website.value };
    if (new TextEncoder().encode(JSON.stringify(body)).length > 32000) {
      status.textContent = 'Your notes are too long to send together. Please shorten them, or print your full answers instead.'; status.focus(); return;
    }
    const serialized = JSON.stringify(body);
    if (serialized !== previousBody) {
      submissionId = crypto.randomUUID();
      previousBody = serialized;
    }
    reviewedPayload = { ...body, submission_id: submissionId };
    const dl = document.createElement('dl');
    pair(dl, 'Name', contact.name); pair(dl, 'Email', contact.email); pair(dl, 'Phone', contact.phone);
    fields.forEach(field => pair(dl, field.label, displayedValue(document.getElementById(field.id))));
    review.replaceChildren(dl);
    form.hidden = true; panel.hidden = false; panel.focus(); status.textContent = '';
  });
  editButton.addEventListener('click', () => { resetReview(); form.elements.name.focus(); });
  sendButton.addEventListener('click', async () => {
    if (busy || !reviewedPayload) return;
    setBusy(true); status.textContent = 'Sending your answers…';
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
      status.textContent = 'Your answers were received for review by Brooks’s team. You can still print them for your records.';
      reviewedPayload = null;
      status.focus();
    } catch (error) {
      status.textContent = error.message === 'rate_limited' ? 'There have been too many requests. Your answers are still here. Please wait and try again later, or print a copy.' : 'We couldn’t confirm that your answers were received. Your answers are still here. Please try again, or print a copy for your conversation with Brooks.';
      status.focus();
    } finally {
      clearTimeout(timeout); setBusy(false);
    }
  });
  function preparePrint() {
    document.querySelectorAll('[data-print-for]').forEach(node => { node.textContent = displayedValue(document.getElementById(node.dataset.printFor)); });
  }
  window.addEventListener('beforeprint', preparePrint);
  document.querySelector('#quick-review').addEventListener('click', () => {
    document.querySelector('#send-section').scrollIntoView({ block: 'start' });
    form.requestSubmit();
  });
  function loadCalendar() {
    const container = document.querySelector('#calendar-container');
    if (!container.firstChild) {
      const frame = document.createElement('iframe');
      frame.src = 'https://calendly.com/brookskelly/30min';
      frame.title = 'Book a call with Brooks Kelly';
      frame.referrerPolicy = 'no-referrer';
      container.append(frame);
    }
    container.hidden = false;
    document.querySelector('#load-calendar').hidden = true;
  }
  document.querySelector('#load-calendar').addEventListener('click', loadCalendar);
  document.querySelector('#quick-book').addEventListener('click', loadCalendar);
  document.querySelector('#print-workbook').addEventListener('click', () => { preparePrint(); window.print(); });
})();
