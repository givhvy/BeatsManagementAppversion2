// Restore beatstars-done-folders data
// Run this in the Electron DevTools Console (View > Toggle Developer Tools)

const doneFolders = [
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\page-48",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\C2sub",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\C11sub",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\C21sub",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\C22sub",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\C23sub",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\C28",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\C29",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\C32sub",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\C34sub",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\page-1",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\page-2",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\page-3",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\page-4",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\page-5",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\page-6",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\page-7",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\page-8",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\page-9",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\page-10",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\page-11",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\page-12",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\page-13",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\page-14",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\page-15",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\page-16",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\page-17",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\page-18",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\page-19",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\page-20",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\page-21",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\page-22",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\page-23",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\page-24",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\page-25",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\page-26",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\page-27",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\page-28",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\page-29",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\page-30",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\page-31",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\page-32",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\page-33checkout",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\page-34",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\page-35",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\page-36",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\page-37",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\page-38",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\page-39",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\page-40",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\Page-41",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\page-42",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\page-43",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\page-44",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\page-45",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\page-46",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\page-47",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\page-49",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\page-50",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\page-51",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\page-52",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\page-53",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\page-54",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\page-55",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\page-56",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\C195",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\C194",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\C190",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\C191",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\C192",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\C193",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\C180",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\C181",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\C182",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\C183",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\C184",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\C185",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\C186",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\C187",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\C188",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\C189",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\C123",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\C124",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\C125",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\C130",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\C131",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\C134",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\C135",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\C137",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\C138",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\C150",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\C151",
  "F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs\\C236"
];

// Save to localStorage
localStorage.setItem('beatstars-done-folders', JSON.stringify(doneFolders));

// Update the app state
if (typeof beatstarsState !== 'undefined') {
  beatstarsState.doneFolders = doneFolders;
  console.log('✅ Updated beatstarsState.doneFolders');
}

// Refresh the UI
if (typeof scanBeatstarsFolders === 'function') {
  scanBeatstarsFolders();
  console.log('✅ Refreshed folder list');
}

if (typeof updateProcessAllFoldersButton === 'function') {
  updateProcessAllFoldersButton();
  console.log('✅ Updated Process All Folders button');
}

console.log(`✅ Restored ${doneFolders.length} done folders to localStorage`);
console.log('Current localStorage value:', localStorage.getItem('beatstars-done-folders'));
