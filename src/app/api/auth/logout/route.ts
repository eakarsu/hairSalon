import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // NextAuth handles session invalidation on the client side via signOut()
    // This endpoint provides a server-side logout confirmation
    const response = NextResponse.json({ message: 'Logged out successfully' });

    // Clear any custom cookies if set
    response.cookies.delete('next-auth.session-token');
    response.cookies.delete('next-auth.csrf-token');
    response.cookies.delete('__Secure-next-auth.session-token');
    response.cookies.delete('__Secure-next-auth.csrf-token');

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Failed to logout' }, { status: 500 });
  }
}
