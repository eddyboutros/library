const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR = path.join(__dirname, '..', 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

class ExcelStore {
  constructor(filename, sheetName = 'Sheet1') {
    this.filePath = path.join(DATA_DIR, filename);
    this.sheetName = sheetName;
    this._lock = false;
  }

  async _waitForLock() {
    let retries = 0;
    while (this._lock && retries < 50) {
      await new Promise(r => setTimeout(r, 100));
      retries++;
    }
    this._lock = true;
  }

  _releaseLock() {
    this._lock = false;
  }

  _readWorkbook() {
    if (!fs.existsSync(this.filePath)) {
      return null;
    }
    return XLSX.readFile(this.filePath);
  }

  _writeWorkbook(data) {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, this.sheetName);
    XLSX.writeFile(wb, this.filePath);
  }

  readAll() {
    const wb = this._readWorkbook();
    if (!wb) return [];
    const sheet = wb.Sheets[this.sheetName];
    if (!sheet) return [];
    return XLSX.utils.sheet_to_json(sheet);
  }

  findById(id) {
    const records = this.readAll();
    return records.find(r => r.id === id) || null;
  }

  find(predicate) {
    const records = this.readAll();
    return records.filter(predicate);
  }

  findOne(predicate) {
    const records = this.readAll();
    return records.find(predicate) || null;
  }

  search(query, fields) {
    if (!query) return this.readAll();
    const q = query.toLowerCase();
    return this.find(record =>
      fields.some(field => {
        const val = record[field];
        return val && String(val).toLowerCase().includes(q);
      })
    );
  }

  async create(record) {
    await this._waitForLock();
    try {
      const records = this.readAll();
      const newRecord = {
        id: uuidv4(),
        ...record,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      records.push(newRecord);
      this._writeWorkbook(records);
      return newRecord;
    } finally {
      this._releaseLock();
    }
  }

  async createMany(items) {
    await this._waitForLock();
    try {
      const records = this.readAll();
      const newRecords = items.map(item => ({
        id: uuidv4(),
        ...item,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      records.push(...newRecords);
      this._writeWorkbook(records);
      return newRecords;
    } finally {
      this._releaseLock();
    }
  }

  async update(id, updates) {
    await this._waitForLock();
    try {
      const records = this.readAll();
      const idx = records.findIndex(r => r.id === id);
      if (idx === -1) return null;
      records[idx] = { ...records[idx], ...updates, updatedAt: new Date().toISOString() };
      this._writeWorkbook(records);
      return records[idx];
    } finally {
      this._releaseLock();
    }
  }

  async delete(id) {
    await this._waitForLock();
    try {
      const records = this.readAll();
      const idx = records.findIndex(r => r.id === id);
      if (idx === -1) return false;
      records.splice(idx, 1);
      this._writeWorkbook(records);
      return true;
    } finally {
      this._releaseLock();
    }
  }

  async bulkWrite(records) {
    await this._waitForLock();
    try {
      this._writeWorkbook(records);
    } finally {
      this._releaseLock();
    }
  }

  count() {
    return this.readAll().length;
  }
}

const booksStore = new ExcelStore('books.xlsx', 'Books');
const usersStore = new ExcelStore('users.xlsx', 'Users');
const transactionsStore = new ExcelStore('transactions.xlsx', 'Transactions');
const reviewsStore = new ExcelStore('reviews.xlsx', 'Reviews');
const chaptersStore = new ExcelStore('chapters.xlsx', 'Chapters');

module.exports = { ExcelStore, booksStore, usersStore, transactionsStore, reviewsStore, chaptersStore, DATA_DIR };
