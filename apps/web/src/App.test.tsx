import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

describe('Agent Arena shell', () => {
  afterEach(() => vi.restoreAllMocks());

  it('renders the arena identity and unauthenticated call to action', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 'AUTH_REQUIRED' } }), { status: 401 }),
    );

    render(<App />);

    expect(screen.getByText('Agent 竞技场')).toBeInTheDocument();
    expect(await screen.findByText('登录后开启你的战局')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '体验完整战局' })).toBeInTheDocument();
  });

  it('supports demo login and then displays the battle lobby', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    fetchMock
      .mockResolvedValueOnce(new Response('{}', { status: 401 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ user: { id: 'u1', phone: '13800138000', displayName: 'Arena 体验官' } }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ battles: [] }), { status: 200 }));

    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: '体验完整战局' }));

    await waitFor(() => expect(screen.getByText('我的战局')).toBeInTheDocument());
    expect(screen.getAllByRole('button', { name: '创建战局' }).length).toBeGreaterThan(0);
  });

  it('opens the rules dialog from the header', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 'AUTH_REQUIRED' } }), { status: 401 }),
    );
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '查看规则' }));
    expect(screen.getByRole('dialog', { name: '竞技场规则' })).toBeInTheDocument();
    expect(screen.getByText('统一回合结算')).toBeInTheDocument();
  });
});
