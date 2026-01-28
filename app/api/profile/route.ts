import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma';

// GET: 사용자 프로필 및 클리닉 정보 조회
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    console.log('Profile API - Session:', JSON.stringify(session, null, 2));

    if (!session?.user?.id) {
      console.log('Profile API - No user id in session');
      console.log('Profile API - Session user:', session?.user);

      // 세션은 있지만 id가 없는 경우, email로 사용자 조회 시도
      if (session?.user?.email) {
        const userByEmail = await prisma.user.findUnique({
          where: { email: session.user.email },
          include: { clinic: true },
        });

        if (userByEmail) {
          return NextResponse.json({
            user: {
              id: userByEmail.id.toString(),
              email: userByEmail.email,
              username: userByEmail.username,
              role: userByEmail.role,
              isActive: userByEmail.isActive,
              createdAt: userByEmail.createdAt,
              lastLoginAt: userByEmail.lastLoginAt,
            },
            clinic: userByEmail.clinic ? {
              id: userByEmail.clinic.id.toString(),
              clinicName: userByEmail.clinic.clinicName,
              clinicCode: userByEmail.clinic.clinicCode,
              address: userByEmail.clinic.address,
              phone: userByEmail.clinic.phone,
              licenseNumber: userByEmail.clinic.licenseNumber,
              logoUrl: userByEmail.clinic.logoUrl,
            } : null,
          });
        }
      }

      return NextResponse.json({ error: 'Unauthorized', session: session }, { status: 401 });
    }

    const userId = BigInt(session.user.id);
    console.log('Profile API - User ID:', userId.toString());

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        clinic: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: user.id.toString(),
        email: user.email,
        username: user.username,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
      clinic: user.clinic ? {
        id: user.clinic.id.toString(),
        clinicName: user.clinic.clinicName,
        clinicCode: user.clinic.clinicCode,
        address: user.clinic.address,
        phone: user.clinic.phone,
        licenseNumber: user.clinic.licenseNumber,
        logoUrl: user.clinic.logoUrl,
      } : null,
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch profile',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// PUT: 사용자 프로필 및 클리닉 정보 수정
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = BigInt(session.user.id);
    const body = await request.json();
    const { username, clinic } = body;

    // 사용자 정보 업데이트
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(username && { username }),
      },
      include: {
        clinic: true,
      },
    });

    // 클리닉 정보 업데이트 (클리닉이 있는 경우)
    if (clinic && updatedUser.clinicId) {
      await prisma.clinic.update({
        where: { id: updatedUser.clinicId },
        data: {
          ...(clinic.clinicName && { clinicName: clinic.clinicName }),
          ...(clinic.address !== undefined && { address: clinic.address }),
          ...(clinic.phone !== undefined && { phone: clinic.phone }),
          ...(clinic.logoUrl !== undefined && { logoUrl: clinic.logoUrl }),
        },
      });
    }

    // 업데이트된 정보 다시 조회
    const refreshedUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        clinic: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: refreshedUser!.id.toString(),
        email: refreshedUser!.email,
        username: refreshedUser!.username,
        role: refreshedUser!.role,
      },
      clinic: refreshedUser!.clinic ? {
        id: refreshedUser!.clinic.id.toString(),
        clinicName: refreshedUser!.clinic.clinicName,
        clinicCode: refreshedUser!.clinic.clinicCode,
        address: refreshedUser!.clinic.address,
        phone: refreshedUser!.clinic.phone,
        licenseNumber: refreshedUser!.clinic.licenseNumber,
        logoUrl: refreshedUser!.clinic.logoUrl,
      } : null,
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
