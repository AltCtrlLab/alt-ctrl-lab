import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { Breadcrumbs } from '../Breadcrumbs';

const mockUsePathname = vi.mocked(usePathname);

describe('Breadcrumbs', () => {
  it('returns null on /dashboard', () => {
    mockUsePathname.mockReturnValue('/dashboard');
    const { container } = render(<Breadcrumbs />);
    expect(container.innerHTML).toBe('');
  });

  it('returns null on root /', () => {
    mockUsePathname.mockReturnValue('/');
    const { container } = render(<Breadcrumbs />);
    expect(container.innerHTML).toBe('');
  });

  it('renders correct label for known route /leads', () => {
    mockUsePathname.mockReturnValue('/leads');
    render(<Breadcrumbs />);
    expect(screen.getByText('Leads')).toBeInTheDocument();
    expect(screen.getByText('Pipeline')).toBeInTheDocument();
  });

  it('renders section link for Pipeline routes', () => {
    mockUsePathname.mockReturnValue('/projets');
    render(<Breadcrumbs />);
    const pipelineLink = screen.getByText('Pipeline');
    expect(pipelineLink.tagName).toBe('A');
    expect(pipelineLink).toHaveAttribute('href', '/leads');
  });

  it('renders Équipe IA section for agent pages', () => {
    mockUsePathname.mockReturnValue('/branding');
    render(<Breadcrumbs />);
    expect(screen.getByText('Branding')).toBeInTheDocument();
    expect(screen.getByText('Équipe IA')).toBeInTheDocument();
  });

  it('falls back to formatted slug for unknown routes', () => {
    mockUsePathname.mockReturnValue('/some-unknown-page');
    render(<Breadcrumbs />);
    expect(screen.getByText('Some Unknown Page')).toBeInTheDocument();
  });

  it('always shows Dashboard home link', () => {
    mockUsePathname.mockReturnValue('/finances');
    render(<Breadcrumbs />);
    const homeLink = screen.getByText('Dashboard');
    expect(homeLink.closest('a')).toHaveAttribute('href', '/dashboard');
  });
});
