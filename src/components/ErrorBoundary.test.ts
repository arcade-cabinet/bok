import React from 'react';
import { describe, expect, it } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

describe('ErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    const child = React.createElement('div', { 'data-testid': 'child' }, 'Hello');
    const boundary = new ErrorBoundary({ children: child });
    boundary.state = { hasError: false, error: null, errorInfo: '' };

    const result = boundary.render();
    expect(result).toBe(child);
  });

  it('renders fallback when hasError is true', () => {
    const child = React.createElement('div', null, 'Hello');
    const boundary = new ErrorBoundary({ children: child });
    boundary.state = {
      hasError: true,
      error: new Error('Test error'),
      errorInfo: 'component stack trace',
    };

    const result = boundary.render();
    expect(result).not.toBe(child);
    // ErrorFallback element receives the error and stack as props
    const element = result as React.ReactElement<{ error: Error; stack: string }>;
    expect(element.props.error).toBeInstanceOf(Error);
    expect(element.props.error.message).toBe('Test error');
    expect(element.props.stack).toBe('component stack trace');
  });

  it('getDerivedStateFromError returns hasError true', () => {
    const error = new Error('boom');
    const state = ErrorBoundary.getDerivedStateFromError(error);
    expect(state).toEqual({ hasError: true, error });
  });

  it('initial state has no error', () => {
    const child = React.createElement('div', null, 'Hello');
    const boundary = new ErrorBoundary({ children: child });
    expect(boundary.state.hasError).toBe(false);
    expect(boundary.state.error).toBeNull();
    expect(boundary.state.errorInfo).toBe('');
  });

  it('reset clears error state', () => {
    const child = React.createElement('div', null, 'Hello');
    const boundary = new ErrorBoundary({ children: child });
    boundary.state = {
      hasError: true,
      error: new Error('Test error'),
      errorInfo: 'stack',
    };

    // Simulate what onReset does
    const resetState = { hasError: false, error: null, errorInfo: '' };
    boundary.state = resetState;

    const result = boundary.render();
    expect(result).toBe(child);
  });
});
