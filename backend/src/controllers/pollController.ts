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

    const poll = await Poll.create({
      pollId,
      title,
      description,
      creatorId: userId,
      blockchainAddress,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      status: 'pending',
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

    res.json({ success: true, polls });
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

    const votes = await Vote.findAll({ where: { pollId: poll.id } });

    res.json({ success: true, poll, voteCount: votes.length });
  } catch (error: any) {
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

    const existingVote = await Vote.findOne({
      where: { pollId, userId },
    });

    if (existingVote) {
      return res.status(400).json({ message: 'You have already voted in this poll' });
    }

    const vote = await Vote.create({
      pollId,
      userId,
      optionIndex,
      transactionSignature,
      walletAddress,
    });

    res.status(201).json({ success: true, vote });
  } catch (error: any) {
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
