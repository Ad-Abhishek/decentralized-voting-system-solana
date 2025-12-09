import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

interface Poll {
  id: number;
  title: string;
  description: string;
  status: string;
  createdAt: string;
}

const Dashboard: React.FC = () => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const { user, updateWallet } = useAuth();
  const { publicKey } = useWallet();

  useEffect(() => {
    fetchUserPolls();
  }, []);

  useEffect(() => {
    if (publicKey && (!user?.walletAddress || user.walletAddress !== publicKey.toString())) {
      handleUpdateWallet();
    }
  }, [publicKey]);

  const fetchUserPolls = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/polls');
      setPolls(response.data.polls);
    } catch (error) {
      toast.error('Failed to fetch polls');
    }
  };

  const handleUpdateWallet = async () => {
    if (publicKey) {
      try {
        await updateWallet(publicKey.toString());
        toast.success('Wallet connected successfully');
      } catch (error) {
        console.error('Failed to update wallet');
      }
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <Link to="/create-poll" className="btn-primary">
          Create New Poll
        </Link>
      </div>

      <div className="user-info">
        <h3>Welcome, {user?.username}!</h3>
        {publicKey && (
          <p className="wallet-address">
            Wallet: {publicKey.toString().slice(0, 8)}...{publicKey.toString().slice(-8)}
          </p>
        )}
      </div>

      <div className="polls-section">
        <h2>All Polls</h2>
        <div className="polls-list">
          {polls.length === 0 ? (
            <p>No polls found. Create your first poll!</p>
          ) : (
            polls.map((poll) => (
              <div key={poll.id} className="poll-item">
                <div className="poll-info">
                  <h3>{poll.title}</h3>
                  <p>{poll.description}</p>
                  <span className={`status ${poll.status}`}>{poll.status}</span>
                </div>
                <Link to={`/poll/${poll.id}`} className="btn-secondary">
                  View
                </Link>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
