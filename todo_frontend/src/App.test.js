import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the to-do title', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /to-do/i })).toBeInTheDocument();
});
