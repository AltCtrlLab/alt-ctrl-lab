import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OnboardingTour } from '../OnboardingTour';

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('OnboardingTour', () => {
  it('renders on first visit (no localStorage)', () => {
    render(<OnboardingTour />);
    expect(screen.getByText('Bienvenue dans le Cockpit')).toBeInTheDocument();
  });

  it('does not render when localStorage has completion flag', () => {
    localStorage.setItem('acl-onboarding-done', '1');
    render(<OnboardingTour />);
    expect(screen.queryByText('Bienvenue dans le Cockpit')).not.toBeInTheDocument();
  });

  it('renders when forceOpen is true even with localStorage flag', () => {
    localStorage.setItem('acl-onboarding-done', '1');
    render(<OnboardingTour forceOpen />);
    expect(screen.getByText('Bienvenue dans le Cockpit')).toBeInTheDocument();
  });

  it('navigates to next step on Suivant click', () => {
    render(<OnboardingTour />);
    fireEvent.click(screen.getByText('Suivant'));
    expect(screen.getByText('Soumettre un Brief')).toBeInTheDocument();
  });

  it('navigates back on Précédent click', () => {
    render(<OnboardingTour />);
    fireEvent.click(screen.getByText('Suivant'));
    expect(screen.getByText('Soumettre un Brief')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Précédent'));
    expect(screen.getByText('Bienvenue dans le Cockpit')).toBeInTheDocument();
  });

  it('shows "Passer le tour" on first step', () => {
    render(<OnboardingTour />);
    expect(screen.getByText('Passer le tour')).toBeInTheDocument();
  });

  it('calls onComplete when closing', () => {
    const onComplete = vi.fn();
    render(<OnboardingTour onComplete={onComplete} />);
    fireEvent.click(screen.getByText('Passer le tour'));
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('sets localStorage on close', () => {
    render(<OnboardingTour />);
    fireEvent.click(screen.getByText('Passer le tour'));
    expect(localStorage.setItem).toHaveBeenCalledWith('acl-onboarding-done', '1');
  });

  it('supports keyboard navigation with ArrowRight', () => {
    render(<OnboardingTour />);
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByText('Soumettre un Brief')).toBeInTheDocument();
  });

  it('closes on Escape key', () => {
    const onComplete = vi.fn();
    render(<OnboardingTour onComplete={onComplete} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('has proper ARIA attributes', () => {
    render(<OnboardingTour />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-label', expect.stringContaining('étape 1'));
  });

  it('fires tour tracking on close', () => {
    render(<OnboardingTour />);
    fireEvent.click(screen.getByText('Passer le tour'));
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/analytics/events',
      expect.objectContaining({ method: 'POST' })
    );
  });
});
