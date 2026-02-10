# Rule-based Escrow Agent for Bounty & Service Payments on Solana

## Project Repository
https://github.com/AndandoJing/solana-bounty-agent


---

## Project Overview
This project is a decentralized bounty and service payment system built on Solana.

Task creators can lock USDC rewards into an on-chain escrow account, while task performers complete the work and receive payment once predefined conditions are met. The settlement process is handled by an autonomous on-chain agent, eliminating the need for centralized intermediaries or manual arbitration.

By encoding payment rules directly into a Solana program, this project reduces trust assumptions and enables transparent, deterministic settlement for task-based services.

---

## Agent Definition (Why This Is an Agent)
In this project, the agent is not a human decision-maker, but an autonomous on-chain system.

Any user or keeper can trigger the `check_and_execute()` instruction, but the execution outcome is strictly enforced by on-chain rules rather than the caller. Based on escrow state and on-chain time, the agent deterministically performs one of the following actions:

- Automatically releases funds when task completion is confirmed
- Automatically refunds funds when the deadline has passed without confirmation
- Takes no action if conditions are not satisfied

This rule-based design ensures non-human, autonomous execution aligned with the definition of an agent capable of performing Solana actions.

---

## Tech Stack
- Smart Contract: Rust + Anchor Framework
- Frontend: Next.js + TypeScript + Solana Wallet Adapter
- Token: USDC (Solana Devnet)
- Tooling: Solana CLI, Anchor CLI, @solana/web3.js

---

## Core Features
- Create bounty or service tasks with USDC locked in escrow
- On-chain deadline and state-based execution rules
- Agent-driven automatic fund release or refund via `check_and_execute()`
- Transparent and verifiable on-chain task states
- No centralized intermediary or manual settlement process

---

## Demo
- Video Demo: TODO
- Live Demo (if available): TODO
- Screenshots: TODO

---

## Author
- Name / Nickname: TODO
- Contact: TODO
- Solana Wallet Address (Public): TODO
