import * as XLSX from 'xlsx';

/**
 * Trigger browser file download from Blob
 */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Convert JSON array of objects to standard CSV string
 * Includes UTF-8 BOM (\uFEFF) for 100% compatibility with MS Excel & multilingual characters
 */
export function exportToCSV(data, filename = 'export.csv') {
  if (!data || data.length === 0) {
    alert('No data available to export.');
    return;
  }

  const headers = Object.keys(data[0]);
  const csvRows = [];

  // Header row
  csvRows.push(
    headers
      .map((header) => `"${String(header).replace(/"/g, '""')}"`)
      .join(',')
  );

  // Data rows
  for (const row of data) {
    const values = headers.map((header) => {
      const val = row[header] === null || row[header] === undefined ? '' : row[header];
      return `"${String(val).replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(','));
  }

  const csvString = '\uFEFF' + csvRows.join('\r\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
}

/**
 * Export JSON array of objects to genuine Excel (.xlsx) workbook using SheetJS
 * Auto-sizes columns to fit data cleanly
 */
export function exportToExcel(data, filename = 'export.xlsx', sheetName = 'Sheet1') {
  if (!data || data.length === 0) {
    alert('No data available to export.');
    return;
  }

  // Create worksheet from json
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Auto-calculate column widths
  const headers = Object.keys(data[0]);
  const colWidths = headers.map((key) => {
    let maxLen = key.length;
    for (const row of data) {
      const val = row[key];
      if (val !== undefined && val !== null) {
        const strLen = String(val).length;
        if (strLen > maxLen) maxLen = Math.min(strLen, 50); // cap width at 50
      }
    }
    return { wch: Math.max(maxLen + 3, 12) };
  });
  worksheet['!cols'] = colWidths;

  // Create workbook and append sheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));

  // Generate buffer and trigger download
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  downloadBlob(blob, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}

/**
 * Formatter for Platform Booking & Revenue Records
 */
export function formatBookingRecord(b) {
  const dateFormatted = b.date
    ? (b.date instanceof Date ? b.date.toISOString().slice(0, 10) : String(b.date).slice(0, 10))
    : 'N/A';

  const amountNum = Number(b.amount || b.totalAmount || 0);

  return {
    'Booking Reference': b.id ? `#${b.id.slice(-8).toUpperCase()}` : 'N/A',
    'Booking ID': b.id || b.bookingId || 'N/A',
    'Turf Venue': b.turfName || b.turf?.name || 'Turf Facility',
    'Sport': b.sport || b.turfType || 'Cricket',
    'Booking Date': dateFormatted,
    'Slot Time': b.startTime && b.endTime ? `${b.startTime} - ${b.endTime}` : (b.startTime || 'N/A'),
    'Amount (INR)': amountNum,
    'Booking Status': (b.status || b.bookingStatus || 'pending').toUpperCase(),
    'Payment Status': (b.paymentStatus || 'unpaid').toUpperCase(),
    'Payment Method': (b.paymentMode || b.paymentMethod || 'online').toUpperCase(),
    'Customer Name': b.userName || b.user?.name || 'Player',
    'Customer Phone': b.userPhone || b.user?.phone || 'N/A',
    'Customer UID': b.userId || 'N/A',
    'Venue Address': b.turfAddress || b.turf?.address || b.turf?.city || 'Tamil Nadu',
    'Booked At': b.createdAt ? new Date(b.createdAt).toLocaleString('en-IN') : 'N/A',
  };
}

/**
 * Formatter for Turf Partner & Vendor Registration Records
 */
export function formatVendorRecord(v) {
  return {
    'Vendor UID': v.uid || v.id || 'N/A',
    'Partner Name': v.name || 'Turf Partner',
    'Business Entity': v.businessName || 'N/A',
    'Email Address': v.email || 'N/A',
    'Phone Number': v.phone || 'N/A',
    'Linked Turf Facility': v.turfName || v.turf?.name || 'No Turf Linked',
    'Turf City / Location': v.turf?.city || v.city || 'Tamil Nadu',
    'KYC Status': (v.kycStatus || 'pending').toUpperCase(),
    'Subscription Status': v.hasPaidSubscription || v.subscription?.active ? 'PAID' : 'INACTIVE',
    'Subscription Plan': v.subscription?.planName || v.subscription?.planId || 'Standard',
    'Facility Count': v.turfs?.length || (v.turfName ? 1 : 0),
    'Registration Date': v.createdAt ? new Date(v.createdAt).toLocaleDateString('en-IN') : 'N/A',
  };
}
