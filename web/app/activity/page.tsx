"use client";

import { useAccount } from "wagmi";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Pill } from "@/components/ui/Pill";
import { Address } from "@/components/ui/Address";
import { Reveal } from "@/components/ui/Reveal";
import { Curtis } from "@/components/curtis/Curtis";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { useVaultAddress } from "@/lib/hooks/useCurtis";
import { useDecisionLog, type Decision } from "@/lib/hooks/useDecisionLog";
import { widthLabel } from "@/lib/presets";
import { tickToWbotPrice, formatPrice } from "@/lib/ticks";

export default function ActivityPage() {
  const { isConnected } = useAccount();
  const { vault } = useVaultAddress();
  const { decisions, loading, error } = useDecisionLog(vault);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto max-w-[980px] px-6 pt-32 pb-24 w-full">
        <Reveal>
          <div className="label">Audit trail</div>
          <h1 className="display mt-5 text-[clamp(34px,5vw,60px)]">
            Every move,
            <span className="display-em"> on the record.</span>
          </h1>
          <p className="lead mt-6 max-w-[520px]">
            Each action Curtis has taken, with the reasoning he committed at the time.
            Read straight from chain logs, never from our database, so every row can
            be checked against an explorer nobody here controls.
          </p>
        </Reveal>

        <div className="rule-fade my-12" />

        {!isConnected ? (
          <Empty title="Connect a wallet" body="Your vault's history appears here." state="idle">
            <ConnectButton />
          </Empty>
        ) : !vault ? (
          <Empty
            title="No vault yet"
            body="Create one from the vault screen and Curtis will start recording."
            state="idle"
          />
        ) : error ? (
          <Empty
            title="Log unavailable"
            body="The RPC would not return logs for this range. Your position is unaffected; this page reads history only."
            state="alert"
          />
        ) : loading ? (
          <Empty title="Reading chain logs" body="Scanning recent blocks…" state="scanning" />
        ) : decisions.length === 0 ? (
          <Empty
            title="Nothing yet"
            body="Curtis records every decision here the moment it lands on-chain. Deposit into your vault and his first will appear."
            state="idle"
          />
        ) : (
          <div>
            <div className="label mb-6">
              {decisions.length} decision{decisions.length === 1 ? "" : "s"} · newest first
            </div>
            <div className="glass overflow-hidden rounded-3xl">
              {decisions.map((d, i) => (
                <div key={`${d.txHash}-${d.decisionId}`}>
                  {i > 0 && <div className="rule" />}
                  <DecisionRow d={d} />
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

function Empty({
  title,
  body,
  state,
  children,
}: {
  title: string;
  body: string;
  state: "idle" | "scanning" | "alert";
  children?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
      <Curtis size={104} state={state} interactive={state === "idle"} />
      <h2 className="display mt-12 text-[28px]">{title}</h2>
      <p className="mt-4 max-w-[380px] text-[13.5px] leading-relaxed text-[var(--color-lo)]">
        {body}
      </p>
      {children && <div className="mt-8">{children}</div>}
    </div>
  );
}

function DecisionRow({ d }: { d: Decision }) {
  const when = new Date(d.timestamp * 1000);

  return (
    <article className="px-6 py-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Pill tone={d.action === "compound" ? "accent" : "inrange"}>{d.action}</Pill>
        <time className="tabular text-[12px] text-[var(--color-faint)]">
          {when.toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </time>
        <span className="ml-auto flex items-center gap-4">
          <span className="tabular text-[12px] text-[var(--color-lo)]">
            {(d.confidenceBps / 100).toFixed(0)}% confident
          </span>
          <Address value={d.txHash} kind="tx" copyable={false} />
        </span>
      </div>

      {d.reasoning && (
        <p className="mt-3.5 max-w-[640px] text-[14.5px] leading-relaxed text-[var(--color-ink)]">
          {d.reasoning}
        </p>
      )}

      <div className="mt-3.5 flex flex-wrap items-center gap-x-6 gap-y-1">
        <Detail
          k="Band"
          v={`$${formatPrice(tickToWbotPrice(d.tickUpper))} – $${formatPrice(
            tickToWbotPrice(d.tickLower)
          )}`}
        />
        <Detail k="Width" v={widthLabel(d.tickUpper - d.tickLower)} />
        <Detail k="Block" v={d.blockNumber.toLocaleString()} />
      </div>
    </article>
  );
}

function Detail({ k, v }: { k: string; v: string }) {
  return (
    <span className="flex items-baseline gap-2">
      <span className="label">{k}</span>
      <span className="tabular text-[12px] text-[var(--color-mid)]">{v}</span>
    </span>
  );
}
