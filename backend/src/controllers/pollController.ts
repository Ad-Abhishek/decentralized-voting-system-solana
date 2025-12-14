import { Request, Response } from 'express';
import Poll from '../models/Poll';
import Option from '../models/Option';
import Vote from '../models/Vote';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';

const connection = new Connection(
  process.env.SOLANA_NETWORK === 'mainnet' 
    ? 'https://api.mainnet-beta.solana.com' 
    : 'https://api.devnet.solana.com',
  'confirmed'
);

export const createPoll = async (req: Request, res: Response) => {
  try {
    const { title, description, startTime, endTime, options } = req.body;
    const userId = (req as any).user.id;

    const pollId = `poll_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const blockchainAddress = Keypair.generate().publicKey.toString();

    const now = new Date();
    const pollStartTime = new Date(startTime);
    const pollEndTime = new Date(endTime);
    
    let status: 'pending' | 'active' | 'closed' = 'pending';
    if (now >= pollStartTime && now <= pollEndTime) {
      status = 'active';
    } else if (now > pollEndTime) {
      status = 'closed';
    }

    const poll = await Poll.create({
      pollId,
      title,
      description,
      creatorId: userId,
      blockchainAddress,
      startTime: pollStartTime,
      endTime: pollEndTime,
      status,
    });

    const optionPromises = options.map((optionText: string, index: number) =>
      Option.create({
        pollId: poll.id,
        optionText,
        optionIndex: index,
      })
    );

    await Promise.all(optionPromises);

    res.status(201).json({
      success: true,
      poll: {
        id: poll.id,
        pollId: poll.pollId,
        title: poll.title,
        description: poll.description,
        blockchainAddress: poll.blockchainAddress,
        startTime: poll.startTime,
        endTime: poll.endTime,
        status: poll.status,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getAllPolls = async (req: Request, res: Response) => {
  try {
    const polls = await Poll.findAll({
      include: [{ model: Option, as: 'options' }],
      order: [['createdAt', 'DESC']],
    });

    // Update poll statuses based on current time
    const now = new Date();
    const updatedPolls = await Promise.all(polls.map(async (poll) => {
      let currentStatus: 'pending' | 'active' | 'closed' = poll.status;
      
      if (now >= poll.startTime && now <= poll.endTime && poll.status !== 'closed') {
        currentStatus = 'active';
      } else if (now > poll.endTime) {
        currentStatus = 'closed';
      }
      
      // Update in database if status changed
      if (currentStatus !== poll.status) {
        await poll.update({ status: currentStatus });
      }
      
      return { ...poll.toJSON(), status: currentStatus };
    }));

    res.json({ success: true, polls: updatedPolls });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getPollById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const poll = await Poll.findByPk(id, {
      include: [{ model: Option, as: 'options' }],
    });

    if (!poll) {
      return res.status(404).json({ message: 'Poll not found' });
    }

    // Update poll status based on current time
    const now = new Date();
    let currentStatus: 'pending' | 'active' | 'closed' = poll.status;
    
    if (now >= poll.startTime && now <= poll.endTime && poll.status !== 'closed') {
      currentStatus = 'active';
    } else if (now > poll.endTime) {
      currentStatus = 'closed';
    }
    
    // Update in database if status changed
    if (currentStatus !== poll.status) {
      await poll.update({ status: currentStatus });
    }

    const votes = await Vote.findAll({ where: { pollId: poll.id } });

    console.log('Poll data:', {
      id: poll.id,
      status: currentStatus,
      optionsCount: (poll as any).options?.length || 0,
      startTime: poll.startTime,
      endTime: poll.endTime,
      now: now
    });

    res.json({ 
      success: true, 
      poll: { ...poll.toJSON(), status: currentStatus }, 
      voteCount: votes.length 
    });
  } catch (error: any) {
    console.error('Error in getPollById:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const castVote = async (req: Request, res: Response) => {
  try {
    const { pollId, optionIndex, transactionSignature, walletAddress } = req.body;
    const userId = (req as any).user.id;

    const poll = await Poll.findByPk(pollId);
    if (!poll) {
      return res.status(404).json({ message: 'Poll not found' });
    }

    // Check if poll is active
    const now = new Date();
    if (now < poll.startTime) {
      return res.status(400).json({ message: 'Poll has not started yet' });
    }
    if (now > poll.endTime) {
      return res.status(400).json({ message: 'Poll has ended' });
    }

    const existingVote = await Vote.findOne({
      where: { pollId, userId },
    });

    if (existingVote) {
      return res.status(400).json({ message: 'You have already voted in this poll' });
    }

    // Verify the transaction exists on Solana blockchain
    try {
      const transactionInfo = await connection.getTransaction(transactionSignature, {
        commitment: 'confirmed'
      });
      
      if (!transactionInfo) {
        return res.status(400).json({ message: 'Invalid transaction signature' });
      }

      // Verify the transaction was signed by the claimed wallet
      const signers = transactionInfo.transaction.message.accountKeys.slice(0, transactionInfo.transaction.message.header.numRequiredSignatures);
      const walletPublicKey = new PublicKey(walletAddress);
      
      if (!signers.some(signer => signer.equals(walletPublicKey))) {
        return res.status(400).json({ message: 'Transaction not signed by claimed wallet' });
      }

      console.log('✅ Blockchain transaction verified:', transactionSignature);
    } catch (blockchainError) {
      console.error('Blockchain verification error:', blockchainError);
      return res.status(400).json({ message: 'Failed to verify blockchain transaction' });
    }

    const vote = await Vote.create({
      pollId,
      userId,
      optionIndex,
      transactionSignature,
      walletAddress,
    });

    console.log('✅ Vote recorded:', { pollId, userId, optionIndex, transactionSignature });

    res.status(201).json({ success: true, vote });
  } catch (error: any) {
    console.error('Vote casting error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getPollResults = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const poll = await Poll.findByPk(id, {
      include: [{ model: Option, as: 'options' }],
    });

    if (!poll) {
      return res.status(404).json({ message: 'Poll not found' });
    }

    const votes = await Vote.findAll({ where: { pollId: poll.id } });

    const results = (poll as any).options.map((option: any) => {
      const voteCount = votes.filter(v => v.optionIndex === option.optionIndex).length;
      return {
        optionText: option.optionText,
        optionIndex: option.optionIndex,
        voteCount,
      };
    });

    res.json({
      success: true,
      poll: {
        id: poll.id,
        title: poll.title,
        description: poll.description,
        totalVotes: votes.length,
      },
      results,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const checkUserVote = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const existingVote = await Vote.findOne({
      where: { pollId: id, userId },
    });

    res.json({ 
      success: true, 
      hasVoted: !!existingVote,
      vote: existingVote ? {
        optionIndex: existingVote.optionIndex,
        createdAt: existingVote.createdAt,
        transactionSignature: existingVote.transactionSignature
      } : null
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const verifyVoteOnBlockchain = async (req: Request, res: Response) => {
  try {
    const { signature } = req.params;

    const transactionInfo = await connection.getTransaction(signature, {
      commitment: 'confirmed'
    });

    if (!transactionInfo) {
      return res.status(404).json({ message: 'Transaction not found on blockchain' });
    }

    // Extract memo data if present
    let voteData = null;
    const memoProgram = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
    
    for (const instruction of transactionInfo.transaction.message.instructions) {
      const programId = transactionInfo.transaction.message.accountKeys[instruction.programIdIndex];
      if (programId.equals(memoProgram)) {
        try {
          const memoData = Buffer.from(instruction.data, 'base64').toString('utf8');
          voteData = JSON.parse(memoData);
        } catch (e) {
          // Not JSON data, skip
        }
      }
    }

    res.json({
      success: true,
      transaction: {
        signature,
        blockTime: transactionInfo.blockTime,
        slot: transactionInfo.slot,
        status: transactionInfo.meta?.err ? 'failed' : 'confirmed',
        voteData
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
