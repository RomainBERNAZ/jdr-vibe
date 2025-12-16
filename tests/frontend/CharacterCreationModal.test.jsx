import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CharacterCreationModal from '../../src/components/CharacterCreationModal.jsx';

describe('CharacterCreationModal', () => {
  const mockOnCreate = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the modal', () => {
    render(<CharacterCreationModal onCreate={mockOnCreate} onCancel={mockOnCancel} />);

    expect(screen.getByText(/nouveau héros/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/valerius le brave/i)).toBeInTheDocument();
    expect(screen.getByText(/nom du personnage/i)).toBeInTheDocument();
    // Use getAllByText for "Race" since it appears twice (label and "Bonus Race")
    expect(screen.getAllByText(/^race$/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/^classe$/i)).toBeInTheDocument();
  });

  it('should call onCreate with character data on submit', async () => {
    const user = userEvent.setup();

    render(<CharacterCreationModal onCreate={mockOnCreate} onCancel={mockOnCancel} />);

    const nameInput = screen.getByPlaceholderText(/valerius le brave/i);
    const submitButton = screen.getByRole('button', { name: /commencer/i });

    await user.type(nameInput, 'Test Hero');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnCreate).toHaveBeenCalled();
    });

    const callArgs = mockOnCreate.mock.calls[0][0];
    expect(callArgs.name).toBe('Test Hero');
    expect(callArgs.race).toBe('Humain');
    expect(callArgs.class).toBe('Guerrier');
    expect(callArgs.level).toBe(1);
    expect(callArgs.stats).toBeDefined();
  });

  it('should call onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();

    render(<CharacterCreationModal onCreate={mockOnCreate} onCancel={mockOnCancel} />);

    const cancelButton = screen.getByRole('button', { name: /annuler/i });
    await user.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('should not submit if name is empty', async () => {
    const user = userEvent.setup();

    render(<CharacterCreationModal onCreate={mockOnCreate} onCancel={mockOnCancel} />);

    const submitButton = screen.getByRole('button', { name: /commencer/i });
    await user.click(submitButton);

    // Form validation should prevent submission
    expect(mockOnCreate).not.toHaveBeenCalled();
  });

  it('should show edit mode when initialData is provided', () => {
    const initialData = {
      name: 'Existing Hero',
      race: 'Elfe',
      class: 'Mage',
    };

    render(
      <CharacterCreationModal
        onCreate={mockOnCreate}
        onCancel={mockOnCancel}
        initialData={initialData}
      />
    );

    expect(screen.getByText(/modifier le héros/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Existing Hero')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sauvegarder/i })).toBeInTheDocument();
  });
});
