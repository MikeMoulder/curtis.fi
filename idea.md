# Curtis.fi — AI-Powered Liquidity Agent for BOT Chain

**Project Name:** Curtis.fi  
**Agent Name:** Curtis  
**Track:** AI Native Applications  
**Chain:** BOT Chain Mainnet  
**Challenge:** BOT Chain Builder Challenge #2

---

## 1. Elevator Pitch

Curtis is an autonomous AI agent that manages liquidity positions on BDEX (BOT Chain's native DEX) on behalf of users. Instead of manually choosing pools, monitoring impermanent loss, and timing exits, users deposit capital into a smart account and let Curtis scan, enter, rebalance, and protect their positions — 24/7, on-chain, with full transparency.

**Without Curtis:** Passive LPing on BDEX = manual guesswork, forgotten positions, and silent impermanent loss.  
**With Curtis:** Intelligent, automated liquidity management with user-defined guardrails and a complete decision audit trail.

---

## 2. The Problem

BDEX is BOT Chain's native decentralized exchange. It supports swaps, liquidity provision, and liquidity mining. However, as a young ecosystem, it lacks sophisticated tooling for liquidity providers:

- **Pool selection is opaque.** Users don't know which pools offer the best risk-adjusted returns.
- **Impermanent loss is unmanaged.** Most users enter a pool and never exit, even as price drift erodes their principal.
- **Rewards sit idle.** Liquidity mining incentives are often left unclaimed and uncompounded.
- **No automation layer exists.** There is no "set and forget" solution for BDEX LP positions.

This creates friction for retail users and limits total value locked (TVL) on BDEX — which in turn limits swap depth and ecosystem growth.

---

## 3. The Solution: Curtis

Curtis is an AI-native autonomous agent with three core capabilities:

### 3.1 Scan
Curtis continuously monitors all BDEX liquidity pools via BOT Chain RPC. For each pool, it calculates:
- Real-time APR from trading fees + liquidity mining rewards
- 7-day price volatility (impermanent loss risk)
- Volume depth and sustainability
- Reward token emission sustainability

### 3.2 Act
Based on the user's risk profile (Conservative / Balanced / Aggressive), Curtis:
- **Enters** the highest-scoring pool
- **Rebalances** when a significantly better pool appears
- **Exits** when impermanent loss exceeds user-defined thresholds
- **Claims and compounds** liquidity mining rewards automatically

### 3.3 Explain
Every action Curtis takes is logged with:
- The reasoning behind the decision
- Confidence score
- Guardrail checks passed
- Direct link to the transaction on `scan.botchain.ai`

---

## 4. Why This Wins the AI Track

| Judging Criteria | Curtis.fi Delivery |
|---|---|
| **AI as Core Capability (30%)** | Curtis is the decision-maker. Without the AI, the vault is inert. The AI selects pools, times exits, and triggers rebalances — not as a recommendation, but as signed, on-chain execution. |
| **Degree of Automation (25%)** | End-to-end autonomous loop: scan → score → sign → execute → verify. Zero human intervention required during operation. |
| **Depth of AI–On-Chain Integration (20%)** | AI produces verifiable EIP-191 signatures that smart contracts validate before executing BDEX router calls. The AI is a cryptographic actor on the network. |
| **Innovation (20%)** | First autonomous LP manager built specifically for BOT Chain's native DEX. Combines off-chain inference with on-chain enforcement via guardrail contracts. |
| **User Value (15%)** | Directly prevents impermanent loss and maximizes yield for BDEX users. Drives TVL and volume to BOT Chain's native infrastructure. |

---

## 5. User Journey (Complete Business Loop)

```
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 1: CONNECT                                                    │
│  User visits curtis.fi → Connects wallet (RainbowKit + BOT Chain)   │
│  → Deploys a Curtis Smart Account (ERC-4337 factory)                │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
┌──────────────────────────────────▼──────────────────────────────────┐
│  STEP 2: CONFIGURE                                                  │
│  User deposits BOT / USDT into their Smart Account                  │
│  → Selects Risk Profile:                                            │
│    • Conservative: Max IL 3%, min APR 10%, frequent compounding     │
│    • Balanced: Max IL 5%, min APR 15%, standard rebalancing         │
│    • Aggressive: Max IL 10%, min APR 25%, high-turnover pools       │
│  → Sets max slippage (e.g., 2%) and emergency withdrawal address    │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
┌──────────────────────────────────▼──────────────────────────────────┐
│  STEP 3: CURTIS SCANS                                               │
│  Off-chain AI backend polls BDEX every 5 minutes via BOT Chain RPC  │
│  → Scores all pools using: fee APR + reward APR - IL risk penalty   │
│  → Identifies optimal entry pool for user's risk profile             │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
┌──────────────────────────────────▼──────────────────────────────────┐
│  STEP 4: CURTIS ACTS                                                │
│  AI generates executable calldata (BDEX router calls)               │
│  → Signs decision hash with AI Relayer private key                  │
│  → Submits to Smart Account contract                                │
│  → Contract verifies: signature valid + guardrails respected        │
│  → Executes addLiquidity() on BDEX                                  │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
┌──────────────────────────────────▼──────────────────────────────────┐
│  STEP 5: CURTIS MONITORS                                            │
│  Continuous loop every 5 minutes:                                   │
│  • Check current IL vs entry price → exit if > threshold            │
│  • Check if better pool exists → rebalance if delta > threshold     │
│  • Check unclaimed rewards → claim + compound if viable             │
│  • Check gas costs → defer action if execution is uneconomical      │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
┌──────────────────────────────────▼──────────────────────────────────┐
│  STEP 6: USER VERIFIES                                              │
│  Dashboard shows:                                                   │
│  • Current pool, position value, current APR, total P&L             │
│  • "Curtis Decision Log" — every action with reasoning & tx link    │
│  • "Guardrails Active" status indicator                             │
│  • One-click "Emergency Withdraw" to exit everything instantly      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 6. Technical Architecture

### 6.1 Smart Contracts (Solidity / Foundry)

**`CurtisFactory.sol`**
- Deploys user-specific `CurtisVault` smart accounts
- Stores vault → owner mapping
- Emits `VaultCreated(owner, vault, timestamp)`

**`CurtisVault.sol`** (ERC-4337 compatible smart account)
- Holds user deposits and LP tokens
- Core function:

```solidity
function executeStrategy(
    bytes32 decisionHash,           // Unique ID for this AI decision
    string calldata reasoning,      // Human-readable AI reasoning
    uint256 confidenceBps,          // AI confidence (0–10000)
    StrategyAction[] calldata actions, // Array of BDEX calls
    bytes calldata aiSignature      // EIP-191 signature from Curtis backend
) external {
    require(!executedDecisions[decisionHash], "Curtis: replay");
    require(_verifyAI(decisionHash, aiSignature), "Curtis: invalid signature");
    require(_checkGuardrails(actions), "Curtis: guardrail breach");

    executedDecisions[decisionHash] = true;

    for (uint i = 0; i < actions.length; i++) {
        (bool success, ) = actions[i].target.call{value: actions[i].value}(actions[i].data);
        require(success, "Curtis: action failed");
    }

    emit CurtisActed(
        decisionHash, 
        reasoning, 
        confidenceBps, 
        block.timestamp
    );
}
```

**Guardrails enforced on-chain:**
- `maxIlBps`: Maximum impermanent loss before forced exit
- `minAprBps`: Minimum APR to justify staying in a pool
- `maxSlippageBps`: Maximum slippage on any swap/rebalance
- `maxDailyActions`: Rate limit to prevent excessive trading
- `onlyWhitelistedPools`: Curtis can only interact with approved BDEX pools

### 6.2 AI Backend (Python / FastAPI / Redis)

**Components:**
- `PoolScanner` — Polls BDEX pool data via BOT Chain RPC every 5 minutes
- `RiskEngine` — Calculates IL risk, APR, and composite pool scores
- `DecisionEngine` — Generates calldata, signs decisions, submits transactions
- `GuardrailChecker` — Pre-flight validation against user on-chain config

**Decision scoring model (MVP):**
```
PoolScore = (feeAPR * 0.30) 
          + (rewardAPR * 0.30) 
          + (volumeScore * 0.20) 
          - (volatilityPenalty * 0.20)
```

Post-hackathon: Replace with trained ML model using historical BDEX data.

### 6.3 Frontend (React / Next.js / wagmi / RainbowKit)

**Pages:**
- `/` — Landing + Connect Wallet
- `/dashboard` — Portfolio overview, active pool, P&L
- `/pools` — AI-ranked BDEX pool explorer
- `/guardrails` — Risk profile and constraint configuration
- `/decisions` — Curtis Decision Log (full audit trail)
- `/emergency` — One-click full exit

**Key UX Principles:**
- BOT Chain is pre-configured in RainbowKit — users don't manually add the network
- Every AI action shows a "Why?" tooltip linking to the decision reasoning
- Real-time gas estimation in BOT tokens
- Mobile-first design for retail users

### 6.4 Infrastructure Map

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  Next.js + wagmi + RainbowKit (BOT Chain native)            │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                      AI BACKEND (Curtis)                     │
│  FastAPI + Redis + Web3.py                                  │
│  • PoolScanner (BOT Chain RPC)                              │
│  • RiskEngine (volatility, IL calc)                         │
│  • DecisionEngine (calldata builder + signer)               │
│  • Transaction Relayer (submits to Mainnet)                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
┌───────▼────────┐          ┌────────▼────────┐
│  BOT CHAIN RPC  │          │  SMART CONTRACTS │
│  • BDEX pools   │          │  • CurtisFactory   │
│  • Gas prices   │          │  • CurtisVault     │
│  • Block data   │          │  • Guard logic     │
└─────────────────┘          └──────────────────┘
```

---

## 7. BOT Chain Integration Details

### 7.1 Required Infrastructure

| Resource | URL | Usage |
|---|---|---|
| BOT Chain Mainnet | `https://www.botchain.ai/` | Deployment target |
| Developer Docs | `https://dev-docs.botchain.ai/docs/Developers/quick-guide/` | RPC config, chain ID, deployment guides |
| Block Explorer | `https://scan.botchain.ai/` | Contract verification, tx tracking, user-facing links |
| Bridge | `https://bridge.botchain.ai/` | User onboarding (bridge assets to BOT Chain) |
| BDEX | `https://dex.botchain.ai/` | Native DEX for swaps, LP, and liquidity mining |
| Testnet Faucet | `https://faucet.botchain.ai/basic/` | Development testing |

### 7.2 RPC Configuration (wagmi)

```typescript
const botChain = {
  id: 0, // TODO: verify exact chain ID from dev-docs
  name: 'BOT Chain',
  network: 'botchain',
  nativeCurrency: { name: 'BOT', symbol: 'BOT', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.botchain.ai'] },
    public: { http: ['https://rpc.botchain.ai'] },
  },
  blockExplorers: {
    default: { name: 'BOT Scan', url: 'https://scan.botchain.ai' },
  },
};
```

### 7.3 BDEX Integration

- **Router Address:** To be retrieved from BDEX frontend or developer docs
- **Factory Address:** Required for discovering all pools
- **ABIs:** Standard Uniswap V2-style (swap, addLiquidity, removeLiquidity, getReserves)
- **Liquidity Mining:** Query reward contracts for emission rates and unclaimed rewards

### 7.4 Gas Support

- BOT Chain provides **1 BOT for gas** to qualifying projects
- Curtis.fi will use this for initial contract deployment and testing
- Frontend will show real-time gas estimates in BOT for all user-facing transactions

---

## 8. 14-Day Build Sprint

| Day | Focus | Deliverable |
|---|---|---|
| **1** | Contract skeleton | `CurtisFactory` + `CurtisVault` scaffold (Foundry) |
| **2** | BDEX integration | Vault can call BDEX router (add/remove liquidity, swap) — Testnet |
| **3** | Guardrails | Implement on-chain guardrail checks (slippage, IL threshold, whitelist) |
| **4** | AI backend scaffold | FastAPI server, RPC connection, pool data ingestion |
| **5** | Risk engine | IL calculator, APR estimator, pool scoring algorithm |
| **6** | Decision engine | Calldata builder, EIP-191 signing, relayer submission |
| **7** | Frontend scaffold | Next.js + wagmi + RainbowKit, wallet connection, BOT Chain config |
| **8** | Frontend integration | Vault creation, deposit, guardrail configuration UI |
| **9** | End-to-end Testnet | Full loop: deposit → AI enters pool → AI exits → withdraw |
| **10** | **MAINNET DEPLOY** | Deploy contracts to BOT Chain Mainnet, verify on scan.botchain.ai |
| **11** | Mainnet integration | Point frontend + AI backend to Mainnet contracts |
| **12** | Decision Log UI | Build the "Curtis Decision Log" — reasoning, confidence, tx links |
| **13** | Polish + Demo video | Mobile responsive, loading states, 2-min demo video |
| **14** | Submit | Live site, GitHub repo, documentation, final checks |

---

## 9. Submission Checklist

### Mandatory Requirements

| Requirement | Status | Evidence |
|---|---|---|
| BOT Chain Mainnet Deployment | ☐ | Contracts verified on `scan.botchain.ai` |
| Public Product Form | ☐ | `https://curtis.fi` live and accessible |
| Wallet Interaction | ☐ | RainbowKit with BOT Chain; users can connect and transact |
| Complete Business Loop | ☐ | Deposit → AI manages → User verifies → Withdraw |
| GitHub Repository | ☐ | Monorepo with `/contracts`, `/ai-backend`, `/frontend` |
| Project Originality | ☐ | Curtis.fi is original development for this challenge |

### AI Track Specifics

| Requirement | Status | Evidence |
|---|---|---|
| AI is Core Capability | ☐ | Removing Curtis breaks all automation; vault is inert |
| On-Chain Decision Enforcement | ☐ | AI signs decisions; contract verifies before execution |
| Automation Depth | ☐ | No human in the loop during normal operation |
| Transparency | ☐ | Decision Log with reasoning, confidence, and tx hashes |

### Optional but Recommended

| Requirement | Status | Evidence |
|---|---|---|
| Demo Video | ☐ | 2–3 min showing full user journey + AI action on Mainnet |
| Mobile Responsive | ☐ | Works on mobile wallets (MetaMask mobile, etc.) |
| Documentation | ☐ | README with architecture diagram, local setup, deployment guide |

---

## 10. Why BOT Chain?

### 10.1 Strategic Fit
- **Native DEX focus:** BDEX is BOT Chain's core DeFi primitive. Curtis.fi makes BDEX more usable, driving TVL and volume.
- **Early ecosystem advantage:** As one of the first AI-native DeFi tools on BOT Chain, Curtis.fi establishes a category.
- **Ecosystem support:** BOT Chain's gas grants, media exposure, and potential incubation align with Curtis.fi's growth needs.

### 10.2 Long-Term Roadmap (Post-Challenge)
- **Q3 2026:** Multi-pool strategies (split capital across 2–3 pools)
- **Q4 2026:** ML model upgrade — train on historical BDEX data for predictive IL modeling
- **Q1 2027:** Cross-protocol expansion — integrate with new BOT Chain DeFi protocols as they launch
- **Q2 2027:** Curtis DAO — decentralized AI relayer set with consensus mechanism

---

## 11. Team & Resources

**Project:** Curtis.fi  
**Agent:** Curtis  
**Track:** AI Native Applications  
**Chain:** BOT Chain Mainnet  
**Repository:** `https://github.com/[team]/curtis-fi`  
**Demo:** `https://curtis.fi`  
**Contact:** [team email / Telegram]

**Key Resources:**
- BOT Chain Developer Docs: `https://dev-docs.botchain.ai/docs/Developers/quick-guide/`
- BOT Chain GitHub: `https://github.com/BOTChain-bot`
- Integration Guide: `https://docs.google.com/document/d/1xYzdfJlD08UOV9CKE3nV7NTSQg6lPz9B17aIW2NF5Wg/edit`
- Builder Hub (Support): `https://t.me/BotChain_official/61`

---

*Prepared for BOT Chain Builder Challenge #2 — AI Track*  
*Build Period: Aug 10 – Aug 24, 2026*  
*Submission Deadline: Aug 22, 2026 (23:59 UTC+8)*
