import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const notes = await prisma.note.findMany({
    where: { leadId: id },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ notes });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { content } = await request.json();
  if (!content?.trim()) return NextResponse.json({ error: 'Content required' }, { status: 400 });
  const note = await prisma.note.create({
    data: { leadId: id, content: content.trim() },
  });
  await prisma.lead.update({ where: { id }, data: { updatedAt: new Date() } });
  return NextResponse.json({ note }, { status: 201 });
}
