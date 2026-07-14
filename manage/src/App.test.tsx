import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders the admin login screen', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: '小程序管理系统' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '登录管理端' })).toBeInTheDocument();
  });
});
