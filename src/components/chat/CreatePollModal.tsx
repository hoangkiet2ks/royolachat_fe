import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';

interface CreatePollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, options: string[]) => void;
}

export const CreatePollModal: React.FC<CreatePollModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [title, setTitle] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);

  if (!isOpen) return null;

  const handleAddOption = () => {
    setOptions([...options, '']);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = () => {
    const validOptions = options.filter(o => o.trim() !== '');
    if (title.trim() === '' || validOptions.length < 2) {
      alert('Vui lòng nhập câu hỏi và ít nhất 2 lựa chọn hợp lệ.');
      return;
    }
    onSubmit(title.trim(), validOptions);
    // Reset
    setTitle('');
    setOptions(['', '']);
    onClose();
  };

  const isFormValid = title.trim() !== '' && options.filter(o => o.trim() !== '').length >= 2;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', width: '100%', maxWidth: '500px', overflow: 'hidden', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif' }}>

        {/* Header */}
        <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb' }}>
          <h3 style={{ fontWeight: 700, fontSize: '17px', color: '#050505', margin: 0 }}>Tạo bình chọn</h3>
          <button onClick={onClose} style={{ padding: '4px', background: 'none', border: 'none', borderRadius: '50%', color: '#4b5563', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={24} strokeWidth={1.5} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
          {/* Question */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '15px', color: '#050505', marginBottom: '8px' }}>Chủ đề bình chọn</label>
            <div style={{ position: 'relative', border: '1px solid #0064d1', borderRadius: '6px' }}>
              <textarea
                placeholder="Đặt câu hỏi bình chọn"
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 200))}
                style={{ width: '100%', padding: '12px', borderRadius: '6px', outline: 'none', border: 'none', resize: 'none', minHeight: '100px', fontSize: '15px', color: '#050505', fontFamily: 'inherit' }}
              />
              <div style={{ position: 'absolute', bottom: '8px', right: '8px', fontSize: '13px', color: '#65676b' }}>
                {title.length}/200
              </div>
            </div>
          </div>

          {/* Options */}
          <div>
            <label style={{ display: 'block', fontSize: '15px', color: '#050505', marginBottom: '8px' }}>Các lựa chọn</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {options.map((option, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder={`Lựa chọn ${index + 1}`}
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    style={{ flex: 1, padding: '10px 12px', border: '1px solid #ced0d4', borderRadius: '6px', outline: 'none', fontSize: '15px', color: '#050505' }}
                  />
                  {options.length > 2 && (
                    <button
                      onClick={() => handleRemoveOption(index)}
                      style={{ padding: '8px', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer' }}
                      title="Xóa lựa chọn"
                    >
                      <X size={20} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={handleAddOption}
              style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '15px', color: '#0064d1', fontWeight: 600, padding: '6px 8px', borderRadius: '8px', background: 'none', border: 'none', cursor: 'pointer', marginLeft: '-8px' }}
            >
              <Plus size={20} strokeWidth={2.5} /> Thêm lựa chọn
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={onClose}
              style={{ padding: '10px 24px', fontSize: '15px', fontWeight: 600, color: '#050505', backgroundColor: '#e4e6eb', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              Hủy
            </button>
            <button
              onClick={handleSubmit}
              disabled={!isFormValid}
              style={{
                padding: '10px 24px', fontSize: '15px', fontWeight: 600, borderRadius: '6px', border: 'none',
                backgroundColor: isFormValid ? '#0064d1' : '#aac9ff',
                color: '#ffffff',
                cursor: isFormValid ? 'pointer' : 'not-allowed'
              }}
            >
              Tạo bình chọn
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
