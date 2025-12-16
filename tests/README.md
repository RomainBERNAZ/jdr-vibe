# Tests

Ce répertoire contient tous les tests unitaires et d'intégration pour l'application Aether RPG.

## Structure

```
tests/
├── setup.js                 # Configuration globale des tests
├── backend/                 # Tests du backend
│   ├── authController.test.js
│   ├── authMiddleware.test.js
│   ├── campaignController.test.js
│   └── characterController.test.js
└── frontend/                # Tests du frontend
    ├── AuthContext.test.jsx
    ├── api.test.js
    ├── CharacterCreationModal.test.jsx
    └── ConfirmModal.test.jsx
```

## Exécution des tests

```bash
# Exécuter tous les tests
npm test

# Exécuter les tests en mode watch
npm test -- --watch

# Exécuter les tests avec interface UI
npm run test:ui

# Exécuter les tests avec couverture de code
npm run test:coverage
```

## Écriture de nouveaux tests

### Backend

Les tests backend utilisent Vitest avec des mocks pour la base de données. Exemple :

```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../server/config/db.js', () => ({
  default: { query: vi.fn() },
}));

describe('MyController', () => {
  it('should do something', async () => {
    // Test implementation
  });
});
```

### Frontend

Les tests frontend utilisent Vitest avec @testing-library/react pour tester les composants React. Exemple :

```javascript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MyComponent from '../../src/components/MyComponent.jsx';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

## Couverture de code

La configuration de couverture de code exclut :
- `node_modules/`
- `tests/`
- Fichiers de configuration
- Dossiers de build/dist

Pour voir le rapport de couverture, exécutez `npm run test:coverage` et ouvrez le fichier HTML généré dans `coverage/index.html`.
