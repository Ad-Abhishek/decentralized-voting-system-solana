import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

const CreatePoll: React.FC = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [options, setOptions] = useState(['', '']);
  const navigate = useNavigate();

  const handleAddOption = () => {
    setOptions([...options, '']);
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const filteredOptions = options.filter((opt) => opt.trim() !== '');
      if (filteredOptions.length < 2) {
        toast.error('Please provide at least 2 options');
        return;
      }

      const response = await axios.post('http://localhost:5000/api/polls', {
        title,
        description,
        startTime,
        endTime,
        options: filteredOptions,
      });

      toast.success('Poll created successfully!');
      navigate(`/poll/${response.data.poll.id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create poll');
    }
  };

  return (
    <div className="create-poll">
      <h2>Create New Poll</h2>
      <form onSubmit={handleSubmit} className="poll-form">
        <div className="form-group">
          <label>Poll Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Start Time</label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>End Time</label>
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label>Options</label>
          {options.map((option, index) => (
            <div key={index} className="option-input">
              <input
                type="text"
                value={option}
                onChange={(e) => handleOptionChange(index, e.target.value)}
                placeholder={`Option ${index + 1}`}
                required
              />
              {options.length > 2 && (
                <button
                  type="button"
                  onClick={() => handleRemoveOption(index)}
                  className="btn-remove"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={handleAddOption} className="btn-secondary">
            + Add Option
          </button>
        </div>

        <button type="submit" className="btn-primary">
          Create Poll
        </button>
      </form>
    </div>
  );
};

export default CreatePoll;
