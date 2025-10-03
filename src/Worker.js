// /src/components/Worker.js

onmessage = async function (e) {
  const { files } = e.data;

  // Initialize IndexedDB
  const db = await openDatabase();

  // Process each file
  for (const file of files) {
    const data = await processFile(file);
    await storeInIndexedDB(db, data);
  }

  postMessage({ status: 'done' });
};

async function openDatabase() {
  // Open or create IndexedDB database
  return await openDB('excelDB', 1, {
    upgrade(db) {
      db.createObjectStore('dataStore', { keyPath: 'id', autoIncrement: true });
    },
  });
}

async function processFile(file) {
  // Process the Excel file and return data
  const zip = await JSZip.loadAsync(file);
  const excelFiles = Object.keys(zip.files).filter((f) => f.endsWith('.xlsx') || f.endsWith('.xls'));

  let jsonData = [];
  for (const filename of excelFiles) {
    const fileData = await zip.files[filename].async('arraybuffer');
    const workbook = XLSX.read(fileData, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const sheetData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    jsonData = [...jsonData, ...sheetData];
  }

  return jsonData;
}

async function storeInIndexedDB(db, data) {
  const tx = db.transaction('dataStore', 'readwrite');
  const store = tx.objectStore('dataStore');
  data.forEach((row) => store.add(row));
  await tx.done;
}
