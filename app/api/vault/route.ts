import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q');

  try {
    const { searchVault, getVaultStats } = await import('@/lib/worker/memory');

    if (q) {
      const results = await searchVault(q, 'generic', 20);
      return NextResponse.json({
        success: true,
        data: {
          items: results.map((r: { id: string; briefText: string; codeContent: string; metadata: { serviceId: string; createdAt: string; successRate: number; reuseCount: number } }) => ({
            id: r.id,
            briefText: r.briefText,
            codeContent: r.codeContent,
            serviceId: r.metadata.serviceId,
            createdAt: r.metadata.createdAt,
            successRate: r.metadata.successRate,
            reuseCount: r.metadata.reuseCount,
          })),
          query: q,
        },
      });
    }

    // List all vault items (recent)
    const stats = getVaultStats();
    // For listing, we search with an empty-ish query to get recent items
    let items: unknown[] = [];
    try {
      const results = await searchVault('component', 'generic', 20);
      items = results.map((r: { id: string; briefText: string; codeContent: string; metadata: { serviceId: string; createdAt: string; successRate: number; reuseCount: number } }) => ({
        id: r.id,
        briefText: r.briefText,
        codeContent: r.codeContent,
        serviceId: r.metadata.serviceId,
        createdAt: r.metadata.createdAt,
        successRate: r.metadata.successRate,
        reuseCount: r.metadata.reuseCount,
      }));
    } catch {
      // empty vault
    }

    return NextResponse.json({
      success: true,
      data: { items, stats },
    });
  } catch {
    return NextResponse.json({
      success: true,
      data: { items: [], stats: { total: 0, reused: 0 } },
    });
  }
}
