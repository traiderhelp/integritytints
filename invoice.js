/* ══════════════════════════════════════════════
   INVOICE MANAGER — JavaScript Logic
   ══════════════════════════════════════════════ */

const ADMIN_PASSWORD = 'AddisonJ16$';
const STORAGE_KEY = 'integrity_invoices';
const COUNTER_KEY = 'integrity_inv_counter';

/* ─── DOM Ready ─── */
document.addEventListener('DOMContentLoaded', () => {
  initGate();
  initTabs();
  initForm();
  initWorksheet();
  initPreviewActions();
  initHistory();
});

/* ════════════════════════════════════════════════
   PASSWORD GATE
   ════════════════════════════════════════════════ */
function initGate() {
  const gate = document.getElementById('gate');
  const app = document.getElementById('app');
  const form = document.getElementById('gateForm');
  const input = document.getElementById('gatePassword');
  const error = document.getElementById('gateError');

  // Check if already authenticated this session
  if (sessionStorage.getItem('inv_auth') === 'true') {
    gate.style.display = 'none';
    app.style.display = 'block';
    return;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (input.value === ADMIN_PASSWORD) {
      sessionStorage.setItem('inv_auth', 'true');
      gate.style.display = 'none';
      app.style.display = 'block';
    } else {
      error.textContent = 'Incorrect password. Try again.';
      input.value = '';
      input.focus();
    }
  });
}

/* ════════════════════════════════════════════════
   TAB SWITCHING
   ════════════════════════════════════════════════ */
function initTabs() {
  const tabs = document.querySelectorAll('.topbar__tab');
  const tabCreate = document.getElementById('tabCreate');
  const tabHistory = document.getElementById('tabHistory');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const target = tab.dataset.tab;
      tabCreate.style.display = target === 'create' ? 'block' : 'none';
      tabHistory.style.display = target === 'history' ? 'block' : 'none';

      if (target === 'history') renderHistory();
    });
  });
}

/* ════════════════════════════════════════════════
   FORM INIT
   ════════════════════════════════════════════════ */
function initForm() {
  // Set default date to today
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('invDate').value = today;

  // Auto-generate invoice number
  const counter = parseInt(localStorage.getItem(COUNTER_KEY) || '1000', 10);
  document.getElementById('invNumber').value = `IWT-${counter}`;

  // Auto-calculate grand total / balance
  const totalEl = document.getElementById('total');
  const rebateEl = document.getElementById('rebate');
  const depositEl = document.getElementById('deposit');
  const grandDisplay = document.getElementById('grandTotalDisplay');

  const recalc = () => {
    const total = parseFloat(totalEl.value) || 0;
    const rebate = parseFloat(rebateEl.value) || 0;
    const grand = total - rebate;
    grandDisplay.textContent = formatCurrency(grand);
  };

  [totalEl, rebateEl, depositEl].forEach(el => el.addEventListener('input', recalc));

  // Clear button
  document.getElementById('btnClear').addEventListener('click', clearForm);
}

function clearForm() {
  const fields = [
    'custName', 'custAddress', 'custCity', 'custZip', 'custPhone', 'custEmail',
    'jobCompany', 'jobContact', 'jobAddress', 'jobCity', 'jobZip', 'jobPhone', 'jobEmail', 'jobSubdivision',
    'filmType', 'sealColor', 'installDate', 'installer', 'specialInstructions', 'scopeOfWork',
    'total', 'rebate', 'deposit', 'depositCheck', 'balanceCheck'
  ];
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  document.getElementById('custState').value = 'FL';
  document.getElementById('jobState').value = 'FL';
  document.getElementById('total').value = '0';
  document.getElementById('rebate').value = '0';
  document.getElementById('deposit').value = '0';
  document.getElementById('grandTotalDisplay').textContent = '$0.00';

  // Reset date and invoice number
  document.getElementById('invDate').value = new Date().toISOString().split('T')[0];
  const counter = parseInt(localStorage.getItem(COUNTER_KEY) || '1000', 10);
  document.getElementById('invNumber').value = `IWT-${counter}`;

  // Reset worksheet
  initWorksheetRows();
  initFilmRows();
  recalcWorksheetTotals();
  recalcWorksheetPricing();

  // Hide preview
  document.getElementById('invoiceRender').style.display = 'none';
  document.getElementById('previewEmpty').style.display = 'flex';
  document.getElementById('btnDownload').disabled = true;
  document.getElementById('btnEmail').disabled = true;
  document.getElementById('btnSave').disabled = true;
}

/* ════════════════════════════════════════════════
   WORKSHEET — MEASUREMENTS TABLE
   ════════════════════════════════════════════════ */
function initWorksheet() {
  initWorksheetRows();
  initFilmRows();
  document.getElementById('addWsRow').addEventListener('click', addWorksheetRow);
  document.getElementById('addFilmRow').addEventListener('click', () => addFilmRow());

  // Pricing recalc on change for non-film rows (Seal, Removal, Small)
  const pricingInputs = document.querySelectorAll('.ws-pricing-row input');
  pricingInputs.forEach(input => input.addEventListener('input', recalcWorksheetPricing));
}

function initFilmRows() {
  document.getElementById('wsFilmRows').innerHTML = '';
  addFilmRow('Film', 13, 0, 11.50);
}

let filmRowCounter = 0;
function addFilmRow(name = '', price = 0, rebate = 0, cost = 0) {
  const container = document.getElementById('wsFilmRows');
  const id = filmRowCounter++;
  const row = document.createElement('div');
  row.className = 'ws-pricing-row ws-film-row';
  row.dataset.filmId = id;
  row.innerHTML = `
    <input type="text" class="film-name-input" placeholder="Film name" value="${name}" />
    <input type="number" class="film-price" step="0.01" value="${price}" />
    <input type="number" class="film-rebate" step="0.01" value="${rebate}" />
    <input type="number" class="film-cost" step="0.01" value="${cost}" />
    <span class="ws-subtotal film-subtotal">$0.00</span>
    <button type="button" class="btn-remove-film" onclick="removeFilmRow(${id})" title="Remove film">&times;</button>
  `;
  container.appendChild(row);
  row.querySelectorAll('input').forEach(inp => inp.addEventListener('input', recalcWorksheetPricing));
  recalcWorksheetPricing();
}

function removeFilmRow(id) {
  const row = document.querySelector(`.ws-film-row[data-film-id="${id}"]`);
  if (row) row.remove();
  recalcWorksheetPricing();
}

function initWorksheetRows() {
  const body = document.getElementById('wsBody');
  body.innerHTML = '';
  for (let i = 0; i < 5; i++) addWorksheetRow();
}

function addWorksheetRow() {
  const body = document.getElementById('wsBody');
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input type="text" class="ws-area" placeholder="e.g. Doors" data-field="area" /></td>
    <td><input type="number" value="0" min="0" data-field="removal" /></td>
    <td><input type="number" value="0" min="0" data-field="width" /></td>
    <td><input type="number" value="0" min="0" data-field="height" /></td>
    <td><input type="number" value="0" min="0" data-field="small" /></td>
    <td><input type="number" value="0" min="0" data-field="panes" /></td>
    <td class="ws-computed" data-field="sf">0</td>
    <td class="ws-computed" data-field="linear">0</td>
    <td>
      <button type="button" class="ws-row-delete" title="Remove row">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </td>
  `;

  // Recalc on input
  tr.querySelectorAll('input[type="number"]').forEach(input => {
    input.addEventListener('input', () => {
      recalcRow(tr);
      recalcWorksheetTotals();
      recalcWorksheetPricing();
    });
  });

  // Delete row
  tr.querySelector('.ws-row-delete').addEventListener('click', () => {
    tr.remove();
    recalcWorksheetTotals();
    recalcWorksheetPricing();
  });

  body.appendChild(tr);
}

function recalcRow(tr) {
  const width = parseFloat(tr.querySelector('[data-field="width"]').value) || 0;
  const height = parseFloat(tr.querySelector('[data-field="height"]').value) || 0;
  const panes = parseFloat(tr.querySelector('[data-field="panes"]').value) || 0;

  const sf = (width * height / 144) * panes;
  const linear = ((width * 2 + height * 2) / 12) * panes;

  tr.querySelector('[data-field="sf"]').textContent = sf.toFixed(2);
  tr.querySelector('[data-field="linear"]').textContent = linear.toFixed(2);
}

function recalcWorksheetTotals() {
  const rows = document.querySelectorAll('#wsBody tr');
  let totalRemoval = 0, totalSmall = 0, totalSF = 0, totalLinear = 0;

  rows.forEach(tr => {
    totalRemoval += parseFloat(tr.querySelector('[data-field="removal"]')?.value) || 0;
    totalSmall += parseFloat(tr.querySelector('[data-field="small"]')?.value) || 0;
    totalSF += parseFloat(tr.querySelector('[data-field="sf"]')?.textContent) || 0;
    totalLinear += parseFloat(tr.querySelector('[data-field="linear"]')?.textContent) || 0;
  });

  document.getElementById('wsTotalRemoval').textContent = totalRemoval;
  document.getElementById('wsTotalSmall').textContent = totalSmall;
  document.getElementById('wsTotalSF').textContent = totalSF.toFixed(2);
  document.getElementById('wsTotalLinear').textContent = totalLinear.toFixed(2);

  // Film need = SF + 15%
  const filmNeed = totalSF * 1.15;
  document.getElementById('wsFilmNeed').textContent = filmNeed.toFixed(2);
}

function recalcWorksheetPricing() {
  const totalSF = parseFloat(document.getElementById('wsTotalSF').textContent) || 0;
  const totalLinear = parseFloat(document.getElementById('wsTotalLinear').textContent) || 0;
  const totalRemoval = parseFloat(document.getElementById('wsTotalRemoval').textContent) || 0;
  const totalSmall = parseFloat(document.getElementById('wsTotalSmall').textContent) || 0;
  const filmNeed = totalSF * 1.15;

  // Films (dynamic)
  let subFilmCost = 0;
  let subFilmPrice = 0;
  document.querySelectorAll('.ws-film-row').forEach(row => {
    const cost = parseFloat(row.querySelector('.film-cost').value) || 0;
    const price = parseFloat(row.querySelector('.film-price').value) || 0;
    const rowCost = cost * filmNeed;
    const rowPrice = price * filmNeed;
    subFilmCost += rowCost;
    subFilmPrice += rowPrice;
    row.querySelector('.film-subtotal').textContent = formatCurrency(rowCost);
  });

  // Seal
  const costSeal = parseFloat(document.getElementById('wsCostSeal').value) || 0;
  const priceSeal = parseFloat(document.getElementById('wsPriceSeal').value) || 0;
  const subSealCost = costSeal * totalLinear;
  const subSealPrice = priceSeal * totalLinear;
  document.getElementById('wsSubSeal').textContent = formatCurrency(subSealCost);

  // Removal
  const costRemoval = parseFloat(document.getElementById('wsCostRemoval').value) || 0;
  const priceRemoval = parseFloat(document.getElementById('wsPriceRemoval').value) || 0;
  const subRemovalCost = costRemoval * totalRemoval;
  const subRemovalPrice = priceRemoval * totalRemoval;
  document.getElementById('wsSubRemoval').textContent = formatCurrency(subRemovalCost);

  // Small Windows
  const costSmall = parseFloat(document.getElementById('wsCostSmall').value) || 0;
  const priceSmall = parseFloat(document.getElementById('wsPriceSmall').value) || 0;
  const subSmallCost = costSmall * totalSmall;
  const subSmallPrice = priceSmall * totalSmall;
  document.getElementById('wsSubSmall').textContent = formatCurrency(subSmallCost);

  // Totals
  const totalCost = subFilmCost + subSealCost + subRemovalCost + subSmallCost;
  const totalPrice = subFilmPrice + subSealPrice + subRemovalPrice + subSmallPrice;
  const lessRebate = totalPrice - totalCost;

  document.getElementById('wsCostTotal').textContent = formatCurrency(totalCost);
  document.getElementById('wsPriceTotal').textContent = formatCurrency(totalPrice);
  document.getElementById('wsLessRebate').textContent = formatCurrency(lessRebate);
  document.getElementById('wsGrandTotal').textContent = formatCurrency(totalCost);
}

/* ════════════════════════════════════════════════
   PREVIEW
   ════════════════════════════════════════════════ */
function initPreviewActions() {
  document.getElementById('btnPreview').addEventListener('click', generatePreview);
  document.getElementById('btnDownload').addEventListener('click', downloadPDF);
  document.getElementById('btnEmail').addEventListener('click', emailInvoice);
  document.getElementById('btnSave').addEventListener('click', saveInvoice);
}

function generatePreview() {
  const data = collectFormData();

  // Page 1 — Invoice
  setText('pDate', data.date);
  setText('pCustName', data.custName);
  setText('pCustAddress', data.custAddress);
  setText('pCustCSZ', `${data.custCity}, ${data.custState} ${data.custZip}`);
  setText('pCustPhone', data.custPhone);
  setText('pCustEmail', data.custEmail);
  setText('pInvNumber', data.invNumber);
  setText('pJobCompany', data.jobCompany);
  setText('pJobAddress', data.jobAddress);
  setText('pJobCSZ', `${data.jobCity}, ${data.jobState} ${data.jobZip}`);
  setText('pJobContact', data.jobContact);
  setText('pJobPhone', data.jobPhone);
  setText('pJobEmail', data.jobEmail);
  setText('pSubdivision', data.jobSubdivision);
  setText('pFilmType', data.filmType);
  setText('pSealColor', data.sealColor);
  setText('pInstallDate', data.installDate);
  setText('pSpecialInstructions', data.specialInstructions);
  setText('pScopeOfWork', data.scopeOfWork);

  const total = parseFloat(data.total) || 0;
  const rebate = parseFloat(data.rebate) || 0;
  const deposit = parseFloat(data.deposit) || 0;
  const grandTotal = total - rebate;
  const balance = grandTotal - deposit;

  setText('pTotal', formatCurrency(total));
  setText('pRebate', formatCurrency(rebate));
  setText('pGrandTotal', formatCurrency(grandTotal));
  setText('pDeposit', formatCurrency(deposit));
  setText('pBalance', formatCurrency(balance));
  setText('pDepositCheck', data.depositCheck);
  setText('pBalanceCheck', data.balanceCheck);
  setText('pInstaller', data.installer);

  // Page 2 — Worksheet
  setText('pWsCustName', data.custName);
  setText('pWsDate', data.date);
  setText('pWsInvNumber', data.invNumber);

  // Build worksheet table
  const printBody = document.getElementById('wsPrintBody');
  printBody.innerHTML = '';
  data.worksheetRows.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.area}</td>
      <td>${row.removal}</td>
      <td>${row.width}</td>
      <td>${row.height}</td>
      <td>${row.small}</td>
      <td>${row.panes}</td>
      <td>${row.sf}</td>
      <td>${row.linear}</td>
    `;
    printBody.appendChild(tr);
  });

  setText('pWsTotalRemoval', document.getElementById('wsTotalRemoval').textContent);
  setText('pWsTotalSmall', document.getElementById('wsTotalSmall').textContent);
  setText('pWsTotalSF', document.getElementById('wsTotalSF').textContent);
  setText('pWsTotalLinear', document.getElementById('wsTotalLinear').textContent);
  setText('pWsFilmNeed', document.getElementById('wsFilmNeed').textContent);

  // Pricing — dynamic film rows
  const pWsFilmBody = document.getElementById('pWsFilmBody');
  pWsFilmBody.innerHTML = '';
  document.querySelectorAll('.ws-film-row').forEach(row => {
    const name = row.querySelector('.film-name-input').value || 'Film';
    const price = row.querySelector('.film-price').value || '0';
    const rebate = row.querySelector('.film-rebate').value || '0';
    const cost = row.querySelector('.film-cost').value || '0';
    const sub = row.querySelector('.film-subtotal').textContent;
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${name}</td><td>$${price}</td><td>$${rebate}</td><td>$${cost}</td><td>${sub}</td>`;
    pWsFilmBody.appendChild(tr);
  });

  setText('pWsPriceSeal', '$' + (document.getElementById('wsPriceSeal').value || '0'));
  setText('pWsRebateSeal', '$' + (document.getElementById('wsRebateSeal').value || '0'));
  setText('pWsCostSeal', '$' + (document.getElementById('wsCostSeal').value || '0'));
  setText('pWsSubSeal', document.getElementById('wsSubSeal').textContent);

  setText('pWsPriceRemoval', '$' + (document.getElementById('wsPriceRemoval').value || '0'));
  setText('pWsRebateRemoval', '$' + (document.getElementById('wsRebateRemoval').value || '0'));
  setText('pWsCostRemoval', '$' + (document.getElementById('wsCostRemoval').value || '0'));
  setText('pWsSubRemoval', document.getElementById('wsSubRemoval').textContent);

  setText('pWsPriceSmall', '$' + (document.getElementById('wsPriceSmall').value || '0'));
  setText('pWsRebateSmall', '$' + (document.getElementById('wsRebateSmall').value || '0'));
  setText('pWsCostSmall', '$' + (document.getElementById('wsCostSmall').value || '0'));
  setText('pWsSubSmall', document.getElementById('wsSubSmall').textContent);

  setText('pWsCostTotal', document.getElementById('wsCostTotal').textContent);
  setText('pWsPriceTotal', document.getElementById('wsPriceTotal').textContent);
  setText('pWsLessRebate', document.getElementById('wsLessRebate').textContent);
  setText('pWsGrandTotal', document.getElementById('wsGrandTotal').textContent);

  setText('pWsSpecialInstructions', data.specialInstructions);
  setText('pWsFullCustomer', `${data.custName} — ${data.custAddress}, ${data.custCity}, ${data.custState} ${data.custZip} — ${data.custPhone} — ${data.custEmail}`);

  // Show preview
  document.getElementById('previewEmpty').style.display = 'none';
  document.getElementById('invoiceRender').style.display = 'block';

  // Enable buttons
  document.getElementById('btnDownload').disabled = false;
  document.getElementById('btnEmail').disabled = false;
  document.getElementById('btnSave').disabled = false;

  // Make preview fields editable
  makePreviewEditable();

  // Scroll to preview on mobile
  if (window.innerWidth < 1100) {
    document.getElementById('previewPanel').scrollIntoView({ behavior: 'smooth' });
  }
}

/* ── Make preview fields inline-editable ── */
const PREVIEW_TO_FORM = {
  pDate: 'invDate',
  pCustName: 'custName',
  pCustPhone: 'custPhone',
  pCustEmail: 'custEmail',
  pInvNumber: 'invNumber',
  pJobCompany: 'jobCompany',
  pJobContact: 'jobContact',
  pJobPhone: 'jobPhone',
  pJobEmail: 'jobEmail',
  pFilmType: 'filmType',
  pSealColor: 'sealColor',
  pInstallDate: 'installDate',
  pInstaller: 'installer',
  pSpecialInstructions: 'specialInstructions',
  pScopeOfWork: 'scopeOfWork',
  pTotal: 'total',
  pRebate: 'rebate',
  pDeposit: 'deposit',
  pDepositCheck: 'depositCheck',
  pBalanceCheck: 'balanceCheck',
};

// These preview fields are editable but have no simple 1:1 form mapping
// Changes are kept in the preview only (they'll be captured by PDF)
const PREVIEW_EDITABLE_EXTRA = [
  'pCustAddress', 'pCustCSZ', 'pJobAddress', 'pJobCSZ', 'pSubdivision',
  'pGrandTotal', 'pBalance',
  'pWsFullCustomer', 'pWsSpecialInstructions',
];

function makePreviewEditable() {
  // 1:1 mapped fields — edits sync back to form
  for (const [previewId, formId] of Object.entries(PREVIEW_TO_FORM)) {
    const el = document.getElementById(previewId);
    if (!el) continue;
    el.contentEditable = 'true';
    el.classList.add('preview-editable');
    el.addEventListener('input', () => {
      const formEl = document.getElementById(formId);
      if (formEl) {
        const text = el.textContent.replace(/^\$/, '').trim();
        formEl.value = text;
      }
    });
  }

  // Extra editable fields (no form sync — just edit-in-place for PDF)
  PREVIEW_EDITABLE_EXTRA.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.contentEditable = 'true';
    el.classList.add('preview-editable');
  });
}

/* ════════════════════════════════════════════════
   PDF DOWNLOAD — Both pages in one PDF
   Uses html2canvas + jsPDF directly for reliable rendering
   ════════════════════════════════════════════════ */
async function downloadPDF() {
  const data = collectFormData();
  const fileName = `Invoice_${data.invNumber}_${data.custName.replace(/\s+/g, '_') || 'Customer'}.pdf`;

  const btn = document.getElementById('btnDownload');
  btn.textContent = 'Generating...';
  btn.disabled = true;

  try {
    const page1 = document.getElementById('invoicePage1');
    const page2 = document.getElementById('invoicePage2');
    const invoiceRender = document.getElementById('invoiceRender');

    // Create a temporary full-width wrapper at the body root
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:absolute;left:0;top:0;width:750px;background:white;z-index:99999;padding:0;margin:0;';
    document.body.appendChild(wrapper);

    // --- Capture Page 1 ---
    // Move page1 into the wrapper (removes it from the preview panel)
    wrapper.appendChild(page1);
    page1.style.cssText += ';border:none;margin:0;overflow:visible;max-width:none;';

    // Wait for reflow
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

    const canvas1 = await html2canvas(page1, {
      scale: 2,
      useCORS: true,
      letterRendering: true,
      backgroundColor: '#ffffff'
    });

    // Move page1 back
    invoiceRender.insertBefore(page1, page2);

    // --- Capture Page 2 ---
    wrapper.appendChild(page2);
    page2.style.cssText += ';border:none;margin:0;overflow:visible;max-width:none;';

    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

    const canvas2 = await html2canvas(page2, {
      scale: 2,
      useCORS: true,
      letterRendering: true,
      backgroundColor: '#ffffff'
    });

    // Move page2 back
    invoiceRender.appendChild(page2);

    // Remove wrapper
    wrapper.remove();

    // Restore page styles
    page1.style.cssText = '';
    page2.style.cssText = '';

    // --- Build separate PDFs with jsPDF ---
    const { jsPDF } = window.jspdf;
    const margin = 10;
    const pdfW = 215.9 - (margin * 2);  // usable width (letter)
    const pdfH = 279.4 - (margin * 2);  // usable height (letter)

    // Invoice PDF
    const invoicePdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const img1 = canvas1.toDataURL('image/jpeg', 0.95);
    const ratio1 = canvas1.height / canvas1.width;
    let imgW1 = pdfW;
    let imgH1 = pdfW * ratio1;
    if (imgH1 > pdfH) { imgH1 = pdfH; imgW1 = pdfH / ratio1; }
    invoicePdf.addImage(img1, 'JPEG', margin, margin, imgW1, imgH1);
    invoicePdf.save(fileName);

    // Worksheet PDF
    const worksheetPdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const img2 = canvas2.toDataURL('image/jpeg', 0.95);
    const ratio2 = canvas2.height / canvas2.width;
    let imgW2 = pdfW;
    let imgH2 = pdfW * ratio2;
    if (imgH2 > pdfH) { imgH2 = pdfH; imgW2 = pdfH / ratio2; }
    worksheetPdf.addImage(img2, 'JPEG', margin, margin, imgW2, imgH2);
    const wsFileName = fileName.replace('Invoice_', 'Worksheet_');
    worksheetPdf.save(wsFileName);

    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download PDF`;
    btn.disabled = false;
  } catch (err) {
    console.error('PDF generation failed:', err);
    btn.innerHTML = `Download PDF`;
    btn.disabled = false;
    alert('PDF generation failed: ' + err.message);
  }
}

/* ════════════════════════════════════════════════
   EMAIL INVOICE (via EmailJS)
   ════════════════════════════════════════════════ */
async function emailInvoice() {
  const custEmail = document.getElementById('custEmail').value;
  if (!custEmail) {
    alert('Please enter a customer email address first.');
    return;
  }

  const EMAILJS_SERVICE_ID = 'service_8xfgsyr';
  const EMAILJS_TEMPLATE_ID = 'template_3p13o8a';
  const EMAILJS_PUBLIC_KEY = 'dx-r9d1YQjLeJ7Awv';

  const data = collectFormData();
  const total = parseFloat(data.total) || 0;
  const rebate = parseFloat(data.rebate) || 0;
  const deposit = parseFloat(data.deposit) || 0;
  const grandTotal = total - rebate;
  const balance = grandTotal - deposit;

  const btn = document.getElementById('btnEmail');
  btn.textContent = 'Sending...';
  btn.disabled = true;

  try {
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      to_email: custEmail,
      customer_name: data.custName || '',
      customer_address: `${data.custAddress || ''}, ${data.custCity || ''}, ${data.custState || ''} ${data.custZip || ''}`,
      customer_phone: data.custPhone || '',
      customer_email: data.custEmail || '',
      invoice_number: data.invNumber || '',
      invoice_date: data.date || '',
      job_company: data.jobCompany || '',
      job_address: `${data.jobAddress || ''}, ${data.jobCity || ''}, ${data.jobState || ''} ${data.jobZip || ''}`,
      job_contact: data.jobContact || '',
      job_phone: data.jobPhone || '',
      film_type: data.filmType || '',
      seal_color: data.sealColor || '',
      install_date: data.installDate || '',
      scope_of_work: data.scopeOfWork || '',
      total: formatCurrency(total),
      rebate: formatCurrency(rebate),
      grand_total: formatCurrency(grandTotal),
      deposit: formatCurrency(deposit),
      balance: formatCurrency(balance),
    }, EMAILJS_PUBLIC_KEY);

    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Sent!`;
    setTimeout(() => {
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> Email Invoice`;
      btn.disabled = false;
    }, 3000);
  } catch (err) {
    alert('Failed to send email: ' + (err.text || err));
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> Email Invoice`;
    btn.disabled = false;
  }
}

/* ════════════════════════════════════════════════
   SAVE INVOICE TO LOCALSTORAGE
   ════════════════════════════════════════════════ */
function saveInvoice() {
  const data = collectFormData();
  const total = parseFloat(data.total) || 0;
  const rebate = parseFloat(data.rebate) || 0;
  const grandTotal = total - rebate;

  const invoice = {
    id: Date.now(),
    ...data,
    grandTotal,
    savedAt: new Date().toISOString()
  };

  const invoices = getInvoices();
  // Check if this invoice number already exists (update it)
  const existingIndex = invoices.findIndex(inv => inv.invNumber === data.invNumber);
  if (existingIndex >= 0) {
    invoices[existingIndex] = invoice;
  } else {
    invoices.unshift(invoice);
    // Increment counter for next invoice
    const counter = parseInt(localStorage.getItem(COUNTER_KEY) || '1000', 10);
    localStorage.setItem(COUNTER_KEY, (counter + 1).toString());
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));

  const btn = document.getElementById('btnSave');
  btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Saved!`;
  setTimeout(() => {
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Save`;
    btn.disabled = false;
  }, 2000);
}

/* ════════════════════════════════════════════════
   HISTORY
   ════════════════════════════════════════════════ */
function initHistory() {
  document.getElementById('historySearch').addEventListener('input', renderHistory);
  document.getElementById('btnExportExcel').addEventListener('click', exportToExcel);
}

function getInvoices() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function renderHistory() {
  const query = (document.getElementById('historySearch').value || '').toLowerCase();
  const invoices = getInvoices();
  const container = document.getElementById('historyList');

  const filtered = invoices.filter(inv =>
    !query ||
    (inv.custName || '').toLowerCase().includes(query) ||
    (inv.invNumber || '').toLowerCase().includes(query) ||
    (inv.jobCompany || '').toLowerCase().includes(query)
  );

  if (filtered.length === 0) {
    container.innerHTML = `<p class="history-empty">${query ? 'No invoices match your search.' : 'No invoices saved yet. Create and save your first invoice!'}</p>`;
    return;
  }

  container.innerHTML = filtered.map(inv => `
    <div class="history-card" data-id="${inv.id}">
      <div class="history-card__info">
        <span class="history-card__number">${inv.invNumber || 'N/A'}</span>
        <span class="history-card__customer">${inv.custName || 'Unknown'} ${inv.jobCompany ? '— ' + inv.jobCompany : ''}</span>
      </div>
      <div class="history-card__meta">
        <span class="history-card__date">${formatDisplayDate(inv.date)}</span>
        <span class="history-card__amount">${formatCurrency(inv.grandTotal || 0)}</span>
      </div>
      <div class="history-card__actions">
        <button class="history-card__btn" onclick="loadInvoice(${inv.id})">Load</button>
        <button class="history-card__btn" onclick="redownloadInvoice(${inv.id})">PDF</button>
        <button class="history-card__btn history-card__btn--delete" onclick="deleteInvoice(${inv.id})">Delete</button>
      </div>
    </div>
  `).join('');
}

function loadInvoice(id) {
  const invoices = getInvoices();
  const inv = invoices.find(i => i.id === id);
  if (!inv) return;

  // Populate form fields
  const fieldMap = {
    invDate: 'date', invNumber: 'invNumber',
    custName: 'custName', custAddress: 'custAddress', custCity: 'custCity',
    custState: 'custState', custZip: 'custZip', custPhone: 'custPhone', custEmail: 'custEmail',
    jobCompany: 'jobCompany', jobContact: 'jobContact', jobAddress: 'jobAddress',
    jobCity: 'jobCity', jobState: 'jobState', jobZip: 'jobZip',
    jobPhone: 'jobPhone', jobEmail: 'jobEmail', jobSubdivision: 'jobSubdivision',
    filmType: 'filmType', sealColor: 'sealColor', installDate: 'installDate',
    installer: 'installer', specialInstructions: 'specialInstructions', scopeOfWork: 'scopeOfWork',
    total: 'total', rebate: 'rebate', deposit: 'deposit',
    depositCheck: 'depositCheck', balanceCheck: 'balanceCheck'
  };

  Object.entries(fieldMap).forEach(([elId, dataKey]) => {
    const el = document.getElementById(elId);
    if (el && inv[dataKey] !== undefined) el.value = inv[dataKey];
  });

  // Recalc grand total display
  const total = parseFloat(inv.total) || 0;
  const rebate = parseFloat(inv.rebate) || 0;
  document.getElementById('grandTotalDisplay').textContent = formatCurrency(total - rebate);

  // Restore worksheet rows
  if (inv.worksheetRows && inv.worksheetRows.length > 0) {
    const body = document.getElementById('wsBody');
    body.innerHTML = '';
    inv.worksheetRows.forEach(row => {
      addWorksheetRow();
      const tr = body.lastElementChild;
      tr.querySelector('[data-field="area"]').value = row.area || '';
      tr.querySelector('[data-field="removal"]').value = row.removal || 0;
      tr.querySelector('[data-field="width"]').value = row.width || 0;
      tr.querySelector('[data-field="height"]').value = row.height || 0;
      tr.querySelector('[data-field="small"]').value = row.small || 0;
      tr.querySelector('[data-field="panes"]').value = row.panes || 0;
      recalcRow(tr);
    });
    recalcWorksheetTotals();
  }

  // Restore film rows
  document.getElementById('wsFilmRows').innerHTML = '';
  if (inv.worksheetFilms && inv.worksheetFilms.length > 0) {
    inv.worksheetFilms.forEach(f => addFilmRow(f.name, f.price, f.rebate, f.cost));
  } else if (inv.worksheetPricing) {
    // Legacy: single film row from old format
    const p = inv.worksheetPricing;
    addFilmRow('Film', p.priceFilm || 0, p.rebateFilm || 0, p.costFilm || 0);
  } else {
    addFilmRow('Film', 13, 0, 11.50);
  }

  // Restore worksheet pricing (non-film)
  if (inv.worksheetPricing) {
    const p = inv.worksheetPricing;
    document.getElementById('wsPriceSeal').value = p.priceSeal || 0;
    document.getElementById('wsRebateSeal').value = p.rebateSeal || 0;
    document.getElementById('wsCostSeal').value = p.costSeal || 0;
    document.getElementById('wsPriceRemoval').value = p.priceRemoval || 0;
    document.getElementById('wsRebateRemoval').value = p.rebateRemoval || 0;
    document.getElementById('wsCostRemoval').value = p.costRemoval || 0;
    document.getElementById('wsPriceSmall').value = p.priceSmall || 0;
    document.getElementById('wsRebateSmall').value = p.rebateSmall || 0;
    document.getElementById('wsCostSmall').value = p.costSmall || 0;
  }
  recalcWorksheetPricing();

  // Switch to create tab
  document.querySelectorAll('.topbar__tab').forEach(t => t.classList.remove('active'));
  document.querySelector('[data-tab="create"]').classList.add('active');
  document.getElementById('tabCreate').style.display = 'block';
  document.getElementById('tabHistory').style.display = 'none';

  // Auto-preview
  generatePreview();
}

function redownloadInvoice(id) {
  loadInvoice(id);
  setTimeout(() => downloadPDF(), 500);
}

function deleteInvoice(id) {
  if (!confirm('Delete this invoice from history?')) return;
  const invoices = getInvoices().filter(i => i.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
  renderHistory();
}

/* ════════════════════════════════════════════════
   EXPORT TO EXCEL
   ════════════════════════════════════════════════ */
function exportToExcel() {
  const invoices = getInvoices();
  if (invoices.length === 0) {
    alert('No invoices to export.');
    return;
  }

  const rows = invoices.map(inv => ({
    'Invoice #': inv.invNumber,
    'Date': inv.date,
    'Customer': inv.custName,
    'Address': inv.custAddress,
    'City': inv.custCity,
    'State': inv.custState,
    'Zip': inv.custZip,
    'Phone': inv.custPhone,
    'Email': inv.custEmail,
    'Company': inv.jobCompany,
    'Contact': inv.jobContact,
    'Film Type': inv.filmType,
    'Installer': inv.installer,
    'Install Date': inv.installDate,
    'Scope': inv.scopeOfWork,
    'Total': inv.total,
    'Rebate': inv.rebate,
    'Grand Total': inv.grandTotal,
    'Deposit': inv.deposit,
    'Balance': (parseFloat(inv.grandTotal) || 0) - (parseFloat(inv.deposit) || 0),
    'Deposit Check #': inv.depositCheck,
    'Balance Check #': inv.balanceCheck
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Invoices');
  XLSX.writeFile(wb, `Integrity_Invoices_${new Date().toISOString().split('T')[0]}.xlsx`);
}

/* ════════════════════════════════════════════════
   HELPERS
   ════════════════════════════════════════════════ */
function collectFormData() {
  const wsRows = [];
  document.querySelectorAll('#wsBody tr').forEach(tr => {
    const area = tr.querySelector('[data-field="area"]')?.value || '';
    const removal = parseFloat(tr.querySelector('[data-field="removal"]')?.value) || 0;
    const width = parseFloat(tr.querySelector('[data-field="width"]')?.value) || 0;
    const height = parseFloat(tr.querySelector('[data-field="height"]')?.value) || 0;
    const small = parseFloat(tr.querySelector('[data-field="small"]')?.value) || 0;
    const panes = parseFloat(tr.querySelector('[data-field="panes"]')?.value) || 0;
    const sf = tr.querySelector('[data-field="sf"]')?.textContent || '0';
    const linear = tr.querySelector('[data-field="linear"]')?.textContent || '0';

    // Only include rows with some data
    if (area || width || height || panes) {
      wsRows.push({ area, removal, width, height, small, panes, sf, linear });
    }
  });

  return {
    date: document.getElementById('invDate').value,
    invNumber: document.getElementById('invNumber').value,
    custName: document.getElementById('custName').value,
    custAddress: document.getElementById('custAddress').value,
    custCity: document.getElementById('custCity').value,
    custState: document.getElementById('custState').value,
    custZip: document.getElementById('custZip').value,
    custPhone: document.getElementById('custPhone').value,
    custEmail: document.getElementById('custEmail').value,
    jobCompany: document.getElementById('jobCompany').value,
    jobContact: document.getElementById('jobContact').value,
    jobAddress: document.getElementById('jobAddress').value,
    jobCity: document.getElementById('jobCity').value,
    jobState: document.getElementById('jobState').value,
    jobZip: document.getElementById('jobZip').value,
    jobPhone: document.getElementById('jobPhone').value,
    jobEmail: document.getElementById('jobEmail').value,
    jobSubdivision: document.getElementById('jobSubdivision').value,
    filmType: document.getElementById('filmType').value,
    sealColor: document.getElementById('sealColor').value,
    installDate: document.getElementById('installDate').value,
    installer: document.getElementById('installer').value,
    specialInstructions: document.getElementById('specialInstructions').value,
    scopeOfWork: document.getElementById('scopeOfWork').value,
    total: document.getElementById('total').value,
    rebate: document.getElementById('rebate').value,
    deposit: document.getElementById('deposit').value,
    depositCheck: document.getElementById('depositCheck').value,
    balanceCheck: document.getElementById('balanceCheck').value,
    worksheetRows: wsRows,
    worksheetFilms: Array.from(document.querySelectorAll('.ws-film-row')).map(row => ({
      name: row.querySelector('.film-name-input').value,
      price: row.querySelector('.film-price').value,
      rebate: row.querySelector('.film-rebate').value,
      cost: row.querySelector('.film-cost').value
    })),
    worksheetPricing: {
      priceSeal: document.getElementById('wsPriceSeal').value,
      rebateSeal: document.getElementById('wsRebateSeal').value,
      costSeal: document.getElementById('wsCostSeal').value,
      priceRemoval: document.getElementById('wsPriceRemoval').value,
      rebateRemoval: document.getElementById('wsRebateRemoval').value,
      costRemoval: document.getElementById('wsCostRemoval').value,
      priceSmall: document.getElementById('wsPriceSmall').value,
      rebateSmall: document.getElementById('wsRebateSmall').value,
      costSmall: document.getElementById('wsCostSmall').value
    }
  };
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text || '';
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
