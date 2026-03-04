import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

/**
 * POST /api/events
 * Accepts workflow events from external sources (ai-worker, etc.)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, message, source } = body;

    if (!type || !message || !source) {
      return NextResponse.json(
        { error: 'Missing required fields: type, message, source' },
        { status: 400 },
      );
    }

    store.addEvent({ type, message, source });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
}
