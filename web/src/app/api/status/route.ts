import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

/**
 * GET /api/status
 * Returns the current workflow state + event log for the dashboard to poll.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const sinceParam = url.searchParams.get('since');
  const since = sinceParam ? parseInt(sinceParam, 10) : undefined;

  const state = store.getState();
  const events = since ? store.getEvents(since) : state.events;

  return NextResponse.json({
    latestTicket: state.latestTicket,
    events: events.map((e) => ({
      ...e,
      time: new Date(e.timestamp).toLocaleTimeString(),
    })),
    ticketCount: state.ticketCount,
  });
}
