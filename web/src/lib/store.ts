/**
 * Auvra AI – Shared In-Memory State Store
 *
 * Aggregates workflow events from all sources (ai-worker, CRE trigger,
 * Tenderly simulation, World ID approval) for the dashboard to poll.
 *
 * NOTE: This is a singleton module-level store. It persists across
 * Next.js API route invocations during `next dev` because the module
 * is cached by the Node.js runtime. In production you'd replace this
 * with Redis/Postgres.
 */

// ── Types ────────────────────────────────────────────

export interface ThreatTicket {
  ticketId: string;
  targetContract: string;
  threatLevel: number;
  reasoning: string;
  action: string;
  simulation: {
    success: boolean;
    gasUsed: number;
  };
  status:
    | 'pending_simulation'
    | 'pending_human_approval'
    | 'approved'
    | 'executed'
    | 'rejected';
  createdAt: number;
  worldIdProof?: Record<string, unknown>;
}

export interface WorkflowEvent {
  timestamp: number;
  type: 'info' | 'warning' | 'success' | 'error';
  message: string;
  source: 'ai-worker' | 'cre-workflow' | 'tenderly' | 'world-id' | 'system';
}

// ── Store Implementation ─────────────────────────────

class AuvraStore {
  private tickets = new Map<string, ThreatTicket>();
  private events: WorkflowEvent[] = [];

  // ── Tickets ──

  addTicket(ticket: ThreatTicket): void {
    this.tickets.set(ticket.ticketId, ticket);
  }

  getTicket(ticketId: string): ThreatTicket | undefined {
    return this.tickets.get(ticketId);
  }

  getLatestTicket(): ThreatTicket | undefined {
    let latest: ThreatTicket | undefined;
    for (const ticket of this.tickets.values()) {
      if (!latest || ticket.createdAt > latest.createdAt) {
        latest = ticket;
      }
    }
    return latest;
  }

  updateTicket(ticketId: string, updates: Partial<ThreatTicket>): void {
    const ticket = this.tickets.get(ticketId);
    if (ticket) {
      Object.assign(ticket, updates);
    }
  }

  // ── Events ──

  addEvent(event: Omit<WorkflowEvent, 'timestamp'>): void {
    this.events.push({ ...event, timestamp: Date.now() });
  }

  getEvents(since?: number): WorkflowEvent[] {
    if (since) return this.events.filter((e) => e.timestamp > since);
    return [...this.events];
  }

  // ── Aggregate ──

  getState() {
    return {
      latestTicket: this.getLatestTicket() ?? null,
      events: this.events,
      ticketCount: this.tickets.size,
    };
  }
}

// Module-level singleton (persists in next dev)
export const store = new AuvraStore();
