# solana-bounty-agent

# Solana Rule-based Escrow Agent

This repository contains a rule-based escrow agent built on Solana using the Anchor framework.

The project demonstrates how an autonomous on-chain agent can manage bounty and service payments without relying on centralized intermediaries or manual decision-making.

Funds are locked into escrow and automatically released or refunded based on on-chain state and time-based rules.

---

## What This Project Does
- Locks USDC into an on-chain escrow for task or service payments
- Encodes settlement rules directly into a Solana program
- Allows anyone to trigger execution while enforcing deterministic outcomes
- Demonstrates a simple, auditable agent pattern on Solana

---

## Why an Agent
This project qualifies as an agent because execution decisions are not made by humans.

Any user or keeper may call the execution instruction, but the program itself determines whether funds should be released, refunded, or left untouched according to predefined rules.

---

## Repository Structure
├── programs/ # Anchor smart contracts
├── app/ # Frontend (optional)
├── proposal.md # Hackathon proposal
├── README.md

---

## Status
This project is under active development and is designed to serve as:
- A bootcamp final project
- A reusable hackathon submission
- A long-term portfolio project
