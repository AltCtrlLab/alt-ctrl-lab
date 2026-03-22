import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyState } from '../EmptyState';
import { Palette } from 'lucide-react';

describe('EmptyState', () => {
  it('renders icon, message, and submessage', () => {
    render(
      <EmptyState
        icon={Palette}
        color="fuchsia"
        message="Aucun brief en cours"
        submessage="Envoie un brief pour démarrer."
      />
    );
    expect(screen.getByText('Aucun brief en cours')).toBeInTheDocument();
    expect(screen.getByText('Envoie un brief pour démarrer.')).toBeInTheDocument();
  });

  it('renders without submessage', () => {
    render(
      <EmptyState
        icon={Palette}
        color="cyan"
        message="Aucune donnée"
      />
    );
    expect(screen.getByText('Aucune donnée')).toBeInTheDocument();
  });

  it('renders CTA button and handles click', () => {
    const onAction = vi.fn();
    render(
      <EmptyState
        icon={Palette}
        color="emerald"
        message="Vide"
        ctaLabel="Ajouter"
        onAction={onAction}
      />
    );
    const btn = screen.getByText('Ajouter');
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onAction).toHaveBeenCalledOnce();
  });

  it('does not render CTA without onAction', () => {
    render(
      <EmptyState
        icon={Palette}
        color="amber"
        message="Vide"
        ctaLabel="Ajouter"
      />
    );
    expect(screen.queryByText('Ajouter')).not.toBeInTheDocument();
  });

  it('falls back to fuchsia for unknown color', () => {
    const { container } = render(
      <EmptyState
        icon={Palette}
        color="unknown"
        message="Test"
      />
    );
    const iconWrapper = container.querySelector('.bg-fuchsia-500\\/10');
    expect(iconWrapper).toBeInTheDocument();
  });
});
