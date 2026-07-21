import { NextResponse } from 'next/server';
import { ApiAccessError } from './api-access';
import { WorkflowError } from './field-service/workflow';

export function routeError(error: unknown) {
  if (error instanceof ApiAccessError || error instanceof WorkflowError) {
    return NextResponse.json({ error: error.message, code: error instanceof WorkflowError ? error.code : undefined }, { status: error.status });
  }
  console.error(error);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
