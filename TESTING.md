# Testing Guide for BrainSait Doctor Hub

This guide provides comprehensive instructions for setting up and running tests in the BrainSait Doctor Hub application.

## Table of Contents

1. [Testing Strategy](#testing-strategy)
2. [Setup Instructions](#setup-instructions)
3. [Running Tests](#running-tests)
4. [Writing Tests](#writing-tests)
5. [Test Coverage](#test-coverage)
6. [CI/CD Integration](#cicd-integration)

## Testing Strategy

Our testing strategy follows a pyramid approach:

```
        /\
       /  \  E2E Tests (10%)
      /____\
     /      \  Integration Tests (30%)
    /________\
   /          \  Unit Tests (60%)
  /__________  \
```

### Test Types

1. **Unit Tests**: Test individual functions and components in isolation
2. **Integration Tests**: Test component interactions and data flow
3. **E2E Tests**: Test complete user workflows
4. **Security Tests**: Test authentication, authorization, and data protection
5. **Performance Tests**: Test application performance and optimization

## Setup Instructions

### 1. Install Testing Dependencies

```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
npm install --save-dev @vitest/ui @vitest/coverage-v8
npm install --save-dev playwright @playwright/test
npm install --save-dev msw
```

### 2. Create Vitest Configuration

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        'dist/',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

### 3. Create Test Setup File

Create `src/test/setup.ts`:

```typescript
import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock environment variables
vi.mock('import.meta', () => ({
  env: {
    VITE_APP_NAME: 'BrainSait Doctor Portal',
    VITE_ENVIRONMENT: 'test',
    DEV: true,
    PROD: false,
  },
}))

// Mock IndexedDB
const indexedDB = {
  open: vi.fn(),
  deleteDatabase: vi.fn(),
}

global.indexedDB = indexedDB as unknown as IDBFactory
```

### 4. Create Test Utilities

Create `src/test/utils.tsx`:

```typescript
import { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/hooks/useAuth'

interface AllTheProvidersProps {
  children: React.ReactNode
}

function AllTheProviders({ children }: AllTheProvidersProps) {
  return (
    <BrowserRouter>
      <AuthProvider>
        {children}
      </AuthProvider>
    </BrowserRouter>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }
```

### 5. Update package.json Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

## Running Tests

### Unit and Integration Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- src/components/auth/LoginPage.test.tsx
```

### E2E Tests

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run specific E2E test
npx playwright test tests/e2e/login.spec.ts
```

## Writing Tests

### Unit Test Example

Create `src/lib/security.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { sanitizeHtml, validateEmail, hasPermission } from './security'

describe('security utilities', () => {
  describe('sanitizeHtml', () => {
    it('should remove HTML tags', () => {
      const input = '<script>alert("xss")</script>Hello'
      const result = sanitizeHtml(input)
      expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;Hello')
    })

    it('should handle empty input', () => {
      expect(sanitizeHtml('')).toBe('')
    })
  })

  describe('validateEmail', () => {
    it('should validate correct email', () => {
      const result = validateEmail('test@example.com')
      expect(result.isValid).toBe(true)
    })

    it('should reject invalid email', () => {
      const result = validateEmail('invalid-email')
      expect(result.isValid).toBe(false)
    })
  })

  describe('hasPermission', () => {
    it('should return true for admin with any permission', () => {
      const result = hasPermission('admin', 'view_patients')
      expect(result).toBe(true)
    })

    it('should return false for nurse with delete permission', () => {
      const result = hasPermission('nurse', 'delete_patients')
      expect(result).toBe(false)
    })
  })
})
```

### Component Test Example

Create `src/components/auth/LoginPage.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@/test/utils'
import { LoginPage } from './LoginPage'

describe('LoginPage', () => {
  it('should render login form', () => {
    render(<LoginPage />)

    expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('should show validation errors for empty fields', async () => {
    render(<LoginPage />)

    const submitButton = screen.getByRole('button', { name: /sign in/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/username is required/i)).toBeInTheDocument()
    })
  })

  it('should call login function with credentials', async () => {
    const mockLogin = vi.fn()
    render(<LoginPage onLogin={mockLogin} />)

    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: 'dr.ahmed' }
    })
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' }
    })

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('dr.ahmed', 'password123')
    })
  })
})
```

### E2E Test Example

Create `tests/e2e/login.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

test.describe('Login Flow', () => {
  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('http://localhost:5173')

    // Fill in login form
    await page.fill('input[name="username"]', 'dr.ahmed')
    await page.fill('input[name="password"]', 'SecurePass2024!')

    // Submit
    await page.click('button[type="submit"]')

    // Verify redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.locator('h1')).toContainText('Dashboard')
  })

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('http://localhost:5173')

    await page.fill('input[name="username"]', 'invalid')
    await page.fill('input[name="password"]', 'wrong')
    await page.click('button[type="submit"]')

    await expect(page.locator('.error-message')).toBeVisible()
  })
})
```

## Test Coverage

### Current Coverage Goals

- **Unit Tests**: 80% coverage
- **Integration Tests**: 60% coverage
- **E2E Tests**: Critical user flows

### Viewing Coverage Reports

```bash
npm run test:coverage
```

Open `coverage/index.html` in your browser to view detailed coverage report.

### Critical Areas Requiring Tests

1. **Authentication Flow** (Priority: High)
   - Login/logout
   - MFA verification
   - Session management
   - Token refresh

2. **Patient Management** (Priority: High)
   - CRUD operations
   - Data validation
   - PHI protection

3. **Database Operations** (Priority: High)
   - IndexedDB operations
   - Data integrity
   - Migration system

4. **NPHIES Integration** (Priority: Medium)
   - Claims submission
   - Eligibility verification
   - Response handling

5. **Security** (Priority: Critical)
   - Input sanitization
   - XSS prevention
   - RBAC
   - Rate limiting

## CI/CD Integration

### GitHub Actions Workflow

Create `.github/workflows/test.yml`:

```yaml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run unit tests
        run: npm run test:coverage

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

## Best Practices

1. **Follow AAA Pattern**: Arrange, Act, Assert
2. **Test Behavior, Not Implementation**: Focus on what the code does, not how
3. **Keep Tests Independent**: Each test should run in isolation
4. **Use Descriptive Names**: Test names should clearly describe what they test
5. **Mock External Dependencies**: Isolate code under test
6. **Test Edge Cases**: Include boundary conditions and error scenarios
7. **Maintain Test Code**: Refactor tests as you refactor production code

## Troubleshooting

### Common Issues

1. **Tests failing due to async operations**
   - Use `waitFor` from Testing Library
   - Ensure proper async/await usage

2. **Module import errors**
   - Check path aliases in vitest.config.ts
   - Verify mocks are properly set up

3. **IndexedDB errors**
   - Use fake-indexeddb package for testing
   - Mock database operations

4. **Playwright timeout errors**
   - Increase timeout for slow operations
   - Use proper wait strategies

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Playwright Documentation](https://playwright.dev/)
- [MSW Documentation](https://mswjs.io/)

## Next Steps

1. Set up continuous integration
2. Add visual regression testing
3. Implement performance testing
4. Add security penetration testing
5. Achieve 80%+ code coverage
