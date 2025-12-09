import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

interface Option {
  id: number;
  optionText: string;
  optionIndex: number;
}

interface Poll {
  id: number;
  title: string;
  description: string;
  status: string;
  startTime: string;
  endTime: string;
  options: Option[];
}

interface Result {
  optionText: string;
  optionIndex: number;
  voteCount: number;
}

const PollDetails: React.FC = () => {
  const { id } = useParams();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const { publicKey, signTransaction } = useWallet();
  const { token } = useAuth();

  useEffect(() => {
    fetchPoll();
    fetchResults();
  }, [id]);

  const fetchPoll = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/polls/${id}`);
      setPoll(response.data.poll);
    } catch (error) {
      toast.error('Failed to fetch poll');
    }
  };

  const fetchResults = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/polls/${id}/results`);
      setResults(response.data.results);
    } catch (error) {
      console.error('Failed to fetch results');
    }
  };

  const handleVote = async () => {
    if (!token) {
      toast.error('Please login to vote');
      return;
    }

    if (!publicKey) {
      toast.error('Please connect your wallet');
      return;
    }

    if (selectedOption === null) {
      toast.error('Please select an option');
      return;
    }

    try {
      const mockSignature = `${Date.now()}_${Math.random().toString(36)}`;
      
      await axios.post('http://localhost:5000/api/polls/vote', {
        pollId: id,
        optionIndex: selectedOption,
        transactionSignature: mockSignature,
        walletAddress: publicKey.toString(),
      });

      toast.success('Vote cast successfully!');
      setHasVoted(true);
      fetchResults();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to cast vote');
    }
  };

  if (!poll) {
    return <div className="loading">Loading poll...</div>;
  }

  const totalVotes = results.reduce((sum, r) => sum + r.voteCount, 0);

  return (
    <div className="poll-details">
      <div className="poll-header">
        <h1>{poll.title}</h1>
        <span className={`status ${poll.status}`}>{poll.status}</span>
      </div>

      <p className="poll-description">{poll.description}</p>

      <div className="poll-time">
        <p>Start: {new Date(poll.startTime).toLocaleString()}</p>
        <p>End: {new Date(poll.endTime).toLocaleString()}</p>
      </div>

      {!hasVoted && poll.status === 'active' && (
        <div className="voting-section">
          <h3>Cast Your Vote</h3>
          <div className="options">
            {poll.options.map((option) => (
              <label key={option.id} className="option-label">
                <input
                  type="radio"
                  name="vote"
                  value={option.optionIndex}
                  onChange={() => setSelectedOption(option.optionIndex)}
                />
                <span>{option.optionText}</span>
              </label>
            ))}
          </div>
          <button onClick={handleVote} className="btn-primary">
            Submit Vote
          </button>
        </div>
      )}

      <div className="results-section">
        <h3>Results ({totalVotes} votes)</h3>
        <div className="results">
          {results.map((result) => {
            const percentage = totalVotes > 0 ? (result.voteCount / totalVotes) * 100 : 0;
            return (
              <div key={result.optionIndex} className="result-item">
                <div className="result-header">
                  <span>{result.optionText}</span>
                  <span>{result.voteCount} votes ({percentage.toFixed(1)}%)</span>
                </div>
                <div className="progress-bar">
                  <div className="progress" style={{ width: `${percentage}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PollDetails;
