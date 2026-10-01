import { useState } from 'react';

/** 将图片压缩到最长边 maxDim，返回 jpeg data URL，避免请求体过大 */
function downscaleImage(file, maxDim = 1000, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function CompleteTaskModal({ task, submitting, onClose, onSubmit }) {
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);

  const pick = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      setPhoto(await downscaleImage(file));
    } catch {
      /* 忽略图片处理失败 */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal" style={{ textAlign: 'left' }} onClick={e => e.stopPropagation()}>
        <div className="center" style={{ fontSize: 17, fontWeight: 700 }}>
          🎯 完成任务
        </div>
        <div className="center muted mt-8" style={{ fontSize: 13 }}>
          {task.name}
        </div>

        <label className="field__label mt-16">📝 备注（选填）</label>
        <textarea
          className="textarea"
          placeholder="说说你是怎么完成的~"
          value={note}
          onChange={e => setNote(e.target.value)}
        />

        <label className="field__label mt-12">📷 拍照留证据（选填）</label>
        {photo ? (
          <div className="center">
            <img src={photo} alt="完成证据" style={{ maxWidth: '100%', borderRadius: 12 }} />
            <button className="btn btn--ghost btn--sm mt-8" onClick={() => setPhoto(null)}>
              重新拍摄
            </button>
          </div>
        ) : (
          <label className="btn btn--ghost btn--block" style={{ cursor: 'pointer' }}>
            {busy ? '处理中...' : '📷 拍照 / 选图'}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={pick}
              style={{ display: 'none' }}
            />
          </label>
        )}

        <div className="row mt-16">
          <button className="btn btn--ghost grow" onClick={onClose}>
            取消
          </button>
          <button className="btn btn--primary grow" disabled={submitting} onClick={() => onSubmit(note, photo)}>
            {submitting ? '提交中...' : '✅ 确认完成'}
          </button>
        </div>
      </div>
    </div>
  );
}
