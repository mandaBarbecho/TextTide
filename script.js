// Initialize PDF.js worker securely
if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// Memory & LocalStorage State
let processedFiles = JSON.parse(localStorage.getItem('texttide_files') || '[]');
let isLoggedIn = localStorage.getItem('texttide_google_auth') === 'true';

// DOM Elements
const homeView = document.getElementById('home-view');
const resultsView = document.getElementById('results-view');
const navHomeBtn = document.getElementById('nav-home-btn');
const backToUploadBtn = document.getElementById('back-to-upload-btn');
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const browseBtn = document.getElementById('browse-btn');
const loadingSpinner = document.getElementById('loading-spinner');
const loadingText = document.getElementById('loading-text');
const aiStatusText = document.getElementById('ai-status');
const statusDot = document.getElementById('status-dot');
const clearHistoryBtn = document.getElementById('clear-history-btn');
const googleLoginBtn = document.getElementById('google-login-btn');
const loggedOutState = document.getElementById('logged-out-state');
const loggedInState = document.getElementById('logged-in-state');

// Handle Google Auth Toggle
function updateAuthUI() {
  if (isLoggedIn) {
    loggedOutState.classList.add('hidden');
    loggedInState.classList.remove('hidden');
    updateAIStatus("Authenticated", "bg-emerald-500");
  } else {
    loggedOutState.classList.remove('hidden');
    loggedInState.classList.add('hidden');
    updateAIStatus("Ready", "bg-emerald-500");
  }
}

googleLoginBtn.addEventListener('click', () => {
  isLoggedIn = !isLoggedIn;
  localStorage.setItem('texttide_google_auth', isLoggedIn.toString());
  updateAuthUI();
});

// Navigation Event Listeners
navHomeBtn.addEventListener('click', showHomeView);
backToUploadBtn.addEventListener('click', showHomeView);
browseBtn.addEventListener('click', () => fileInput.click());

clearHistoryBtn.addEventListener('click', () => {
  if (confirm("Clear all processed document history?")) {
    processedFiles = [];
    localStorage.removeItem('texttide_files');
    renderSidebarList();
    showHomeView();
  }
});

// Demo Buttons
document.getElementById('sample-1-btn').addEventListener('click', () => {
  processMockDemo("AI_Research_Proposal.pdf", `
    Title: Scalable AI Document Processing Architectures.
    Abstract: Capstone research by Group G-3. This paper proposes a hybrid client-side parsing pipeline integrated with modern transformer architectures.
    Key Findings: Automated text extraction reduces manual review time by 65%. Browser-native parsing preserves privacy while minimizing backend computation costs.
  `);
});

document.getElementById('sample-2-btn').addEventListener('click', () => {
  processMockDemo("Q3_Quarterly_Financials.docx", `
    Q3 Financial Analysis Executive Overview.
    Revenue increased by 18% quarter-over-quarter driven by software enterprise subscriptions. Operational expenses were reduced by 7% due to process automation.
    Strategic Goals: Expand deployment across educational institutions in Q4 while maintaining 99.9% platform availability.
  `);
});

// Drag and Drop Handling
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-active');
});

dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-active'));

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-active');
  if (e.dataTransfer.files.length > 0) handleFileUpload(e.dataTransfer.files[0]);
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) handleFileUpload(e.target.files[0]);
});

// Navigation Functions
function showHomeView() {
  homeView.classList.remove('hidden');
  resultsView.classList.add('hidden');
}

function showResultsView(fileId) {
  const file = processedFiles.find(f => f.id === fileId);
  if (!file) return;

  document.getElementById('doc-title').innerText = file.name;
  document.getElementById('doc-summary').innerHTML = file.summary;

  // Render Notes
  const notesContainer = document.getElementById('doc-notes');
  notesContainer.innerHTML = file.notes.map(note => `
    <li class="flex items-start gap-2 bg-slate-900 p-2.5 rounded-xl border border-slate-800/80">
      <span class="text-emerald-400 font-bold">•</span>
      <span class="leading-snug">${escapeHtml(note)}</span>
    </li>
  `).join('');

  // Render FULL DOCUMENT with Highlights
  const highlightsContainer = document.getElementById('doc-highlights');
  highlightsContainer.innerHTML = `
    <div class="full-document-view space-y-3 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 text-sm leading-relaxed text-slate-300">
      ${file.fullAnnotatedText}
    </div>
  `;

  homeView.classList.add('hidden');
  resultsView.classList.remove('hidden');
}

// File Reader for PDF, DOCX, and TXT
async function extractTextFromFile(file) {
  const fileType = file.name.split('.').pop().toLowerCase();

  if (fileType === 'txt') {
    return await file.text();
  } 
  
  if (fileType === 'docx') {
    if (!window.mammoth) throw new Error("Mammoth library missing for Word documents.");
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
    return result.value;
  } 
  
  if (fileType === 'pdf') {
    if (!window.pdfjsLib) throw new Error("PDF.js library missing.");
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      fullText += content.items.map(item => item.str).join(' ') + '\n';
    }
    return fullText;
  }

  return await file.text();
}

// Offline Client-Side Intelligent Processing Engine
function generateLocalSummary(rawText, fileName) {
  updateAIStatus("Processing Locally...", "bg-emerald-500");

  // Extract clean lines/paragraphs to preserve the entire file layout
  const rawLines = rawText
    .split(/\n+/)
    .map(line => line.trim())
    .filter(line => line.length > 0);

  // Split into individual sentences for executive summary & notes
  const sentences = rawText
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 15);

  const total = sentences.length;
  
  // Executive Summary
  const summaryP1 = sentences.slice(0, Math.min(2, total)).join(' ') || `${fileName} document content extracted successfully.`;
  const summaryP2 = sentences.slice(Math.min(2, total), Math.min(4, total)).join(' ') || "Analysis completed locally via TextTide client-side engine.";
  
  // Key Notes
  const notes = sentences.slice(0, Math.min(4, total));
  if (notes.length < 2) {
    notes.push("Processed locally without external API requirements.");
    notes.push("Document parsing completed in browser memory.");
  }

  // --- RENDERS THE ENTIRE FILE CONTENT WITH IN-LINE HIGHLIGHTS ---
  const fullAnnotatedText = rawLines.map((line, idx) => {
    // Logic to determine if a line/sentence gets highlighted
    const isImportant = 
      idx === 0 || 
      /example|definition|key|summary|important|result|responsibility|conscience|title|abstract/i.test(line);

    if (isImportant) {
      // Highlights key lines with background tint and left accent bar
      return `<p class="bg-amber-400/10 text-amber-200 border-l-2 border-amber-400 pl-3 py-1.5 rounded-r-lg font-medium">${escapeHtml(line)}</p>`;
    } else {
      // Renders standard lines normally
      return `<p class="py-0.5 px-1">${escapeHtml(line)}</p>`;
    }
  }).join('');

  return {
    summary: `<p>${escapeHtml(summaryP1)}</p><p>${escapeHtml(summaryP2)}</p>`,
    notes: notes,
    fullAnnotatedText: fullAnnotatedText
  };
}

// Main Upload Handler
async function handleFileUpload(file) {
  loadingSpinner.classList.remove('hidden');
  loadingText.innerText = `Extracting text from ${file.name}...`;

  try {
    const extractedText = await extractTextFromFile(file);
    if (!extractedText.trim()) throw new Error("Document appears empty.");

    loadingText.innerText = `Generating summary, notes, & highlights...`;
    const aiResult = generateLocalSummary(extractedText, file.name);

    const documentRecord = {
      id: Date.now().toString(),
      name: file.name,
      summary: aiResult.summary,
      notes: aiResult.notes || [],
      fullAnnotatedText: aiResult.fullAnnotatedText || ''
    };

    processedFiles.unshift(documentRecord);
    saveState();
    renderSidebarList();
    showResultsView(documentRecord.id);
    updateAIStatus("Ready", "bg-emerald-500");

  } catch (err) {
    console.error(err);
    alert("TextTide Error: " + err.message);
    updateAIStatus("Error", "bg-red-500");
  } finally {
    loadingSpinner.classList.add('hidden');
    fileInput.value = '';
  }
}

// Demo Handler
async function processMockDemo(name, mockText) {
  loadingSpinner.classList.remove('hidden');
  loadingText.innerText = `Analyzing ${name}...`;

  try {
    const aiResult = generateLocalSummary(mockText, name);

    const docRecord = {
      id: Date.now().toString(),
      name: name,
      summary: aiResult.summary,
      notes: aiResult.notes,
      fullAnnotatedText: aiResult.fullAnnotatedText
    };

    processedFiles.unshift(docRecord);
    saveState();
    renderSidebarList();
    showResultsView(docRecord.id);
    updateAIStatus("Ready", "bg-emerald-500");
  } catch (err) {
    alert("Demo error: " + err.message);
  } finally {
    loadingSpinner.classList.add('hidden');
  }
}

// Utilities
function saveState() {
  localStorage.setItem('texttide_files', JSON.stringify(processedFiles));
}

function updateAIStatus(msg, dotClass) {
  aiStatusText.innerText = msg;
  statusDot.className = `inline-block w-2 h-2 rounded-full ${dotClass}`;
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderSidebarList() {
  const listEl = document.getElementById('file-list');
  if (processedFiles.length === 0) {
    listEl.innerHTML = `<li class="text-[11px] text-slate-600 italic px-2">No documents summarized</li>`;
    return;
  }

  listEl.innerHTML = processedFiles.map(file => `
    <li>
      <button onclick="showResultsView('${file.id}')" class="w-full text-left px-2.5 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white truncate flex items-center gap-2 transition">
        <i data-lucide="file-text" class="w-3.5 h-3.5 text-indigo-400 shrink-0"></i>
        <span class="truncate">${escapeHtml(file.name)}</span>
      </button>
    </li>
  `).join('');

  if (window.lucide) {
    lucide.createIcons();
  }
}

// Initial Run
if (window.lucide) {
  lucide.createIcons();
}
renderSidebarList();
updateAuthUI();