import { NextRequest, NextResponse } from 'next/server';

// Base URL for your backend API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Helper function to get the token from the request
const getToken = (req: NextRequest) => {
  const token = req.cookies.get('auth_token')?.value;
  return token;
};

// Interface for route parameters
interface RouteParams {
  params: {
    route: string[];
  };
}

// GET handler for fetching all events
export async function GET(
  req: NextRequest,
  context: RouteParams
) {
  const token = getToken(req);
  
  if (!token) {
    return NextResponse.json({ error: 'No authentication token' }, { status: 401 });
  }

  try {
    const route = context.params.route.join('/');
    const userId = req.nextUrl.searchParams.get('user_id');
    let url = `${API_BASE_URL}/events/${route}`;
    
    // Add user_id parameter if provided
    if (userId && route === 'get_all_events') {
      url += `?user_id=${userId}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json({ error: data.detail || 'Failed to fetch events' }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST handler for creating events
export async function POST(
  req: NextRequest,
  context: RouteParams
) {
  const token = getToken(req);
  
  if (!token) {
    return NextResponse.json({ error: 'No authentication token' }, { status: 401 });
  }

  try {
    const route = context.params.route.join('/');
    const body = await req.json();

    const response = await fetch(`${API_BASE_URL}/events/${route}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json({ error: data.detail || 'Failed to create event' }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT handler for updating events
export async function PUT(
  req: NextRequest,
  context: RouteParams
) {
  const token = getToken(req);
  
  if (!token) {
    return NextResponse.json({ error: 'No authentication token' }, { status: 401 });
  }

  try {
    const route = context.params.route.join('/');
    const body = await req.json();

    const response = await fetch(`${API_BASE_URL}/events/${route}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json({ error: data.detail || 'Failed to update event' }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE handler for deleting events
export async function DELETE(
  req: NextRequest,
  context: RouteParams
) {
  const token = getToken(req);
  
  if (!token) {
    return NextResponse.json({ error: 'No authentication token' }, { status: 401 });
  }

  try {
    const route = context.params.route.join('/');

    const response = await fetch(`${API_BASE_URL}/events/${route}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    // If there's no content, just return success
    if (response.status === 204) {
      return NextResponse.json({ message: 'Event deleted successfully' });
    }

    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json({ error: data.detail || 'Failed to delete event' }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
