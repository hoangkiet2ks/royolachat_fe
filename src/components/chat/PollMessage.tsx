import React, { useState } from 'react';
import { Plus, Check, Users } from 'lucide-react';

export interface PollVote {
  id: number;
  userId: number;
}

export interface PollOption {
  id: number;
  text: string;
  order: number;
  votes: PollVote[];
}

export interface PollData {
  id: number;
  title: string;
  options: PollOption[];
}

interface PollMessageProps {
  poll: PollData;
  currentUserId: number;
  onVote: (pollId: number, optionId: number) => void;
  onAddOption: (pollId: number, text: string) => void;
}

export const PollMessage: React.FC<PollMessageProps> = ({ poll, currentUserId, onVote, onAddOption }) => {
  const [isAddingOption, setIsAddingOption] = useState(false);
  const [newOptionText, setNewOptionText] = useState('');

  const totalVotes = poll.options.reduce((acc, opt) => acc + opt.votes.length, 0);

  const handleVote = (optionId: number) => {
    onVote(poll.id, optionId);
  };

  const handleAddOptionSubmit = () => {
    if (newOptionText.trim() === '') return;
    onAddOption(poll.id, newOptionText.trim());
    setNewOptionText('');
    setIsAddingOption(false);
  };

  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px', width: '100%', maxWidth: '340px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', fontFamily: 'sans-serif' }}>

      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <h4 style={{ fontWeight: 600, fontSize: '16px', color: '#050505', lineHeight: '1.375', margin: '0 0 4px 0' }}>{poll.title}</h4>
        <p style={{ fontSize: '14px', color: '#65676b', margin: '0' }}>Chọn nhiều phương án</p>

        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', color: '#0064d1', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
          {totalVotes} người bình chọn
          <svg style={{ width: '16px', height: '16px', marginLeft: '4px' }} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      </div>

      {/* Options List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
        {poll.options.map(option => {
          const hasVoted = option.votes.some(v => v.userId === currentUserId);
          const voteCount = option.votes.length;

          return (
            <div key={option.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                onClick={() => handleVote(option.id)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  backgroundColor: hasVoted ? '#cde2fe' : '#f0f2f5',
                  transition: 'background-color 0.2s'
                }}
              >
                <span style={{ fontSize: '15px', color: '#050505' }}>{option.text}</span>
              </div>

              <div style={{ width: '24px', textAlign: 'right', fontSize: '15px', color: '#050505' }}>
                {voteCount}
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      {isAddingOption ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <input
            autoFocus
            type="text"
            placeholder="Nhập lựa chọn mới..."
            value={newOptionText}
            onChange={(e) => setNewOptionText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddOptionSubmit()}
            style={{ flex: 1, padding: '8px 12px', fontSize: '14px', border: '1px solid #d1d5db', borderRadius: '6px', outline: 'none' }}
          />
          <button
            onClick={handleAddOptionSubmit}
            style={{ padding: '8px 12px', backgroundColor: '#e5f1ff', color: '#0064d1', fontSize: '14px', fontWeight: 600, border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            Thêm
          </button>
          <button
            onClick={() => setIsAddingOption(false)}
            style={{ padding: '8px 12px', backgroundColor: '#e4e6eb', color: '#050505', fontSize: '14px', fontWeight: 600, border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            Hủy
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsAddingOption(true)}
          style={{ marginBottom: '12px', fontSize: '14px', fontWeight: 600, color: '#0064d1', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}
        >
          <Plus size={16} strokeWidth={2.5} /> Thêm lựa chọn
        </button>
      )}

      {/* Main Action Button */}
    </div>
  );
};
