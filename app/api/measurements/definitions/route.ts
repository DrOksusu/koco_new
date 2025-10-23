import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Fetch all active measurement definitions
    const definitions = await prisma.measurementDefinition.findMany({
      where: {
        isActive: true
      },
      orderBy: {
        displayOrder: 'asc'
      }
    });

    // Convert BigInt to string for JSON serialization
    const serializedDefinitions = definitions.map(def => ({
      ...def,
      id: def.id.toString(),
      createdAt: def.createdAt.toISOString(),
      updatedAt: def.updatedAt.toISOString()
    }));

    return NextResponse.json(
      {
        success: true,
        definitions: serializedDefinitions,
        count: serializedDefinitions.length
      },
      {
        headers: {
          // Cache for 15 minutes
          'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800'
        }
      }
    );
  } catch (error) {
    console.error('Error fetching measurement definitions:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch measurement definitions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
