import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    // 1. Fetch password from Firestore
    let requiredPassword = '12345678'; // Default fallback
    
    try {
        const authDocRef = doc(db, 'settings', 'auth');
        const authDocSnap = await getDoc(authDocRef);
        
        if (authDocSnap.exists()) {
            const data = authDocSnap.data();
            if (data.password) {
                requiredPassword = data.password;
            }
        }
    } catch (firebaseError) {
        console.warn("Firestore not reachable for auth. Using fallback password.", firebaseError);
    }

    // 2. Validate password
    if (password === requiredPassword) {
      const response = NextResponse.json({ message: 'Login successful' });
      
      // Set an httpOnly cookie for session management
      (await cookies()).set('authenticated', 'true', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: '/',
      });

      return response;
    }

    return NextResponse.json(
      { message: 'Invalid password. Please try again.' },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: 'An internal error occurred.' },
      { status: 500 }
    );
  }
}
