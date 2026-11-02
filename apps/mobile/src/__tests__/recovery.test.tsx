import { onlineManager } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorScreen } from '../features/errors/ErrorScreen';
import { OfflineBanner } from '../features/navigation/OfflineBanner';
import { reportError } from '../lib/telemetry';

jest.mock('../lib/telemetry', () => ({ reportError: jest.fn() }));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 24, left: 0, right: 0, bottom: 0 } };

describe('ErrorScreen (crash recovery)', () => {
  it('reports the error once and retries on press', () => {
    const retry = jest.fn().mockResolvedValue(undefined);
    const error = new Error('boom');
    render(<ErrorScreen error={error} retry={retry} />);
    expect(reportError).toHaveBeenCalledWith(error);
    fireEvent.press(screen.getByLabelText('Try again'));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});

describe('OfflineBanner', () => {
  afterEach(() => act(() => onlineManager.setOnline(true)));

  it('appears only while offline', () => {
    render(
      <SafeAreaProvider initialMetrics={metrics}>
        <OfflineBanner />
      </SafeAreaProvider>,
    );
    expect(screen.queryByText(/offline/i)).toBeNull();
    act(() => onlineManager.setOnline(false));
    expect(screen.getByText(/offline/i)).toBeTruthy();
    act(() => onlineManager.setOnline(true));
    expect(screen.queryByText(/offline/i)).toBeNull();
  });
});
