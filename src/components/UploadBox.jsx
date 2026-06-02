
import { useRef, useState } from 'react';
import { api } from '../services/api.js';
import { Button } from './UI.jsx';

const labelMap = {
  VEHICLE_PHOTO: 'Vehicle photos',
  DAMAGE_PHOTO: 'Damage photos',
  ASSESSMENT_PHOTO: 'Assessment photos',
  REPAIR_PHOTO: 'Repair photos',
  INVOICE: 'Invoices',
  PURCHASE_ORDER: 'Purchase Orders',
  GRN: 'GRNs'
};

export default function UploadBox({ entityType='GENERAL', entityId='', category='VEHICLE_PHOTO', title, onUploaded }) {
  const inputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function upload() {
    if (!inputRef.current?.files?.length) { setMessage('Please choose at least one file.'); return; }
    setBusy(true); setMessage('Uploading...');
    try {
      const uploaded = [];
      for (const file of Array.from(inputRef.current.files)) {
        const result = await api.attachments.upload({ file, entityType, entityId, category });
        uploaded.push(result);
      }
      setFiles(prev => [...uploaded, ...prev]);
      setMessage(`${uploaded.length} file(s) uploaded successfully.`);
      inputRef.current.value = '';
      onUploaded?.(uploaded);
    } catch (err) {
      setMessage(err.message || 'Upload failed.');
    } finally { setBusy(false); }
  }

  return <div className="upload-panel">
    <div className="upload-panel-head">
      <div><b>{title || labelMap[category] || 'Files'}</b><span>Saved in database and file storage</span></div>
      <Button variant="secondary" type="button" onClick={() => inputRef.current?.click()}>Choose files</Button>
    </div>
    <input ref={inputRef} className="hidden-file" type="file" multiple onChange={() => setMessage(`${inputRef.current.files.length} file(s) selected`)} />
    <div className="upload-actions"><Button type="button" disabled={busy} onClick={upload}>{busy ? 'Uploading...' : 'Upload'}</Button>{message && <small>{message}</small>}</div>
    {!!files.length && <div className="upload-list">{files.map(f => <a key={f.id || f.filePath} href={f.filePath} target="_blank" rel="noreferrer">{f.fileName || f.originalName || 'Uploaded file'}</a>)}</div>}
  </div>;
}
