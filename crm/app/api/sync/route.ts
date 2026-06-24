import { NextResponse } from 'next/server';
import { runSync } from '@/lib/sync';

export async function POST() {
  try {
    const result = await runSync();
    return NextResponse.json(result);
  } catch (e: any) {
    console.error('[API/sync] error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET() {
  const { prisma } = await import('@/lib/db');
  const state = await prisma.syncState.findFirst({ where: { id: 'singleton' } });
  return NextResponse.json({ lastSyncAt: state?.lastSyncAt || null });
}
