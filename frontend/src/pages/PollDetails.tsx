import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, Transaction, SystemProgram, PublicKey } from '@solana/web3.js';
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
  const { publicKey, sendTransaction } = useWallet();
  const { token } = useAuth();

  useEffect(() => {
    fetchPoll();
    fetchResults();
    checkIfVoted();
  }, [id]);

  const checkIfVoted = async () => {
    if (!token) return;
    
    try {
      const response = await axios.get(`http://localhost:5000/api/polls/${id}/vote-status`);
      setHasVoted(response.data.hasVoted);
    } catch (error) {
      console.error('Error checking vote status');
      setHasVoted(false);
    }
  };

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

    if (!publicKey || !sendTransaction) {
      toast.error('Please connect your wallet');
      return;
    }

    if (selectedOption === null) {
      toast.error('Please select an option');
      return;
    }

    try {
      toast.info('Creating blockchain transaction...');
      
      const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
      
      // Create a memo transaction to record the vote on blockchain
      const voteData = JSON.stringify({
        pollId: id,
        optionIndex: selectedOption,
        timestamp: Date.now(),
        voter: publicKey.toString()
      });
      
      // Create a transaction with memo instruction
      const transaction = new Transaction();
      
      // Add memo instruction with vote data
      const memoProgram = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
      const memoInstruction = {
        keys: [],
        programId: memoProgram,
        data: Buffer.from(voteData, 'utf8'),
      };
      
      transaction.add(memoInstruction);
      
      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;
      
      toast.info('Please approve the transaction in your wallet...');
      
      // Sign and send transaction
      const signature = await sendTransaction(transaction, connection);
      
      toast.info('Confirming transaction on blockchain...');
      
      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');
      
      // Now send to backend with real transaction signature
      await axios.post('http://localhost:5000/api/polls/vote', {
        pollId: id,
        optionIndex: selectedOption,
        transactionSignature: signature,
        walletAddress: publicKey.toString(),
      });

      toast.success(`Vote cast successfully! Transaction: ${signature.slice(0, 8)}...`);
      setHasVoted(true);
      fetchResults();
    } catch (error: any) {
      console.error('Voting error:', error);
      toast.error(error.message || 'Failed to cast vote');
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
        
        <div className="blockchain-info">
          <h4>🔗 Blockchain Verification</h4>
          <p>All votes are recorded on Solana devnet blockchain for transparency and immutability.</p>
          <p>
            <strong>Network:</strong> Solana Devnet<br/>
            <strong>Explorer:</strong> <a href="https://explorer.solana.com/?cluster=devnet" target="_blank" rel="noopener noreferrer">
              View on Solana Explorer
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PollDetails;
