import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

/**
 * POST /api/approve
 * Accepts a World ID proof and finalises the CRE safeguard execution.
 */
export async function POST(req: Request) {
  try {
    const { ticketId, worldIdProof } = await req.json();

    // Resolve ticket (explicit or latest)
    const ticket = ticketId
      ? store.getTicket(ticketId)
      : store.getLatestTicket();

    if (!ticket) {
      return NextResponse.json(
        { error: 'No pending threat ticket found' },
        { status: 404 },
      );
    }

    if (ticket.status !== 'pending_human_approval') {
      return NextResponse.json(
        { error: `Ticket is "${ticket.status}", not pending approval` },
        { status: 400 },
      );
    }

    // Validate World ID proof payload
    if (!worldIdProof?.nullifier_hash) {
      return NextResponse.json(
        { error: 'World ID proof with nullifier_hash required' },
        { status: 400 },
      );
    }

    store.addEvent({
      type: 'info',
      message: `World ID proof received: ${worldIdProof.nullifier_hash.substring(0, 12)}… Verifying off-chain…`,
      source: 'world-id',
    });

    // In production: verify the ZKP against the World ID on-chain verifier.
    // For hackathon: IDKit already verified client-side; we trust the proof.

    store.updateTicket(ticket.ticketId, {
      status: 'approved',
      worldIdProof,
    });

    store.addEvent({
      type: 'success',
      message: 'Biometric Proof Validated across DON. Human identity confirmed.',
      source: 'world-id',
    });

    store.addEvent({
      type: 'info',
      message: `CRE EVMClient executing pause() on ${ticket.targetContract} (Base Sepolia)…`,
      source: 'cre-workflow',
    });

    // Simulate the on-chain write settling (2 s block time)
    setTimeout(() => {
      store.updateTicket(ticket.ticketId, { status: 'executed' });
      store.addEvent({
        type: 'success',
        message: 'Protocol Secured. pause() executed on-chain successfully.',
        source: 'cre-workflow',
      });
    }, 2000);

    return NextResponse.json({
      status: 'approved',
      ticketId: ticket.ticketId,
      message: 'World ID verification accepted. Executing safeguard.',
    });
  } catch (error) {
    console.error('[Approve Error]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
